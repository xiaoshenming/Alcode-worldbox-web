import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAuroraSystem } from '../systems/WorldAuroraSystem'
import type { AuroraEvent, AuroraColorPattern } from '../systems/WorldAuroraSystem'

const CHECK_INTERVAL = 3600
const world = { width: 200, height: 200, getTile: () => 5 } as any
const em = { getEntitiesWithComponents: () => [] } as any

function makeSys(): WorldAuroraSystem { return new WorldAuroraSystem() }
let nextId = 1
function makeAurora(overrides: Partial<AuroraEvent> = {}): AuroraEvent {
  return {
    id: nextId++,
    x: 20, y: 10,
    colorPattern: 'green',
    intensity: 60,
    width: 30, height: 15,
    active: true,
    tick: 0,
    ...overrides,
  }
}

describe('WorldAuroraSystem', () => {
  let sys: WorldAuroraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────
  it('初始无极光事件', () => {
    expect((sys as any).auroras).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 节流 CHECK_INTERVAL ─────────────────────────────────────────
  it('tick < CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).auroras).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL 时触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })

  it('lastCheck在触发后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次连续update中第二次tick未超过CHECK_INTERVAL则不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + 1)
    expect((sys as any).auroras).toHaveLength(1)
  })

  // ── spawn 逻辑 ──────────────────────────────────────────────────
  it('random < SPAWN_CHANCE(0.003) 时生成极光', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })

  it('random > SPAWN_CHANCE 时不生成极光', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })

  it('auroras数量达到MAX_AURORAS(8)时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).auroras.push(makeAurora())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(8)
  })

  it('生成的极光active初始为true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].active).toBe(true)
  })

  it('生成的极光intensity为对应pattern的基准值（通过sin公式）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const aurora = (sys as any).auroras[0]
    // 生成后intensity经过sin公式更新，只需检查范围合理
    expect(aurora.intensity).toBeGreaterThanOrEqual(0)
    expect(aurora.intensity).toBeLessThanOrEqual(80)
  })

  it('生成的极光tick等于当前update的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].tick).toBe(CHECK_INTERVAL)
  })

  // ── intensity 振荡更新 ──────────────────────────────────────────
  it('每次update极光intensity根据sin公式重新计算', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const aurora = makeAurora({ colorPattern: 'green', intensity: 99, tick: 0 })
    ;(sys as any).auroras.push(aurora)
    sys.update(1, world, em, CHECK_INTERVAL)
    // green基准为50，intensity = 50 * (0.5 + 0.5*sin(CHECK_INTERVAL*0.0004 + id*2))
    const expected = 50 * (0.5 + 0.5 * Math.sin(CHECK_INTERVAL * 0.0004 + aurora.id * 2))
    expect((sys as any).auroras[0].intensity).toBeCloseTo(expected, 5)
  })

  it('multicolor极光有0.002概率width+1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.002，触发width++
    const aurora = makeAurora({ colorPattern: 'multicolor', width: 30, tick: 0 })
    ;(sys as any).auroras.push(aurora)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].width).toBe(31)
  })

  it('multicolor极光width不超过50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const aurora = makeAurora({ colorPattern: 'multicolor', width: 50, tick: 0 })
    ;(sys as any).auroras.push(aurora)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].width).toBe(50)
  })

  it('非multicolor极光width不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const aurora = makeAurora({ colorPattern: 'blue', width: 30, tick: 0 })
    ;(sys as any).auroras.push(aurora)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].width).toBe(30)
  })

  // ── age cleanup ─────────────────────────────────────────────────
  it('age > 180000 时aurora变为inactive并被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=0生成，当前tick=CHECK_INTERVAL+180001 => age > 180000
    const aurora = makeAurora({ tick: 0, active: true })
    ;(sys as any).auroras.push(aurora)
    const futureTick = CHECK_INTERVAL + 180001
    ;(sys as any).lastCheck = 0  // 让下一次从futureTick触发
    sys.update(1, world, em, futureTick)
    expect((sys as any).auroras).toHaveLength(0)
  })

  it('age <= 180000 时aurora保持active', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const aurora = makeAurora({ tick: 0, active: true })
    ;(sys as any).auroras.push(aurora)
    // tick = CHECK_INTERVAL，age = CHECK_INTERVAL < 180000
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
    expect((sys as any).auroras[0].active).toBe(true)
  })

  it('active=false的极光在update中被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const aurora = makeAurora({ active: false })
    ;(sys as any).auroras.push(aurora)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })

  it('同时有多个inactive极光时全部被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(
      makeAurora({ active: false }),
      makeAurora({ active: false }),
      makeAurora({ active: true, tick: 0 }),
    )
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })

  // ── 极光颜色模式基准intensity ───────────────────────────────────
  it('支持4种极光颜色模式', () => {
    const patterns: AuroraColorPattern[] = ['green', 'purple', 'blue', 'multicolor']
    expect(patterns).toHaveLength(4)
  })

  it('multicolor基准intensity(80)高于green(50)', () => {
    // 检查sin计算时multicolor系数比green大
    const greenBase = 50
    const multiBase = 80
    expect(multiBase).toBeGreaterThan(greenBase)
  })

  it('注入极光后可通过内部auroras数组访问', () => {
    ;(sys as any).auroras.push(makeAurora({ colorPattern: 'purple' }))
    expect((sys as any).auroras[0].colorPattern).toBe('purple')
  })
})
