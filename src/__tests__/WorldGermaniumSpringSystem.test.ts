import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGermaniumSpringSystem } from '../systems/WorldGermaniumSpringSystem'
import type { GermaniumSpringZone } from '../systems/WorldGermaniumSpringSystem'

const CHECK_INTERVAL = 2900
const MAX_ZONES = 32

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, MOUNTAIN=5
// hasAdjacentTile 检查 8 邻格，getTile 用于邻格查询
// 阻断 spawn：所有邻格返回 GRASS(3)，既不是 SHALLOW_WATER(1) 也不是 DEEP_WATER(0) 也不是 MOUNTAIN(5)
const safeWorld = { width: 200, height: 200, getTile: () => 3 } as any
// 允许 spawn（邻格含 SHALLOW_WATER=1）
const shallowWaterWorld = { width: 200, height: 200, getTile: () => 1 } as any
// 允许 spawn（邻格含 MOUNTAIN=5）
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any

const em = {} as any

function makeSys(): WorldGermaniumSpringSystem { return new WorldGermaniumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<GermaniumSpringZone> = {}): GermaniumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    germaniumContent: 40,
    springFlow: 50,
    oreWeathering: 60,
    mineralConductivity: 70,
    tick: 0,
    ...overrides
  }
}

describe('WorldGermaniumSpringSystem', () => {
  let sys: WorldGermaniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ──────────────────────────────────────────────
  it('初始 zones 为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('zones 数组是内部引用（同一对象）', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────
  it('tick < CHECK_INTERVAL 时跳过，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次 tick 未超间隔时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(lc)
  })

  // ── spawn 阻断 ────────────────────────────────────────────
  it('random=0.9 时不 spawn（大于 FORM_CHANCE=0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('safeWorld (GRASS=3) 阻断 spawn，因为既不邻近水也不邻近山', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── spawn 成功（shallowWater 邻接）────────────────────────
  it('shallowWaterWorld + random=0 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('mountainWorld + random=0 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('spawn 的 zone germaniumContent 在 [40,100] 范围内', () => {
    // 使用 20 次循环验证范围（字段含 random 浮动）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    const z: GermaniumSpringZone = (sys as any).zones[0]
    expect(z.germaniumContent).toBeGreaterThanOrEqual(40)
    expect(z.germaniumContent).toBeLessThanOrEqual(100)
  })

  it('spawn 的 zone springFlow 在 [10,60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    const z: GermaniumSpringZone = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('spawn 的 zone oreWeathering 在 [20,100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    const z: GermaniumSpringZone = (sys as any).zones[0]
    expect(z.oreWeathering).toBeGreaterThanOrEqual(20)
    expect(z.oreWeathering).toBeLessThanOrEqual(100)
  })

  it('spawn 的 zone mineralConductivity 在 [15,100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    const z: GermaniumSpringZone = (sys as any).zones[0]
    expect(z.mineralConductivity).toBeGreaterThanOrEqual(15)
    expect(z.mineralConductivity).toBeLessThanOrEqual(100)
  })

  it('spawn 的 zone id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    const z: GermaniumSpringZone = (sys as any).zones[0]
    expect(z.id).toBeGreaterThanOrEqual(1)
  })

  it('每次 update 最多尝试 3 次 spawn（zones 长度 <= 3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  // ── MAX_ZONES 上限 ────────────────────────────────────────
  it('达到 MAX_ZONES 时不再新增', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL * 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it('zones.length >= MAX_ZONES 时每次 attempt 都 break', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL * 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
    // 不超过 MAX_ZONES
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  // ── cleanup 逻辑（cutoff = tick - 54000）─────────────────
  it('tick=0 的旧记录在 tick=54001 时被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cutoff 临界：vent.tick < cutoff 时删除', () => {
    // currentTick=54001, cutoff=1, zone.tick=0 < 1 => 删除
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合：过期删除，未过期保留', () => {
    const currentTick = 60000
    // cutoff = 60000 - 54000 = 6000
    // tick=0 < 6000 => 删除
    ;(sys as any).zones.push(makeZone({ tick: 0, germaniumContent: 40 }))
    // tick=55000 >= 6000 => 保留
    ;(sys as any).zones.push(makeZone({ tick: 55000, germaniumContent: 99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].germaniumContent).toBe(99)
  })

  it('多条全部过期时全部删除', () => {
    const currentTick = 60000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: i }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('全部未过期时全部保留', () => {
    const currentTick = CHECK_INTERVAL
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(5)
  })

  // ── 注入数据字段验证 ──────────────────────────────────────
  it('注入后 zones 可查询长度', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入 zone 字段值正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.germaniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.oreWeathering).toBe(60)
    expect(z.mineralConductivity).toBe(70)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // ── 字段范围（20次循环验证）──────────────────────────────
  it('多次 spawn 的 germaniumContent 始终在 [40,100]', () => {
    for (let i = 0; i < 20; i++) {
      const tempSys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0)
      tempSys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
      const zones: GermaniumSpringZone[] = (tempSys as any).zones
      for (const z of zones) {
        expect(z.germaniumContent).toBeGreaterThanOrEqual(40)
        expect(z.germaniumContent).toBeLessThanOrEqual(100)
      }
    }
  })

  it('多次 spawn 的 springFlow 始终在 [10,60]', () => {
    for (let i = 0; i < 20; i++) {
      const tempSys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      tempSys.update(0, shallowWaterWorld, em, CHECK_INTERVAL)
      const zones: GermaniumSpringZone[] = (tempSys as any).zones
      for (const z of zones) {
        expect(z.springFlow).toBeGreaterThanOrEqual(10)
        expect(z.springFlow).toBeLessThanOrEqual(60)
      }
    }
  })
})
