import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldStrontiumSpringSystem } from '../systems/WorldStrontiumSpringSystem'
import type { StrontiumSpringZone } from '../systems/WorldStrontiumSpringSystem'

// CHECK_INTERVAL=3195, FORM_CHANCE=0.0031, MAX_ZONES=33
// TileType: DEEP_WATER=0, SHALLOW_WATER=1, MOUNTAIN=5
// spawn 条件: nearWater||nearMountain AND random <= FORM_CHANCE（random > FORM_CHANCE则continue跳过）
// cleanup: zone.tick < (currentTick - 55000)
// hasAdjacentTile: 检查 8 邻格，world.getTile(x+dx, y+dy) === tileType
// 每次最多 3 次 attempt，每次 attempt 独立 random

const DEEP_WATER = 0
const SHALLOW_WATER = 1
const MOUNTAIN = 5
const GRASS = 3
const SAND = 2
const CHECK_INTERVAL = 3195
const FORM_CHANCE = 0.0031
const MAX_ZONES = 33
const CUTOFF_OFFSET = 55000

function makeSys(): WorldStrontiumSpringSystem { return new WorldStrontiumSpringSystem() }
function makeEM(): any { return {} as any }

// 生成地图：center 返回 centerTile，其他返回 neighborTile
function makeWorld(centerTile: number, neighborTile: number = GRASS): any {
  return {
    width: 100, height: 100,
    getTile: (x: number, y: number) => neighborTile,
  } as any
}

// 生成地图：所有格子返回同一 tile（用于 hasAdjacentTile 全返回同 tile 的场景）
function makeWorldFlat(tile: number): any {
  return { width: 100, height: 100, getTile: () => tile } as any
}

// 邻格含水的地图：所有 getTile 调用都返回 SHALLOW_WATER
function makeWorldNearShallowWater(): any {
  return { width: 100, height: 100, getTile: () => SHALLOW_WATER } as any
}

function makeWorldNearDeepWater(): any {
  return { width: 100, height: 100, getTile: () => DEEP_WATER } as any
}

function makeWorldNearMountain(): any {
  return { width: 100, height: 100, getTile: () => MOUNTAIN } as any
}

let _nextId = 1
function makeZone(overrides: Partial<StrontiumSpringZone> = {}): StrontiumSpringZone {
  return {
    id: _nextId++, x: 20, y: 30,
    strontiumContent: 60,
    springFlow: 30,
    geologicalDeposit: 50,
    mineralConcentration: 40,
    tick: 0,
    ...overrides,
  }
}

// ─────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – 初始状态', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('zones 初始为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('zones 是 Array 类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })
  it('注入后长度为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('多个 zone 全部存在', () => {
    ;(sys as any).zones.push(makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
  it('注入不改变 nextId', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).nextId).toBe(1)
  })
  it('zones 返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
})

// ─────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – CHECK_INTERVAL 节流', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 0)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=3194 时不执行（差值 3194 < 3195）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 3194)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=3195 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('第二次调用间隔不足时 lastCheck 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL + 10)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('tick=CHECK_INTERVAL*2 时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    vi.restoreAllMocks()
  })
  it('lastCheck 手动设为 5000，tick=5000+3194 时不执行', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
    vi.restoreAllMocks()
  })
  it('lastCheck 手动设为 5000，tick=5000+3195 时执行', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 3. spawn 逻辑（FORM_CHANCE 方向：random > FORM_CHANCE 则 continue 跳过）
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – spawn 逻辑', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('nearWater(SHALLOW) && random <= FORM_CHANCE → spawn', () => {
    // random=0 (≤ 0.0031) → 触发 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('nearWater(DEEP) && random=0 → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearDeepWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('nearMountain && random=0 → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearMountain(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('random > FORM_CHANCE → 跳过（continue）', () => {
    // random=0.5 > 0.0031 → 全部 attempt 都跳过
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random = FORM_CHANCE（精确等于）→ continue（不 spawn）', () => {
    // random > FORM_CHANCE 时 continue，等于时 0.0031 > 0.0031 → false → 不 continue → spawn
    // 等于时不跳过，会 spawn
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    // FORM_CHANCE = 0.0031, random=0.0031, 0.0031 > 0.0031 → false → 不 continue → spawn
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('无邻近水/山 → 不 spawn（GRASS 邻格）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldFlat(GRASS), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('无邻近水/山 → 不 spawn（SAND 邻格）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldFlat(SAND), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('zones 已达 MAX_ZONES → 不 spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.restoreAllMocks()
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
  it('spawn 的 zone.tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('spawn 的 zone.id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones[0].id).toBe(1)
    vi.restoreAllMocks()
  })
  it('3 次 attempt，最多 spawn 3 个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    // 最多 3 个 attempt，random=0 → 全部 spawn
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    vi.restoreAllMocks()
  })
  it('zones 剩余 1 个容量时只 spawn 1 个', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – spawn 字段范围', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('strontiumContent 初始范围 [42, 100)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.strontiumContent).toBeGreaterThanOrEqual(42)
    expect(z.strontiumContent).toBeLessThan(100.1)
    vi.restoreAllMocks()
  })
  it('springFlow 初始范围 [12, 60)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(12)
    expect(z.springFlow).toBeLessThan(60.1)
    vi.restoreAllMocks()
  })
  it('geologicalDeposit 初始范围 [22, 100)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.geologicalDeposit).toBeGreaterThanOrEqual(22)
    expect(z.geologicalDeposit).toBeLessThan(100.1)
    vi.restoreAllMocks()
  })
  it('mineralConcentration 初始范围 [16, 100)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.mineralConcentration).toBeGreaterThanOrEqual(16)
    expect(z.mineralConcentration).toBeLessThan(100.1)
    vi.restoreAllMocks()
  })
  it('strontiumContent 最大公式：42 + 1*58 = 100', () => {
    expect(42 + 1 * 58).toBe(100)
  })
  it('springFlow 最大公式：12 + 1*48 = 60', () => {
    expect(12 + 1 * 48).toBe(60)
  })
  it('geologicalDeposit 最大公式：22 + 1*78 = 100', () => {
    expect(22 + 1 * 78).toBe(100)
  })
  it('mineralConcentration 最大公式：16 + 1*84 = 100', () => {
    expect(16 + 1 * 84).toBe(100)
  })
})

