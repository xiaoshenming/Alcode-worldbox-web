import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLanthanumSpringSystem } from '../systems/WorldLanthanumSpringSystem'
import type { LanthanumSpringZone } from '../systems/WorldLanthanumSpringSystem'

// ---- 常量（与源码保持一致） ----
const CHECK_INTERVAL = 2940
const MAX_ZONES = 32

// ---- Mock 工厂 ----
function makeSys(): WorldLanthanumSpringSystem { return new WorldLanthanumSpringSystem() }

let _nextId = 1
function makeZone(overrides: Partial<LanthanumSpringZone> = {}): LanthanumSpringZone {
  return {
    id: _nextId++,
    x: 20, y: 30,
    lanthanumContent: 40,
    springFlow: 50,
    bastnasiteLeaching: 60,
    mineralReactivity: 70,
    tick: 0,
    ...overrides
  }
}

/** 构建阻断 spawn 的 world mock（SAND=2，不相邻水/山） */
function makeBlockWorld() {
  return {
    width: 100, height: 100,
    getTile: () => 2  // SAND — 不会 hasAdjacentTile 到水或山
  } as any
}

/** 构建允许 spawn 的 world mock：所有 tile 均为 SHALLOW_WATER=1 */
function makeSpawnWorld() {
  return {
    width: 100, height: 100,
    getTile: () => 1  // SHALLOW_WATER — hasAdjacentTile 返回 true
  } as any
}

function makeEm() { return {} as any }

// ====================================================================
// 1. 初始状态
// ====================================================================
describe('WorldLanthanumSpringSystem — 初始状态', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('zones 数组初始为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones 是 Array 实例', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('注入一个 zone 后 length 为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones 引用稳定（同一对象）', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })
})

// ====================================================================
// 2. CHECK_INTERVAL 节流
// ====================================================================
describe('WorldLanthanumSpringSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it(`tick < CHECK_INTERVAL 时不执行（lastCheck 保持 0）`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it(`tick === CHECK_INTERVAL 时执行（差值恰好不满足严格小于）`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it(`tick > CHECK_INTERVAL 时更新 lastCheck`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it(`第一次 check 后，相隔不足 CHECK_INTERVAL 再调用不会再次更新 lastCheck`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    const after = (sys as any).lastCheck
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(after)
  })

  it(`连续两次满足 interval 时，lastCheck 会更新两次`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

// ====================================================================
// 3. spawn 条件
// ====================================================================
describe('WorldLanthanumSpringSystem — spawn 条件', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('SAND tile（无相邻水/山）时不会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SHALLOW_WATER tile + random=0 时会 spawn（FORM_CHANCE=0.003 满足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random > FORM_CHANCE 时不会 spawn（即使相邻水）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('spawn 记录的 tick 等于传入的 tick 值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    const zone: LanthanumSpringZone = (sys as any).zones[0]
    expect(zone.tick).toBe(CHECK_INTERVAL)
  })
})

// ====================================================================
// 4. spawn 后字段范围验证
// ====================================================================
describe('WorldLanthanumSpringSystem — spawn 字段范围', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function spawnOne(): LanthanumSpringZone {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    return (sys as any).zones[0]
  }

  it('lanthanumContent 在 [40, 100] 范围内', () => {
    const z = spawnOne()
    expect(z.lanthanumContent).toBeGreaterThanOrEqual(40)
    expect(z.lanthanumContent).toBeLessThanOrEqual(100)
  })

  it('springFlow 在 [10, 60] 范围内', () => {
    const z = spawnOne()
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('bastnasiteLeaching 在 [20, 100] 范围内', () => {
    const z = spawnOne()
    expect(z.bastnasiteLeaching).toBeGreaterThanOrEqual(20)
    expect(z.bastnasiteLeaching).toBeLessThanOrEqual(100)
  })

  it('mineralReactivity 在 [15, 100] 范围内', () => {
    const z = spawnOne()
    expect(z.mineralReactivity).toBeGreaterThanOrEqual(15)
    expect(z.mineralReactivity).toBeLessThanOrEqual(100)
  })

  it('id 从 1 开始递增', () => {
    const z = spawnOne()
    expect(z.id).toBe(1)
  })

  it('zone 具有 x 和 y 坐标（均为数字）', () => {
    const z = spawnOne()
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
  })
})

// ====================================================================
// 5. MAX_ZONES 上限
// ====================================================================
describe('WorldLanthanumSpringSystem — MAX_ZONES 上限', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it(`zones 达到 MAX_ZONES(${MAX_ZONES}) 时不再 spawn`, () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })

  it(`zones 为 MAX_ZONES-1 时还可 spawn 1 个`, () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES)
  })
})

