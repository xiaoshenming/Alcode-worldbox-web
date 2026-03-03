import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNaturalWonderSystem } from '../systems/WorldNaturalWonderSystem'
import type { NaturalWonder, WonderType } from '../systems/WorldNaturalWonderSystem'
import { EntityManager } from '../ecs/Entity'

let wNextId = 1
function makeSys(): WorldNaturalWonderSystem { return new WorldNaturalWonderSystem() }
function makeWonder(type: WonderType = 'waterfall', x = 50, y = 50, power = 3): NaturalWonder {
  return { id: wNextId++, type, x, y, radius: 12, power, discovered: false, discoveredBy: null, age: 0 }
}
function makeWorld(width = 200, height = 200, tile = 5) {
  return { width, height, getTile: (_x: number, _y: number) => tile }
}
function makeEm(): EntityManager { return new EntityManager() }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem 初始状态', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })

  it('初始 wonders 为空', () => { expect(sys.getWonders()).toHaveLength(0) })
  it('初始 getWonderCount() === 0', () => { expect(sys.getWonderCount()).toBe(0) })
  it('初始 lastSpawn 为 0', () => { expect((sys as any).lastSpawn).toBe(0) })
  it('初始 lastBuff 为 0', () => { expect((sys as any).lastBuff).toBe(0) })
  it('getWonders() 返回数组引用', () => {
    expect(Array.isArray(sys.getWonders())).toBe(true)
  })
  it('两次调用 getWonders() 返回同一引用', () => {
    expect(sys.getWonders()).toBe(sys.getWonders())
  })
})

// ─────────────────────────────────────────────
// 2. 节流控制 (SPAWN_INTERVAL = 3000 * 16 = 48000ms)
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem 节流控制', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1; vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('冷却未到不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 极小值确保 spawn 尝试发生
    const em = makeEm()
    const world = makeWorld()
    vi.setSystemTime(0)
    ;(sys as any).lastSpawn = Date.now()
    sys.update(1, em, world)
    expect(sys.getWonderCount()).toBe(0)
  })

  it('冷却到期后触发 trySpawnWonder', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const em = makeEm()
    const world = makeWorld()
    vi.setSystemTime(0)
    ;(sys as any).lastSpawn = 0
    vi.setSystemTime(48001)
    sys.update(1, em, world)
    // lastSpawn 应被更新
    expect((sys as any).lastSpawn).toBeGreaterThan(0)
  })

  it('lastBuff 每次 update 递增 1', () => {
    const em = makeEm()
    const world = makeWorld()
    sys.update(1, em, world)
    expect((sys as any).lastBuff).toBe(1)
    sys.update(1, em, world)
    expect((sys as any).lastBuff).toBe(2)
  })

  it('lastBuff 每 800 次触发 applyBuffs', () => {
    const em = makeEm()
    const world = makeWorld()
    ;(sys as any).lastBuff = 799
    const w = makeWonder()
    sys.getWonders().push(w)
    for (let i = 0; i < 1; i++) sys.update(1, em, world)
    // 触发 applyBuffs，wonder.age 应递增
    expect(w.age).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 3. trySpawnWonder 条件
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem trySpawnWonder 条件', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })

  it('水域 tile=0 不生成奇观', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(200, 200, 0)
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(0)
    vi.restoreAllMocks()
  })

  it('浅水 tile=1 不生成奇观', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(200, 200, 1)
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(0)
    vi.restoreAllMocks()
  })

  it('陆地 tile=5 可以生成奇观', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(200, 200, 5)
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(1)
    vi.restoreAllMocks()
  })

  it('tile=null 不生成奇观', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = { width: 200, height: 200, getTile: () => null }
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(0)
    vi.restoreAllMocks()
  })

  it('已有奇观过近（距离 < 30）不生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // x = 10 + 0.5*(200-20)≈100
    const world = makeWorld(200, 200, 5)
    sys.getWonders().push(makeWonder('waterfall', 100, 100))
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(1) // 仍然只有原来那个
    vi.restoreAllMocks()
  })

  it('已有奇观够远时可以生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(200, 200, 5)
    sys.getWonders().push(makeWonder('waterfall', 10, 10)) // 远离 100,100
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(2)
    vi.restoreAllMocks()
  })

  it('达到 MAX_WONDERS=8 后不再生成', () => {
    for (let i = 0; i < 8; i++) {
      sys.getWonders().push(makeWonder('geyser', i * 50, i * 50))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const world = makeWorld(200, 200, 5)
    ;(sys as any).trySpawnWonder(world)
    expect(sys.getWonderCount()).toBe(8)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 4. spawn 后字段值正确
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem spawn 后字段值', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('生成的奇观 radius === 12', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].radius).toBe(12)
  })

  it('生成的奇观 discovered === false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].discovered).toBe(false)
  })

  it('生成的奇观 discoveredBy === null', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].discoveredBy).toBeNull()
  })

  it('生成的奇观 age === 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].age).toBe(0)
  })

  it('生成的奇观 power 在 1-3 范围内（Math.floor(random*3)+1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // floor(0.9*3)=2 => power=3
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].power).toBe(3)
  })

  it('power 最小值为 1（random=0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].power).toBeGreaterThanOrEqual(1)
  })

  it('奇观 type 属于 5 种合法类型之一', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    const validTypes: WonderType[] = ['waterfall', 'crystal_cave', 'ancient_tree', 'geyser', 'aurora_zone']
    expect(validTypes).toContain(sys.getWonders()[0].type)
  })

  it('奇观 id 为正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].id).toBeGreaterThan(0)
  })

  it('x 坐标在 [10, world.width-10) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld(200, 200, 5))
    const w = sys.getWonders()[0]
    expect(w.x).toBeGreaterThanOrEqual(10)
    expect(w.x).toBeLessThan(190)
  })

  it('y 坐标在 [10, world.height-10) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld(200, 200, 5))
    const w = sys.getWonders()[0]
    expect(w.y).toBeGreaterThanOrEqual(10)
    expect(w.y).toBeLessThan(190)
  })
})

