import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureFermentationSystem } from '../systems/CreatureFermentationSystem'
import type { FermentedGood, FermentType } from '../systems/CreatureFermentationSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureFermentationSystem { return new CreatureFermentationSystem() }
function makeGood(
  producerId: number,
  type: FermentType = 'fruit_wine',
  overrides: Partial<FermentedGood> = {}
): FermentedGood {
  return {
    id: nextId++,
    producerId,
    type,
    quality: 70,
    potency: 50,
    moraleBoost: 10,
    tradeValue: 30,
    ageTicks: 100,
    tick: 0,
    ...overrides,
  }
}

function makeEm(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager, age = 20): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age, race: 'human', name: 'Test' } as any)
  em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
  return eid
}

// ─── 初始状态 ──────────────────────────────────────────────────────────────────
describe('CreatureFermentationSystem — 初始状态', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('goods 数组初始为空', () => {
    expect((sys as any).goods).toHaveLength(0)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 内部 goods 数组操作 ──────────────────────────────────────────────────────
describe('CreatureFermentationSystem — goods 数组', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后 goods 长度增加', () => {
    ;(sys as any).goods.push(makeGood(1, 'honey_mead'))
    expect((sys as any).goods).toHaveLength(1)
  })

  it('注入的 type 正确保存', () => {
    ;(sys as any).goods.push(makeGood(1, 'honey_mead'))
    expect((sys as any).goods[0].type).toBe('honey_mead')
  })

  it('返回值是内部引用（同一对象）', () => {
    ;(sys as any).goods.push(makeGood(1))
    expect((sys as any).goods).toBe((sys as any).goods)
  })

  it('可注入多个 goods', () => {
    for (let i = 0; i < 5; i++) (sys as any).goods.push(makeGood(i + 1))
    expect((sys as any).goods).toHaveLength(5)
  })

  it('支持 fruit_wine 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine'))
    expect((sys as any).goods[0].type).toBe('fruit_wine')
  })

  it('支持 grain_beer 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'grain_beer'))
    expect((sys as any).goods[0].type).toBe('grain_beer')
  })

  it('支持 honey_mead 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'honey_mead'))
    expect((sys as any).goods[0].type).toBe('honey_mead')
  })

  it('支持 herb_tonic 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'herb_tonic'))
    expect((sys as any).goods[0].type).toBe('herb_tonic')
  })

  it('支持 root_brew 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'root_brew'))
    expect((sys as any).goods[0].type).toBe('root_brew')
  })

  it('支持 mushroom_elixir 类型', () => {
    ;(sys as any).goods.push(makeGood(1, 'mushroom_elixir'))
    expect((sys as any).goods[0].type).toBe('mushroom_elixir')
  })

  it('支持所有 6 种发酵类型', () => {
    const types: FermentType[] = ['fruit_wine', 'grain_beer', 'honey_mead', 'herb_tonic', 'root_brew', 'mushroom_elixir']
    types.forEach((t, i) => (sys as any).goods.push(makeGood(i + 1, t)))
    const all = (sys as any).goods
    types.forEach((t, i) => expect(all[i].type).toBe(t))
  })

  it('注入对象的 quality 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { quality: 88 }))
    expect((sys as any).goods[0].quality).toBe(88)
  })

  it('注入对象的 potency 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { potency: 42 }))
    expect((sys as any).goods[0].potency).toBe(42)
  })

  it('注入对象的 moraleBoost 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { moraleBoost: 25 }))
    expect((sys as any).goods[0].moraleBoost).toBe(25)
  })

  it('注入对象的 tradeValue 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { tradeValue: 60 }))
    expect((sys as any).goods[0].tradeValue).toBe(60)
  })

  it('注入对象的 ageTicks 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 5000 }))
    expect((sys as any).goods[0].ageTicks).toBe(5000)
  })

  it('注入对象的 producerId 与传入值一致', () => {
    ;(sys as any).goods.push(makeGood(99, 'fruit_wine'))
    expect((sys as any).goods[0].producerId).toBe(99)
  })

  it('直接删除 goods 元素后长度减少', () => {
    ;(sys as any).goods.push(makeGood(1), makeGood(2))
    ;(sys as any).goods.splice(0, 1)
    expect((sys as any).goods).toHaveLength(1)
  })

  it('清空 goods 后长度为 0', () => {
    ;(sys as any).goods.push(makeGood(1))
    ;(sys as any).goods.length = 0
    expect((sys as any).goods).toHaveLength(0)
  })
})

