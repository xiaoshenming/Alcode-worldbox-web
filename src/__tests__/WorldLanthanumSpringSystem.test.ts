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