// ─────────────────────────────────────────────
// 5. applyBuffs 字段变更
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem applyBuffs 字段变更', () => {
  let sys: WorldNaturalWonderSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); wNextId = 1; em = makeEm() })

  it('applyBuffs 使 wonder.age 递增', () => {
    const w = makeWonder('geyser', 50, 50)
    sys.getWonders().push(w)
    ;(sys as any).applyBuffs(em)
    expect(w.age).toBe(1)
  })

  it('多个奇观每次 applyBuffs 各自 age 递增', () => {
    const w1 = makeWonder('waterfall', 20, 20)
    const w2 = makeWonder('geyser', 100, 100)
    sys.getWonders().push(w1, w2)
    ;(sys as any).applyBuffs(em)
    expect(w1.age).toBe(1)
    expect(w2.age).toBe(1)
  })

  it('生物在奇观半径内时 discovered 置为 true', () => {
    const w = makeWonder('aurora_zone', 50, 50)
    w.radius = 12
    sys.getWonders().push(w)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    em.addComponent(eid, { type: 'position', x: 50, y: 50 })
    ;(sys as any).applyBuffs(em)
    expect(w.discovered).toBe(true)
  })

  it('生物在奇观半径外时 discovered 保持 false', () => {
    const w = makeWonder('waterfall', 50, 50)
    w.radius = 5
    sys.getWonders().push(w)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    em.addComponent(eid, { type: 'position', x: 200, y: 200 })
    ;(sys as any).applyBuffs(em)
    expect(w.discovered).toBe(false)
  })

  it('已发现的奇观不重复设置 discoveredBy', () => {
    const w = makeWonder('crystal_cave', 50, 50)
    w.discovered = true
    w.discoveredBy = 42
    sys.getWonders().push(w)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    em.addComponent(eid, { type: 'position', x: 50, y: 50 })
    em.addComponent(eid, { type: 'civMember', civId: 99 })
    ;(sys as any).applyBuffs(em)
    // discoveredBy 不被覆盖
    expect(w.discoveredBy).toBe(42)
  })

  it('无生物时 applyBuffs 仅递增 age', () => {
    const w = makeWonder('ancient_tree', 50, 50)
    sys.getWonders().push(w)
    ;(sys as any).applyBuffs(em)
    expect(w.age).toBe(1)
    expect(w.discovered).toBe(false)
  })

  it('有 civMember 的生物发现奇观时记录 civId', () => {
    const w = makeWonder('geyser', 50, 50)
    w.radius = 20
    sys.getWonders().push(w)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    em.addComponent(eid, { type: 'position', x: 50, y: 50 })
    em.addComponent(eid, { type: 'civMember', civId: 7 })
    ;(sys as any).applyBuffs(em)
    expect(w.discoveredBy).toBe(7)
  })
})