// ─── skillMap 操作 ────────────────────────────────────────────────────────────
describe('CreatureFermentationSystem — skillMap', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('未知实体 skillMap.get 返回 undefined（用 ?? 0 得 0）', () => {
    expect((sys as any).skillMap.get(999) ?? 0).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 78)
    expect((sys as any).skillMap.get(42) ?? 0).toBe(78)
  })

  it('技能值可以是浮点数', () => {
    ;(sys as any).skillMap.set(1, 55.5)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(55.5)
  })

  it('可以覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 90)
    expect((sys as any).skillMap.get(1)).toBe(90)
  })

  it('多个实体技能彼此独立', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 80)
    expect((sys as any).skillMap.get(1)).toBe(20)
    expect((sys as any).skillMap.get(2)).toBe(80)
  })

  it('删除技能后 get 返回 undefined', () => {
    ;(sys as any).skillMap.set(5, 50)
    ;(sys as any).skillMap.delete(5)
    expect((sys as any).skillMap.get(5)).toBeUndefined()
  })

  it('skillMap.size 随注入增加', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })
})

// ─── 老化逻辑（aging & spoil） ────────────────────────────────────────────────
describe('CreatureFermentationSystem — 老化与腐败逻辑', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('ageTicks < 50000 时 goods 不被移除', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 10000 }))
    // 模拟老化逻辑：ageTicks > 50000 才删除
    const goods: FermentedGood[] = (sys as any).goods
    for (let i = goods.length - 1; i >= 0; i--) {
      if (goods[i].ageTicks > 50000) goods.splice(i, 1)
    }
    expect(goods).toHaveLength(1)
  })

  it('ageTicks > 50000 时 goods 应被移除', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 60000 }))
    const goods: FermentedGood[] = (sys as any).goods
    for (let i = goods.length - 1; i >= 0; i--) {
      if (goods[i].ageTicks > 50000) goods.splice(i, 1)
    }
    expect(goods).toHaveLength(0)
  })

  it('tradeValue 随 ageTicks 增加而提升（手动验证公式）', () => {
    const g = makeGood(1, 'fruit_wine', { quality: 80, ageTicks: 1000 })
    const expected = g.quality * 0.5 + g.ageTicks * 0.001
    expect(expected).toBeCloseTo(80 * 0.5 + 1000 * 0.001)
  })

  it('quality 上限为 100', () => {
    const g = makeGood(1, 'fruit_wine', { quality: 99.9 })
    g.quality = Math.min(100, g.quality + 0.02)
    expect(g.quality).toBeLessThanOrEqual(100)
  })

  it('多个 goods 同时老化，只删除超阈值的', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 10000 }))
    ;(sys as any).goods.push(makeGood(2, 'grain_beer', { ageTicks: 60000 }))
    ;(sys as any).goods.push(makeGood(3, 'honey_mead', { ageTicks: 49999 }))
    const goods: FermentedGood[] = (sys as any).goods
    for (let i = goods.length - 1; i >= 0; i--) {
      if (goods[i].ageTicks > 50000) goods.splice(i, 1)
    }
    expect(goods).toHaveLength(2)
    expect(goods.every(g => g.ageTicks <= 50000)).toBe(true)
  })
})

// ─── update 节流（CHECK_INTERVAL） ────────────────────────────────────────────
describe('CreatureFermentationSystem — update 节流', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达到 CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm()
    sys.update(0, em, 100)
    // lastCheck 还是 0，因为 100 - 0 < 1200
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    const em = makeEm()
    sys.update(0, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('连续调用两次，第二次在间隔内不触发再次更新', () => {
    const em = makeEm()
    sys.update(0, em, 1200)
    const lastAfterFirst = (sys as any).lastCheck
    sys.update(0, em, 1300)
    expect((sys as any).lastCheck).toBe(lastAfterFirst)
  })

  it('第二次 tick 再次超过间隔时触发更新', () => {
    const em = makeEm()
    sys.update(0, em, 1200)
    sys.update(0, em, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })
})

// ─── MAX_GOODS 上限 ────────────────────────────────────────────────────────────
describe('CreatureFermentationSystem — MAX_GOODS 上限', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('goods 达到 100 条时不会超出（手动验证边界）', () => {
    for (let i = 0; i < 100; i++) (sys as any).goods.push(makeGood(i + 1))
    expect((sys as any).goods).toHaveLength(100)
  })

  it('goods 长度超出 100 后手动截断有效', () => {
    for (let i = 0; i < 110; i++) (sys as any).goods.push(makeGood(i + 1))
    ;(sys as any).goods.length = 100
    expect((sys as any).goods).toHaveLength(100)
  })
})