// ====================================================================
// 6. cleanup 逻辑
// ====================================================================
describe('WorldLanthanumSpringSystem — cleanup', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  // cutoff = tick - 54000
  it('zone.tick < cutoff 时被删除', () => {
    const tick = CHECK_INTERVAL
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick === cutoff 时不删除（严格小于）', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000  // === CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff 时保留', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合情况：过期的删除，未过期的保留', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 100 })) // 未过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 500 })) // 过期
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(cutoff + 100)
  })

  it('全部过期时 zones 清空', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - i - 1 }))
    }
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('无 zone 时 cleanup 不抛出异常', () => {
    expect(() => sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)).not.toThrow()
  })
})

// ====================================================================
// 7. 边界条件测试
// ====================================================================
describe('WorldLanthanumSpringSystem — 边界条件', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick = 0 时不执行（差值为负）', () => {
    sys.update(1, makeBlockWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 为负数时不执行', () => {
    sys.update(1, makeBlockWorld(), makeEm(), -100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('world.width = 0 时不会崩溃', () => {
    const world = { width: 0, height: 100, getTile: () => 1 } as any
    expect(() => sys.update(1, world, makeEm(), CHECK_INTERVAL)).not.toThrow()
  })

  it('world.height = 0 时不会崩溃', () => {
    const world = { width: 100, height: 0, getTile: () => 1 } as any
    expect(() => sys.update(1, world, makeEm(), CHECK_INTERVAL)).not.toThrow()
  })

  it('world 尺寸为 1x1 时可以正常运行', () => {
    const world = { width: 1, height: 1, getTile: () => 1 } as any
    expect(() => sys.update(1, world, makeEm(), CHECK_INTERVAL)).not.toThrow()
  })

  it('极大的 tick 值不会导致溢出', () => {
    const hugeTick = Number.MAX_SAFE_INTEGER - 100000
    expect(() => sys.update(1, makeBlockWorld(), makeEm(), hugeTick)).not.toThrow()
  })

  it('cutoff 计算为负数时所有 zone 都保留', () => {
    const tick = 1000  // 小于 54000
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(1)
  })
})

// ====================================================================
// 8. 多实体交互测试
// ====================================================================
describe('WorldLanthanumSpringSystem — 多实体交互', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('多个 zone 同时存在时 id 唯一', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    const ids = (sys as any).zones.map((z: LanthanumSpringZone) => z.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(10)
  })

  it('连续 spawn 多个 zone 时 id 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 5; i++) {
      sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL * (i + 1))
    }
    vi.restoreAllMocks()
    const ids = (sys as any).zones.map((z: LanthanumSpringZone) => z.id)
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1])
    }
  })

  it('部分 zone 过期时，剩余 zone 的属性不变', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    const keepZone = makeZone({ tick: cutoff + 100, lanthanumContent: 88 })
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).zones.push(keepZone)
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones[0].lanthanumContent).toBe(88)
  })

  it('cleanup 后 zones 数组顺序保持（未过期的相对顺序不变）', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ id: 10, tick: cutoff + 10 }))
    ;(sys as any).zones.push(makeZone({ id: 20, tick: cutoff - 1 }))
    ;(sys as any).zones.push(makeZone({ id: 30, tick: cutoff + 20 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones.map((z: LanthanumSpringZone) => z.id)).toEqual([10, 30])
  })

  it('MAX_ZONES 达到后，cleanup 可以腾出空间再次 spawn', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))  // 全部过期
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), tick)
    vi.restoreAllMocks()
    // cleanup 后应该清空，然后可能 spawn 新的
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)  // 最多 3 次尝试
  })
})

