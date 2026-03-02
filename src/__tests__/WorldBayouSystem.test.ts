import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBayouSystem } from '../systems/WorldBayouSystem'
import type { Bayou } from '../systems/WorldBayouSystem'
import { TileType } from '../utils/Constants'

// ---- helpers ----
function makeSys(): WorldBayouSystem { return new WorldBayouSystem() }
let nextId = 1
function makeBayou(overrides: Partial<Bayou> = {}): Bayou {
  return {
    id: nextId++, x: 25, y: 35,
    radius: 7, waterFlow: 10, vegetationDensity: 50,
    murkiness: 40, biodiversity: 60, depth: 5, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: number = TileType.MOUNTAIN): any {
  return { width: 100, height: 100, getTile: () => tile }
}
/** advance past CHECK_INTERVAL (2600) so update() really runs */
function doUpdate(sys: WorldBayouSystem, world: any, tick = 3000): void {
  ;(sys as any).update(1, world, {}, tick)
}

describe('WorldBayouSystem – 初始状态', () => {
  it('启动时沼泽湾列表为空', () => {
    const sys = makeSys()
    expect((sys as any).bayous).toHaveLength(0)
  })
  it('nextId 从 1 开始', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('WorldBayouSystem – CHECK_INTERVAL 节流', () => {
  it('tick 不足 CHECK_INTERVAL(2600) 时不执行逻辑', () => {
    const sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).update(1, world, {}, 100)     // tick=100 < 2600
    expect((sys as any).bayous).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick 超过 CHECK_INTERVAL 后 lastCheck 更新', () => {
    const sys = makeSys()
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('同一 check 窗口内第二次 update 不再重复处理', () => {
    const sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < FORM_CHANCE(0.002)
    ;(sys as any).update(1, world, {}, 3000)
    const countAfterFirst = (sys as any).bayous.length
    ;(sys as any).update(1, world, {}, 3500) // 3500-3000=500 < 2600
    expect((sys as any).bayous).toHaveLength(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('WorldBayouSystem – 生成逻辑', () => {
  it('SHALLOW_WATER 地块 + 低随机数 → 生成一个沼泽湾', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(TileType.SHALLOW_WATER), 3000)
    expect((sys as any).bayous).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('GRASS 地块 + 低随机数 → 生成一个沼泽湾', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(TileType.GRASS), 3000)
    expect((sys as any).bayous).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('MOUNTAIN 地块 + 低随机数 → 不生成', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(TileType.MOUNTAIN), 3000)
    expect((sys as any).bayous).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('随机数高于 FORM_CHANCE(0.002) → 不生成', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(TileType.SHALLOW_WATER), 3000)
    expect((sys as any).bayous).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('超过 MAX_BAYOUS(18) 上限后不再生成', () => {
    const sys = makeSys()
    for (let i = 0; i < 18; i++) (sys as any).bayous.push(makeBayou({ tick: 3000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(TileType.SHALLOW_WATER), 3000)
    expect((sys as any).bayous).toHaveLength(18)
    vi.restoreAllMocks()
  })
  it('新生成的沼泽湾字段在有效范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(TileType.SHALLOW_WATER), 5000)
    const b: Bayou = (sys as any).bayous[0]
    expect(b.radius).toBeGreaterThanOrEqual(5)
    // waterFlow 初始 5+random*15，演化后下限 2（Math.max(2,...)），上限 25
    expect(b.waterFlow).toBeGreaterThanOrEqual(2)
    expect(b.waterFlow).toBeLessThanOrEqual(25)
    // vegetationDensity 初始 25+random*35，演化后只增不减，因此 >= 25
    expect(b.vegetationDensity).toBeGreaterThanOrEqual(25)
    // murkiness 初始 20+random*40，演化后在 [10,70]，依然 >= 10
    expect(b.murkiness).toBeGreaterThanOrEqual(10)
    // biodiversity 初始 30+random*35，演化后只增不减，因此 >= 30
    expect(b.biodiversity).toBeGreaterThanOrEqual(30)
    // depth 初始 3+random*10，演化后在 [1,15]，依然 >= 1
    expect(b.depth).toBeGreaterThanOrEqual(1)
    expect(b.tick).toBe(5000)
    vi.restoreAllMocks()
  })
  it('id 自增：连续两次生成 id 不同', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).update(1, makeWorld(TileType.SHALLOW_WATER), {}, 3000)
    ;(sys as any).lastCheck = 0  // reset 让第二次能执行
    ;(sys as any).update(1, makeWorld(TileType.SHALLOW_WATER), {}, 6000)
    const ids = (sys as any).bayous.map((b: Bayou) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    vi.restoreAllMocks()
  })
})

describe('WorldBayouSystem – 属性演化', () => {
  it('每次 update 后 vegetationDensity 缓慢增长，上限 85', () => {
    const sys = makeSys()
    const b = makeBayou({ vegetationDensity: 50, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.vegetationDensity).toBeGreaterThan(50)
    expect(b.vegetationDensity).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('vegetationDensity 不会超过上限 85', () => {
    const sys = makeSys()
    const b = makeBayou({ vegetationDensity: 85, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.vegetationDensity).toBe(85)
    vi.restoreAllMocks()
  })
  it('每次 update 后 biodiversity 缓慢增长，上限 90', () => {
    const sys = makeSys()
    const b = makeBayou({ biodiversity: 60, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.biodiversity).toBeGreaterThan(60)
    expect(b.biodiversity).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })
  it('murkiness 保持在 [10, 70] 范围内', () => {
    const sys = makeSys()
    const b = makeBayou({ murkiness: 40, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.murkiness).toBeGreaterThanOrEqual(10)
    expect(b.murkiness).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })
  it('waterFlow 保持在 [2, 25] 范围内', () => {
    const sys = makeSys()
    const b = makeBayou({ waterFlow: 15, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.waterFlow).toBeGreaterThanOrEqual(2)
    expect(b.waterFlow).toBeLessThanOrEqual(25)
    vi.restoreAllMocks()
  })
  it('depth 保持在 [1, 15] 范围内', () => {
    const sys = makeSys()
    const b = makeBayou({ depth: 8, tick: 0 })
    ;(sys as any).bayous.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.depth).toBeGreaterThanOrEqual(1)
    expect(b.depth).toBeLessThanOrEqual(15)
    vi.restoreAllMocks()
  })
})

describe('WorldBayouSystem – 清理逻辑', () => {
  it('tick 超过 cutoff(tick-88000) 的沼泽湾被移除', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=3000，cutoff=3000-88000=-85000；bayou.tick=0 > -85000 → 保留
    ;(sys as any).bayous.push(makeBayou({ tick: 0 }))
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).bayous).toHaveLength(1)

    // 现在 tick=100000，cutoff=100000-88000=12000；bayou.tick=0 < 12000 → 删除
    ;(sys as any).lastCheck = 0
    doUpdate(sys, makeWorld(), 100000)
    expect((sys as any).bayous).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('新旧混合时只删除过期的', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bayous.push(makeBayou({ tick: 0 }))          // 过期
    ;(sys as any).bayous.push(makeBayou({ tick: 99000 }))       // 未过期
    ;(sys as any).lastCheck = 0
    doUpdate(sys, makeWorld(), 100000)
    expect((sys as any).bayous).toHaveLength(1)
    expect((sys as any).bayous[0].tick).toBe(99000)
    vi.restoreAllMocks()
  })
  it('所有沼泽湾均过期时列表清空', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).bayous.push(makeBayou({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    doUpdate(sys, makeWorld(), 200000)
    expect((sys as any).bayous).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