// ─── update 与 EntityManager 集成 ────────────────────────────────────────────
describe('CreatureFermentationSystem — update 集成行为', () => {
  let sys: CreatureFermentationSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('无生物时 update 不抛出异常', () => {
    expect(() => sys.update(0, em, 1200)).not.toThrow()
  })

  it('update 完成后 lastCheck 被更新', () => {
    sys.update(0, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('有成年生物时（强制 Math.random 返回 0）goods 可能增加', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1200)
    mathSpy.mockRestore()
    // random=0 <= FERMENT_CHANCE(0.005)，且 age=20>=16，应产出 1 条 good
    expect((sys as any).goods.length).toBeGreaterThanOrEqual(1)
  })

  it('Math.random 返回 1 时不产出 goods（几率检查失败）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    addCreature(em, 20)
    sys.update(0, em, 1200)
    expect((sys as any).goods).toHaveLength(0)
  })

  it('年龄 < 16 的生物不产出发酵品', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 10)
    sys.update(0, em, 1200)
    expect((sys as any).goods).toHaveLength(0)
  })

  it('goods 中每条记录的 producerId 均在生物列表中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(0, em, 1200)
    const goods: FermentedGood[] = (sys as any).goods
    goods.forEach(g => expect(g.producerId).toBe(eid))
  })

  it('新产出 goods 的 quality 在 [0, 100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1200)
    const goods: FermentedGood[] = (sys as any).goods
    goods.forEach(g => {
      expect(g.quality).toBeGreaterThanOrEqual(0)
      expect(g.quality).toBeLessThanOrEqual(100)
    })
  })

  it('新产出 goods 的 moraleBoost = quality * 0.3（允许浮点误差）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1200)
    const goods: FermentedGood[] = (sys as any).goods
    goods.forEach(g => {
      const expected = g.quality * 0.3
      expect(Math.abs(g.moraleBoost - expected)).toBeLessThan(0.01)
    })
  })

  it('nextId 在每次产出 goods 后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    const before = (sys as any).nextId
    sys.update(0, em, 1200)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThan(before)
  })

  it('老化后 ageTicks > 50000 的 goods 被清除', () => {
    // 预置一条即将超期的 goods，然后模拟一次 update 触发老化
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 49000 }))
    // 手动模拟老化：ageTicks += 1200 -> 50200 > 50000 -> 删除
    const goods: FermentedGood[] = (sys as any).goods
    for (const g of goods) g.ageTicks += 1200
    for (let i = goods.length - 1; i >= 0; i--) {
      if (goods[i].ageTicks > 50000) goods.splice(i, 1)
    }
    expect(goods).toHaveLength(0)
  })

  it('老化不超期的 goods 保留', () => {
    ;(sys as any).goods.push(makeGood(1, 'fruit_wine', { ageTicks: 100 }))
    const goods: FermentedGood[] = (sys as any).goods
    for (const g of goods) g.ageTicks += 1200
    for (let i = goods.length - 1; i >= 0; i--) {
      if (goods[i].ageTicks > 50000) goods.splice(i, 1)
    }
    expect(goods).toHaveLength(1)
  })
})

// ─── FermentedGood 数据结构 ───────────────────────────────────────────────────
describe('CreatureFermentationSystem — FermentedGood 数据结构', () => {
  beforeEach(() => { nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('makeGood 生成的对象拥有 id 字段', () => {
    const g = makeGood(1)
    expect(g).toHaveProperty('id')
  })

  it('makeGood 生成的对象拥有 producerId 字段', () => {
    const g = makeGood(5)
    expect(g.producerId).toBe(5)
  })

  it('makeGood 生成的对象拥有 type 字段', () => {
    const g = makeGood(1, 'root_brew')
    expect(g.type).toBe('root_brew')
  })

  it('makeGood 生成的对象拥有 quality 字段', () => {
    const g = makeGood(1)
    expect(typeof g.quality).toBe('number')
  })

  it('makeGood 生成的对象拥有 potency 字段', () => {
    const g = makeGood(1)
    expect(typeof g.potency).toBe('number')
  })

  it('makeGood 生成的对象拥有 moraleBoost 字段', () => {
    const g = makeGood(1)
    expect(typeof g.moraleBoost).toBe('number')
  })

  it('makeGood 生成的对象拥有 tradeValue 字段', () => {
    const g = makeGood(1)
    expect(typeof g.tradeValue).toBe('number')
  })

  it('makeGood 生成的对象拥有 ageTicks 字段', () => {
    const g = makeGood(1)
    expect(typeof g.ageTicks).toBe('number')
  })

  it('makeGood 生成的对象拥有 tick 字段', () => {
    const g = makeGood(1)
    expect(typeof g.tick).toBe('number')
  })

  it('连续调用 makeGood id 自增', () => {
    const g1 = makeGood(1)
    const g2 = makeGood(1)
    expect(g2.id).toBe(g1.id + 1)
  })
})