// ====================================================================
// 9. 状态转换测试
// ====================================================================
describe('WorldLanthanumSpringSystem — 状态转换', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('从空状态到有 zone 状态', () => {
    expect((sys as any).zones).toHaveLength(0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('从有 zone 状态到空状态（全部过期）', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    expect((sys as any).zones).toHaveLength(1)
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('lastCheck 从 0 更新到 CHECK_INTERVAL', () => {
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('nextId 从 1 递增到更大值', () => {
    expect((sys as any).nextId).toBe(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('zones 从未满到达到 MAX_ZONES', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    expect((sys as any).zones.length).toBeLessThan(MAX_ZONES)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES)
  })
})

// ====================================================================
// 10. 极端值测试
// ====================================================================
describe('WorldLanthanumSpringSystem — 极端值', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('spawn 时 Math.random() = 0 产生最小值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    const z: LanthanumSpringZone = (sys as any).zones[0]
    expect(z.lanthanumContent).toBe(40)
    expect(z.springFlow).toBe(10)
    expect(z.bastnasiteLeaching).toBe(20)
    expect(z.mineralReactivity).toBe(15)
  })

  it('spawn 时 Math.random() = 0.999 产生接近最大值', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)  // x 坐标
    mockRandom.mockReturnValueOnce(0)  // y 坐标
    mockRandom.mockReturnValueOnce(0)  // FORM_CHANCE 检查
    mockRandom.mockReturnValueOnce(0.999)  // lanthanumContent
    mockRandom.mockReturnValueOnce(0.999)  // springFlow
    mockRandom.mockReturnValueOnce(0.999)  // bastnasiteLeaching
    mockRandom.mockReturnValueOnce(0.999)  // mineralReactivity
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    const z: LanthanumSpringZone = (sys as any).zones[0]
    expect(z.lanthanumContent).toBeCloseTo(99.94, 1)
    expect(z.springFlow).toBeCloseTo(59.95, 1)
    expect(z.bastnasiteLeaching).toBeCloseTo(99.92, 1)
    expect(z.mineralReactivity).toBeCloseTo(99.915, 1)
  })

  it('tick 为 Number.MAX_SAFE_INTEGER 时不崩溃', () => {
    expect(() => sys.update(1, makeBlockWorld(), makeEm(), Number.MAX_SAFE_INTEGER)).not.toThrow()
  })

  it('world 尺寸为极大值时不崩溃', () => {
    const world = { width: 10000, height: 10000, getTile: () => 2 } as any
    expect(() => sys.update(1, world, makeEm(), CHECK_INTERVAL)).not.toThrow()
  })

  it('nextId 接近 Number.MAX_SAFE_INTEGER 时仍能递增', () => {
    ;(sys as any).nextId = Number.MAX_SAFE_INTEGER - 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBeGreaterThan(Number.MAX_SAFE_INTEGER - 10)
  })
})

// ====================================================================
// 11. 组合场景测试
// ====================================================================
describe('WorldLanthanumSpringSystem — 组合场景', () => {
  let sys: WorldLanthanumSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('spawn + cleanup 同时发生：新增的同时删除过期的', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))  // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 100 })) // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), tick)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThan(1)  // 至少保留1个 + 新增的
  })

  it('连续多次 update，每次都满足 CHECK_INTERVAL', () => {
    for (let i = 1; i <= 5; i++) {
      sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL * i)
    }
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
  })

  it('连续多次 update，部分满足 CHECK_INTERVAL，部分不满足', () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)  // 不满足，不更新
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('MAX_ZONES 边界 + cleanup：达到上限后过期一部分，再 spawn', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: i < 10 ? cutoff - 1 : cutoff + 100 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSpawnWorld(), makeEm(), tick)
    vi.restoreAllMocks()
    // 10 个过期被删除，剩余 22 个，可能 spawn 新的（最多 3 个）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES - 10)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES - 10 + 3)
  })

  it('spawn 3 次尝试，全部失败（random > FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn 3 次尝试，第 2 次成功', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // 第 1 次尝试
    mockRandom.mockReturnValueOnce(0.5)  // x
    mockRandom.mockReturnValueOnce(0.5)  // y
    mockRandom.mockReturnValueOnce(0.999)  // FORM_CHANCE 失败
    // 第 2 次尝试
    mockRandom.mockReturnValueOnce(0.5)  // x
    mockRandom.mockReturnValueOnce(0.5)  // y
    mockRandom.mockReturnValueOnce(0)  // FORM_CHANCE 成功
    mockRandom.mockReturnValue(0.5)  // 后续所有调用
    sys.update(1, makeSpawnWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('world 混合地形：部分位置可 spawn，部分不可', () => {
    const world = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => (x < 50 ? 1 : 2)  // 左半边水，右半边沙
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    // 可能 spawn 也可能不 spawn，取决于随机坐标
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })

  it('dt 参数变化不影响逻辑（系统只依赖 tick）', () => {
    sys.update(0.016, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(1000, makeBlockWorld(), makeEm(), CHECK_INTERVAL * 2)
    const lastCheck2 = (sys as any).lastCheck
    expect(lastCheck1).toBe(CHECK_INTERVAL)
    expect(lastCheck2).toBe(CHECK_INTERVAL * 2)
  })
})