// ─────────────────────────────────────────────
// 6. getWonders / getWonderCount
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem getWonders & getWonderCount', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })

  it('注入 1 个后 getWonderCount() === 1', () => {
    sys.getWonders().push(makeWonder())
    expect(sys.getWonderCount()).toBe(1)
  })

  it('注入 5 个后 getWonderCount() === 5', () => {
    for (let i = 0; i < 5; i++) sys.getWonders().push(makeWonder())
    expect(sys.getWonderCount()).toBe(5)
  })

  it('getWonders() 返回的数组与内部 wonders 同一引用', () => {
    expect(sys.getWonders()).toBe((sys as any).wonders)
  })

  it('5 种奇观类型均合法', () => {
    const types: WonderType[] = ['waterfall', 'crystal_cave', 'ancient_tree', 'geyser', 'aurora_zone']
    types.forEach(t => sys.getWonders().push(makeWonder(t)))
    expect(sys.getWonderCount()).toBe(5)
  })
})

// ─────────────────────────────────────────────
// 7. MAX_WONDERS 上限
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem MAX_WONDERS 上限', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('trySpawnWonder 在满 8 个时返回', () => {
    for (let i = 0; i < 8; i++) sys.getWonders().push(makeWonder('geyser', i * 60, 10))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonderCount()).toBe(8)
  })

  it('满 7 个时仍可 spawn 一个', () => {
    for (let i = 0; i < 7; i++) sys.getWonders().push(makeWonder('geyser', i * 60, 10))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonderCount()).toBe(8)
  })

  it('手动注入超过 8 个后 trySpawnWonder 不再添加', () => {
    for (let i = 0; i < 10; i++) sys.getWonders().push(makeWonder('waterfall', i * 30, 10))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonderCount()).toBe(10) // 手动注入不受限制
  })
})

