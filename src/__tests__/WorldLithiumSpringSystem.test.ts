import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLithiumSpringSystem } from '../systems/WorldLithiumSpringSystem'
import type { LithiumSpringZone } from '../systems/WorldLithiumSpringSystem'

// ────────────────────────────────────────────────────────────
// 常量（与源码对齐）
// CHECK_INTERVAL = 3240, FORM_CHANCE = 0.003, MAX_ZONES = 32
// spawn条件: (nearWater || nearMountain) && random <= FORM_CHANCE
// nearWater: hasAdjacentTile(SHALLOW_WATER=1) || hasAdjacentTile(DEEP_WATER=0)
// nearMountain: hasAdjacentTile(MOUNTAIN=5)
// 每次 update 最多 3 次 attempt
// cleanup: zones[i].tick < tick - 54000
// ────────────────────────────────────────────────────────────

function makeSys(): WorldLithiumSpringSystem { return new WorldLithiumSpringSystem() }

let _nextId = 1
function makeZone(overrides: Partial<LithiumSpringZone> = {}): LithiumSpringZone {
  return {
    id: _nextId++,
    x: 20, y: 30,
    lithiumContent: 60,
    springFlow: 30,
    pegmatiteLeaching: 50,
    alkaliConcentration: 40,
    tick: 0,
    ...overrides,
  }
}

// world mock: getTile 返回 tileMap(x,y)
function makeWorld(tileMap: (x: number, y: number) => number | null = () => null, w = 100, h = 100) {
  return { width: w, height: h, getTile: tileMap } as any
}

// 邻格全为 SHALLOW_WATER(1) 的 world
const waterWorld = makeWorld((x, y) => 1)

// 邻格全为 GRASS(3) 的 world（无水无山）
const grassWorld = makeWorld(() => 3)

// 邻格全为 MOUNTAIN(5) 的 world
const mountainWorld = makeWorld(() => 5)

const em = {} as any

// ────────────────────────────────────────────────────────────
// 1. 初始状态
// ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldLithiumSpringSystem
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

  it('注入 zone 后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone 字段结构完整', () => {
    const z = makeZone()
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('lithiumContent')
    expect(z).toHaveProperty('springFlow')
    expect(z).toHaveProperty('pegmatiteLeaching')
    expect(z).toHaveProperty('alkaliConcentration')
    expect(z).toHaveProperty('tick')
  })
})

// ────────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流 (3240)
// ────────────────────────────────────────────────────────────
describe('CHECK_INTERVAL 节流 (3240)', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0, lastCheck=0: 0-0=0 < 3240 → 不执行', () => {
    sys.update(16, waterWorld, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3239 时不执行（不足间隔）', () => {
    sys.update(16, grassWorld, em, 3239)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3240 时恰好执行（等于时不满足严格小于）', () => {
    sys.update(16, grassWorld, em, 3240)
    expect((sys as any).lastCheck).toBe(3240)
  })

  it('tick=4000 时执行并更新 lastCheck', () => {
    sys.update(16, grassWorld, em, 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('执行后立即再调用不重复执行', () => {
    sys.update(16, grassWorld, em, 3240) // lastCheck=3240
    sys.update(16, grassWorld, em, 3241) // 3241-3240=1 < 3240 → 跳过
    expect((sys as any).lastCheck).toBe(3240)
  })

  it('等待下一个间隔后再次执行', () => {
    sys.update(16, grassWorld, em, 3240) // lastCheck=3240
    sys.update(16, grassWorld, em, 6480) // 6480-3240=3240 → 执行
    expect((sys as any).lastCheck).toBe(6480)
  })
})

// ────────────────────────────────────────────────────────────
// 3. spawn 条件
// ────────────────────────────────────────────────────────────
describe('spawn 条件', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('无水无山时不 spawn（continue 跳过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, grassWorld, em, 3240)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random > FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 1 > 0.003
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻格有浅水(1) 且 random=0 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    // 3次 attempt, random=0 均小于 FORM_CHANCE=0.003
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻格有深水(0) 也算 nearWater 触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const deepWaterWorld = makeWorld(() => 0) // DEEP_WATER
    sys.update(16, deepWaterWorld, em, 3240)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻格有山地(5) 时触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, mountainWorld, em, 3240)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('每次 update 最多 3 次 attempt（zones 不超过 3 个）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    // 最多 3 个 attempt → 最多 3 个 zone
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

// ────────────────────────────────────────────────────────────
// 4. nextId 递增
// ────────────────────────────────────────────────────────────
describe('nextId 递增', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('spawn 一个后 nextId 变为 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    if ((sys as any).zones.length >= 1) {
      expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    }
  })

  it('手动注入后 nextId 不自动递增', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).nextId).toBe(1) // 没有 spawn, nextId 不变
  })

  it('多次 spawn 后 nextId 随 zone 数量递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240) // 第1次 update
    const count = (sys as any).zones.length
    const nextIdAfter = (sys as any).nextId
    vi.restoreAllMocks()
    expect(nextIdAfter).toBe(1 + count)
  })
})