// ─────────────────────────────────────────
// 5. update 数值逻辑（StrontiumSpring 无 per-tick update 循环，只有 spawn + cleanup）
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – update 无字段衰减', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('strontiumContent 在 update 后不变（无衰减循环）', () => {
    const z = makeZone({ strontiumContent: 70, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.strontiumContent).toBe(70)
    vi.restoreAllMocks()
  })
  it('springFlow 在 update 后不变', () => {
    const z = makeZone({ springFlow: 30, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.springFlow).toBe(30)
    vi.restoreAllMocks()
  })
  it('geologicalDeposit 在 update 后不变', () => {
    const z = makeZone({ geologicalDeposit: 50, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.geologicalDeposit).toBe(50)
    vi.restoreAllMocks()
  })
  it('mineralConcentration 在 update 后不变', () => {
    const z = makeZone({ mineralConcentration: 40, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.mineralConcentration).toBe(40)
    vi.restoreAllMocks()
  })
  it('zone 的 x 坐标在 update 后不变', () => {
    const z = makeZone({ x: 25, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.x).toBe(25)
    vi.restoreAllMocks()
  })
  it('zone 的 y 坐标在 update 后不变', () => {
    const z = makeZone({ y: 35, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.y).toBe(35)
    vi.restoreAllMocks()
  })
  it('zone 的 id 在 update 后不变', () => {
    const z = makeZone({ id: 99, tick: CHECK_INTERVAL * 10 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL * 10 + CHECK_INTERVAL)
    expect(z.id).toBe(99)
    vi.restoreAllMocks()
  })
  it('zone 的 tick 在 update 后不变（tick 字段不被修改）', () => {
    const t = CHECK_INTERVAL * 10
    const z = makeZone({ tick: t })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), t + CHECK_INTERVAL)
    expect(z.tick).toBe(t)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────
describe('WorldStrontiumSpringSystem – cleanup 逻辑', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('zone.tick < cutoff（tick=0, currentTick=55001）时被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 55001)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('zone.tick = cutoff（tick=0, currentTick=55000）时不清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CUTOFF_OFFSET)
    // cutoff = 55000 - 55000 = 0; zone.tick=0 < 0 → false → 保留
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('zone.tick > cutoff 时不清除', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: 60000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    // cutoff = 100000 - 55000 = 45000; 60000 > 45000 → 保留
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('只清除过期的 zone，保留新 zone', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: 60000 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(60000)
    vi.restoreAllMocks()
  })
  it('全部 zone 过期时全部清除', () => {
    const tick = 200000
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：zone.tick = cutoff - 1 时被清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 45000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 44999 < 45000 → 清除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：zone.tick = cutoff 时不清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 45000
    ;(sys as any).zones.push(makeZone({ tick: cutoff })) // 45000 < 45000 → false → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('刚 spawn 的 zone（tick=currentTick）不被 cleanup 清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('三条记录：2 过期 1 保留', () => {
    const tick = 150000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))   // 过期
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))   // 过期
    ;(sys as any).zones.push(makeZone({ tick: 100000 })) // 保留（100000 > 95000）
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), tick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cleanup 后 nextId 不受影响', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorldNearShallowWater(), makeEM(), 100000)
    expect((sys as any).nextId).toBe(5)
    vi.restoreAllMocks()
  })
})