// ─────────────────────────────────────────────
// 8. 边界验证
// ─────────────────────────────────────────────
describe('WorldNaturalWonderSystem 边界验证', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); wNextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('world.width 很小时坐标不越界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).trySpawnWonder(makeWorld(30, 30, 5))
    if (sys.getWonderCount() > 0) {
      expect(sys.getWonders()[0].x).toBeGreaterThanOrEqual(10)
      expect(sys.getWonders()[0].y).toBeGreaterThanOrEqual(10)
    }
  })

  it('多次调用 trySpawnWonder 不抛错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld()
    expect(() => {
      for (let i = 0; i < 20; i++) { ;(sys as any).trySpawnWonder(world) }
    }).not.toThrow()
  })

  it('空 EntityManager applyBuffs 不抛错', () => {
    sys.getWonders().push(makeWonder())
    expect(() => { ;(sys as any).applyBuffs(makeEm()) }).not.toThrow()
  })

  it('wonder 字段 power 在 1-3 之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).trySpawnWonder(makeWorld())
    if (sys.getWonderCount() > 0) {
      const power = sys.getWonders()[0].power
      expect(power).toBeGreaterThanOrEqual(1)
      expect(power).toBeLessThanOrEqual(3)
    }
  })

  it('距离判断阈值为 30²=900', () => {
    // 放置一个奇观在 50,50；测试 79,50 (dx=29) 可能通过，80,50 (dx=30) 刚好不通过
    const existing = makeWonder('geyser', 50, 50)
    sys.getWonders().push(existing)
    // 手动注入近距离奇观不受 trySpawnWonder 检查
    const nearWonder = makeWonder('waterfall', 79, 50) // dx=29, 29²=841 < 900 → 太近
    // 这里只验证逻辑正确性，直接检查 trySpawnWonder 跳过情况
    let mockCallCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      mockCallCount++
      // x = 10 + floor(0.222*(200-20)) = 10 + floor(40) = 50
      // y = 10 + floor(0.222*(200-20)) = 50
      return 0.222
    })
    ;(sys as any).trySpawnWonder(makeWorld())
    // 因为 50,50 已存在，dx=dy=0 < 30，所以不生成
    expect(sys.getWonderCount()).toBe(1)
  })

  it('update 不传 entity 相关时不抛错', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    ;(sys as any).lastSpawn = 0
    vi.setSystemTime(48001)
    expect(() => sys.update(1, makeEm(), makeWorld())).not.toThrow()
    vi.useRealTimers()
  })

  it('多次 applyBuffs 使 age 持续递增', () => {
    const w = makeWonder()
    sys.getWonders().push(w)
    ;(sys as any).applyBuffs(makeEm())
    ;(sys as any).applyBuffs(makeEm())
    ;(sys as any).applyBuffs(makeEm())
    expect(w.age).toBe(3)
  })

  it('奇观 radius 固定为 12', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).trySpawnWonder(makeWorld())
    expect(sys.getWonders()[0].radius).toBe(12)
    vi.restoreAllMocks()
  })

  it('生物恰好在半径边界上时可发现', () => {
    const w = makeWonder('waterfall', 50, 50)
    w.radius = 10
    sys.getWonders().push(w)
    const localEm = makeEm()
    const eid = localEm.createEntity()
    localEm.addComponent(eid, { type: 'creature' })
    localEm.addComponent(eid, { type: 'position', x: 60, y: 50 }) // dx=10, dy=0, dist²=100 <= 100
    ;(sys as any).applyBuffs(localEm)
    expect(w.discovered).toBe(true)
  })

  it('生物刚超出半径时不发现', () => {
    const w = makeWonder('geyser', 50, 50)
    w.radius = 10
    sys.getWonders().push(w)
    const localEm = makeEm()
    const eid = localEm.createEntity()
    localEm.addComponent(eid, { type: 'creature' })
    localEm.addComponent(eid, { type: 'position', x: 61, y: 50 }) // dx=11, dist²=121 > 100
    ;(sys as any).applyBuffs(localEm)
    expect(w.discovered).toBe(false)
  })

  it('无 civMember 的生物发现奇观时 discoveredBy 保持 null', () => {
    const w = makeWonder()
    sys.getWonders().push(w)
    const localEm = makeEm()
    const eid = localEm.createEntity()
    localEm.addComponent(eid, { type: 'creature' })
    localEm.addComponent(eid, { type: 'position', x: w.x, y: w.y })
    ;(sys as any).applyBuffs(localEm)
    expect(w.discovered).toBe(true)
    expect(w.discoveredBy).toBeNull()
  })

  it('多个生物同时发现时记录第一个 civId', () => {
    const w = makeWonder('aurora_zone', 50, 50)
    w.radius = 20
    sys.getWonders().push(w)
    const localEm = makeEm()
    const eid1 = localEm.createEntity()
    localEm.addComponent(eid1, { type: 'creature' })
    localEm.addComponent(eid1, { type: 'position', x: 50, y: 50 })
    localEm.addComponent(eid1, { type: 'civMember', civId: 5 })
    const eid2 = localEm.createEntity()
    localEm.addComponent(eid2, { type: 'creature' })
    localEm.addComponent(eid2, { type: 'position', x: 51, y: 50 })
    localEm.addComponent(eid2, { type: 'civMember', civId: 7 })
    ;(sys as any).applyBuffs(localEm)
    // 第一个发现的 civId 被记录
    expect(w.discoveredBy).toBe(5)
  })

  it('奇观 type 为 waterfall 时字段正确', () => {
    const w = makeWonder('waterfall')
    expect(w.type).toBe('waterfall')
  })

  it('奇观 type 为 crystal_cave 时字段正确', () => {
    const w = makeWonder('crystal_cave')
    expect(w.type).toBe('crystal_cave')
  })

  it('奇观 type 为 ancient_tree 时字段正确', () => {
    const w = makeWonder('ancient_tree')
    expect(w.type).toBe('ancient_tree')
  })

  it('奇观 type 为 geyser 时字段正确', () => {
    const w = makeWonder('geyser')
    expect(w.type).toBe('geyser')
  })

  it('奇观 type 为 aurora_zone 时字段正确', () => {
    const w = makeWonder('aurora_zone')
    expect(w.type).toBe('aurora_zone')
  })

  it('lastBuff 从 799 到 800 时触发 applyBuffs', () => {
    const w = makeWonder()
    sys.getWonders().push(w)
    ;(sys as any).lastBuff = 799
    sys.update(1, makeEm(), makeWorld())
    expect(w.age).toBe(1)
  })

  it('lastBuff % 800 !== 0 时不触发 applyBuffs', () => {
    const w = makeWonder()
    sys.getWonders().push(w)
    ;(sys as any).lastBuff = 798
    sys.update(1, makeEm(), makeWorld())
    expect(w.age).toBe(0)
  })

  it('连续 update 使 lastBuff 持续递增', () => {
    const em = makeEm()
    const world = makeWorld()
    sys.update(1, em, world)
    sys.update(1, em, world)
    sys.update(1, em, world)
    expect((sys as any).lastBuff).toBe(3)
  })
})
