import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAstatineSpringSystem } from '../systems/WorldAstatineSpringSystem'
import type { AstatineSpringZone } from '../systems/WorldAstatineSpringSystem'

const CHECK_INTERVAL = 3120
const MAX_ZONES = 32
const FORM_CHANCE = 0.003

let nextId = 1
function makeSys() { return new WorldAstatineSpringSystem() }
function makeZone(overrides: Partial<AstatineSpringZone> = {}): AstatineSpringZone {
  return {
    id: nextId++,
    x: 50, y: 50,
    astatineContent: 40,
    springFlow: 10,
    bismuthIrradiation: 20,
    halogenReactivity: 15,
    tick: 0,
    ...overrides,
  }
}

// getTile返回5(MOUNTAIN=5)时，nearMountain=true，允许spawn
const makeWorldWithMountain = () => ({
  width: 200,
  height: 200,
  getTile: () => 5,  // MOUNTAIN
}) as any

// getTile返回3(GRASS)时，nearWater=false且nearMountain=false，不能spawn
const makeWorldNoWaterNoMountain = () => ({
  width: 200,
  height: 200,
  getTile: () => 3,  // GRASS — 既不是水也不是山
}) as any

const em = {} as any

describe('WorldAstatineSpringSystem', () => {
  let sys: WorldAstatineSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 初始状态 ---
  it('初始zones为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldNoWaterNoMountain(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldNoWaterNoMountain(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用：第二次tick不满足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldNoWaterNoMountain(), em, CHECK_INTERVAL)
    sys.update(1, makeWorldNoWaterNoMountain(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  // --- Spawn 生成逻辑 ---
  it('非water非mountain区域不会spawn（getTile=GRASS）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldNoWaterNoMountain(), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random > FORM_CHANCE时即使地形满足也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('地形满足mountain且random < FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('生成的zone字段在合法范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.astatineContent).toBeGreaterThanOrEqual(40)
    expect(z.astatineContent).toBeLessThanOrEqual(100)
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
    expect(z.bismuthIrradiation).toBeGreaterThanOrEqual(20)
    expect(z.bismuthIrradiation).toBeLessThanOrEqual(100)
    expect(z.halogenReactivity).toBeGreaterThanOrEqual(15)
    expect(z.halogenReactivity).toBeLessThanOrEqual(100)
  })

  it('生成的zone记录spawn时的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
  })

  it('已达MAX_ZONES时不再生成', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('nextId在spawn后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  // --- Cleanup 清理 ---
  it('超过cutoff(tick-54000)的zone被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, makeWorldNoWaterNoMountain(), em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未超过cutoff的zone保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    sys.update(1, makeWorldNoWaterNoMountain(), em, 60000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick恰在cutoff边界的zone保留(tick == cutoff不删除)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = 60000
    const cutoff = tick - 54000  // = 6000
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    sys.update(1, makeWorldNoWaterNoMountain(), em, tick)
    // zones[i].tick < cutoff => 6000 < 6000 为false，保留
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合tick：旧的被清除，新的保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    sys.update(1, makeWorldNoWaterNoMountain(), em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(50000)
  })

  // --- 注入验证 ---
  it('直接注入zone后字段可访问', () => {
    ;(sys as any).zones.push(makeZone({ astatineContent: 40, springFlow: 50 }))
    const z = (sys as any).zones[0]
    expect(z.astatineContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })

  it('多个zones全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})