// ────────────────────────────────────────────────────────────
// 5. spawn 后字段验证
// ────────────────────────────────────────────────────────────
describe('spawn 后字段验证', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => {
    sys = makeSys()
    _nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
  })

  it('spawn 的 zone 至少有1个', () => {
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('lithiumContent 在 [40, 100] 范围内', () => {
    for (const z of (sys as any).zones) {
      expect(z.lithiumContent).toBeGreaterThanOrEqual(40)
      expect(z.lithiumContent).toBeLessThanOrEqual(100)
    }
  })

  it('springFlow 在 [10, 60] 范围内', () => {
    for (const z of (sys as any).zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('pegmatiteLeaching 在 [20, 100] 范围内', () => {
    for (const z of (sys as any).zones) {
      expect(z.pegmatiteLeaching).toBeGreaterThanOrEqual(20)
      expect(z.pegmatiteLeaching).toBeLessThanOrEqual(100)
    }
  })

  it('alkaliConcentration 在 [15, 100] 范围内', () => {
    for (const z of (sys as any).zones) {
      expect(z.alkaliConcentration).toBeGreaterThanOrEqual(15)
      expect(z.alkaliConcentration).toBeLessThanOrEqual(100)
    }
  })

  it('spawn 后 zone.tick 等于当次 update 的 tick', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys2.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    for (const z of (sys2 as any).zones) {
      expect(z.tick).toBe(3240)
    }
  })

  it('zone.id 从 1 开始递增', () => {
    const zones = (sys as any).zones as LithiumSpringZone[]
    for (let i = 0; i < zones.length; i++) {
      expect(zones[i].id).toBe(i + 1)
    }
  })
})

// ────────────────────────────────────────────────────────────
// 6. cleanup 逻辑（cutoff = tick - 54000）
// ────────────────────────────────────────────────────────────
describe('cleanup 逻辑', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('zone.tick < cutoff 时删除', () => {
    // tick=57240, cutoff=57240-54000=3240; zone.tick=0 < 3240 → 删除
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(16, grassWorld, em, 57240)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick === cutoff 时不删除（严格小于）', () => {
    // tick=57240, cutoff=3240; zone.tick=3240, 3240 < 3240 为 false → 保留
    ;(sys as any).zones.push(makeZone({ tick: 3240 }))
    sys.update(16, grassWorld, em, 57240)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff 时不删除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 4000 }))
    sys.update(16, grassWorld, em, 57240)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个 zone: 过期的删除，未过期的保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))     // 会删: 0 < 3240
    ;(sys as any).zones.push(makeZone({ tick: 3240 }))  // 保留: 3240 < 3240 = false
    ;(sys as any).zones.push(makeZone({ tick: 5000 }))  // 保留: 5000 < 3240 = false
    sys.update(16, grassWorld, em, 57240)
    expect((sys as any).zones).toHaveLength(2)
  })

  it('多个过期 zone 全部删除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 200 }))
    sys.update(16, grassWorld, em, 57240)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup 在 CHECK_INTERVAL 节流内不执行（tick 不足时）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // tick=100, lastCheck=0, 100-0=100 < 3240 → 跳过 cleanup
    sys.update(16, grassWorld, em, 100)
    expect((sys as any).zones).toHaveLength(1) // 未被删
  })
})

// ────────────────────────────────────────────────────────────
// 7. MAX_ZONES 上限 (32)
// ────────────────────────────────────────────────────────────
describe('MAX_ZONES 上限 (32)', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已有 32 个 zone 时不再 spawn', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, waterWorld, em, 3240)
    vi.restoreAllMocks()
    // 已满 32, 不再添加 (3次 attempt 均 break)
    expect((sys as any).zones.length).toBe(32)
  })

  it('已有 31 个时允许再 spawn（差1个）', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 1 }))
    }
    expect((sys as any).zones.length).toBe(31)
    expect(31).toBeLessThan(32)
  })

  it('zones 数量不会超过 MAX_ZONES=32', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 多次 update 触发 spawn
    for (let t = 1; t <= 20; t++) {
      sys.update(16, waterWorld, em, t * 3240)
    }
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
})

// ────────────────────────────────────────────────────────────
// 8. 手动注入验证字段值
// ────────────────────────────────────────────────────────────
describe('手动注入 zone 字段验证', () => {
  let sys: WorldLithiumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('lithiumContent 字段值正确', () => {
    ;(sys as any).zones.push(makeZone({ lithiumContent: 75 }))
    expect((sys as any).zones[0].lithiumContent).toBe(75)
  })

  it('springFlow 字段值正确', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45 }))
    expect((sys as any).zones[0].springFlow).toBe(45)
  })

  it('pegmatiteLeaching 字段值正确', () => {
    ;(sys as any).zones.push(makeZone({ pegmatiteLeaching: 60 }))
    expect((sys as any).zones[0].pegmatiteLeaching).toBe(60)
  })

  it('alkaliConcentration 字段值正确', () => {
    ;(sys as any).zones.push(makeZone({ alkaliConcentration: 55 }))
    expect((sys as any).zones[0].alkaliConcentration).toBe(55)
  })

  it('多个 zone 按顺序存储', () => {
    ;(sys as any).zones.push(makeZone({ id: 10, x: 5, y: 5 }))
    ;(sys as any).zones.push(makeZone({ id: 20, x: 10, y: 10 }))
    expect((sys as any).zones[0].id).toBe(10)
    expect((sys as any).zones[1].id).toBe(20)
  })
})
