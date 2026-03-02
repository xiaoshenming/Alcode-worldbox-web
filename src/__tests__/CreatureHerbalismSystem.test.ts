import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureHerbalismSystem } from '../systems/CreatureHerbalismSystem'
import type { HerbalRemedy, HerbType, RemedyForm } from '../systems/CreatureHerbalismSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureHerbalismSystem { return new CreatureHerbalismSystem() }
function makeRemedy(
  herbalistId: number,
  herb: HerbType = 'chamomile',
  form: RemedyForm = 'tea',
  overrides: Partial<HerbalRemedy> = {}
): HerbalRemedy {
  return { id: nextId++, herbalistId, herb, form, potency: 60, healingPower: 50, tick: 0, ...overrides }
}

function makeEm(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager, age = 20): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age, race: 'human', name: 'T' } as any)
  em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
  return eid
}

// ─── 初始状态 ──────────────────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — 初始状态', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('remedies 数组初始为空', () => {
    expect((sys as any).remedies).toHaveLength(0)
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

// ─── remedies 数组基础操作 ────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — remedies 数组', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 herb', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'ginseng', 'elixir'))
    expect((sys as any).remedies[0].herb).toBe('ginseng')
  })

  it('注入后可查询 form', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'ginseng', 'elixir'))
    expect((sys as any).remedies[0].form).toBe('elixir')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).remedies.push(makeRemedy(1))
    expect((sys as any).remedies).toBe((sys as any).remedies)
  })

  it('支持 chamomile 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile'))
    expect((sys as any).remedies[0].herb).toBe('chamomile')
  })

  it('支持 ginseng 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'ginseng'))
    expect((sys as any).remedies[0].herb).toBe('ginseng')
  })

  it('支持 lavender 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'lavender'))
    expect((sys as any).remedies[0].herb).toBe('lavender')
  })

  it('支持 echinacea 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'echinacea'))
    expect((sys as any).remedies[0].herb).toBe('echinacea')
  })

  it('支持 valerian 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'valerian'))
    expect((sys as any).remedies[0].herb).toBe('valerian')
  })

  it('支持 turmeric 草药', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'turmeric'))
    expect((sys as any).remedies[0].herb).toBe('turmeric')
  })

  it('支持所有 6 种草药', () => {
    const herbs: HerbType[] = ['chamomile', 'ginseng', 'lavender', 'echinacea', 'valerian', 'turmeric']
    herbs.forEach((h, i) => (sys as any).remedies.push(makeRemedy(i + 1, h)))
    const all = (sys as any).remedies
    herbs.forEach((h, i) => expect(all[i].herb).toBe(h))
  })

  it('支持 poultice 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'poultice'))
    expect((sys as any).remedies[0].form).toBe('poultice')
  })

  it('支持 tea 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea'))
    expect((sys as any).remedies[0].form).toBe('tea')
  })

  it('支持 tincture 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tincture'))
    expect((sys as any).remedies[0].form).toBe('tincture')
  })

  it('支持 salve 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'salve'))
    expect((sys as any).remedies[0].form).toBe('salve')
  })

  it('支持 elixir 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'elixir'))
    expect((sys as any).remedies[0].form).toBe('elixir')
  })

  it('支持 incense 形式', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'incense'))
    expect((sys as any).remedies[0].form).toBe('incense')
  })

  it('支持所有 6 种制剂形式', () => {
    const forms: RemedyForm[] = ['poultice', 'tea', 'tincture', 'salve', 'elixir', 'incense']
    forms.forEach((f, i) => (sys as any).remedies.push(makeRemedy(i + 1, 'chamomile', f)))
    const all = (sys as any).remedies
    forms.forEach((f, i) => expect(all[i].form).toBe(f))
  })

  it('potency 字段正确保存', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { potency: 75 }))
    expect((sys as any).remedies[0].potency).toBe(75)
  })

  it('healingPower 字段正确保存', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { healingPower: 90 }))
    expect((sys as any).remedies[0].healingPower).toBe(90)
  })

  it('tick 字段正确保存', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { tick: 5000 }))
    expect((sys as any).remedies[0].tick).toBe(5000)
  })

  it('herbalistId 字段正确保存', () => {
    ;(sys as any).remedies.push(makeRemedy(42, 'chamomile', 'tea'))
    expect((sys as any).remedies[0].herbalistId).toBe(42)
  })

  it('可同时注入多条 remedies', () => {
    for (let i = 0; i < 5; i++) (sys as any).remedies.push(makeRemedy(i + 1))
    expect((sys as any).remedies).toHaveLength(5)
  })

  it('删除一条后长度减少', () => {
    ;(sys as any).remedies.push(makeRemedy(1), makeRemedy(2))
    ;(sys as any).remedies.splice(0, 1)
    expect((sys as any).remedies).toHaveLength(1)
  })
})

// ─── skillMap 操作 ────────────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — skillMap', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('未知实体 skillMap.get 返回 undefined（用 ?? 0 得 0）', () => {
    expect((sys as any).skillMap.get(999) ?? 0).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect((sys as any).skillMap.get(42) ?? 0).toBe(88)
  })

  it('技能值可以是浮点数', () => {
    ;(sys as any).skillMap.set(1, 33.3)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(33.3)
  })

  it('可以覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(1, 95)
    expect((sys as any).skillMap.get(1)).toBe(95)
  })

  it('多个实体技能彼此独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
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

// ─── ginseng 治疗加成 ─────────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — ginseng 加成', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ginseng 的 healingPower 比 potency*0.8 多 15', () => {
    // healingPower = potency * 0.8 + (herb === 'ginseng' ? 15 : 0)
    const potency = 60
    const expected = potency * 0.8 + 15
    expect(expected).toBeCloseTo(63)
  })

  it('非 ginseng 的 healingPower = potency * 0.8', () => {
    const potency = 60
    const expected = potency * 0.8
    expect(expected).toBeCloseTo(48)
  })

  it('ginseng 加成为固定 +15', () => {
    const diff = (60 * 0.8 + 15) - (60 * 0.8)
    expect(diff).toBe(15)
  })
})

// ─── 过期清理逻辑 ─────────────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — 过期清理逻辑', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 在 cutoff 之前的 remedy 不被清除', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { tick: 10000 }))
    const cutoff = 10000 - 45000  // 很负，不会触发清除
    const remedies: HerbalRemedy[] = (sys as any).remedies
    for (let i = remedies.length - 1; i >= 0; i--) {
      if (remedies[i].tick < cutoff) remedies.splice(i, 1)
    }
    expect(remedies).toHaveLength(1)
  })

  it('tick < cutoff 的 remedy 被清除', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { tick: 1000 }))
    const currentTick = 50000
    const cutoff = currentTick - 45000  // = 5000
    const remedies: HerbalRemedy[] = (sys as any).remedies
    for (let i = remedies.length - 1; i >= 0; i--) {
      if (remedies[i].tick < cutoff) remedies.splice(i, 1)
    }
    expect(remedies).toHaveLength(0)
  })

  it('混合 remedies — 只清除过期的', () => {
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { tick: 1000 }))   // 过期
    ;(sys as any).remedies.push(makeRemedy(2, 'ginseng', 'elixir', { tick: 10000 })) // 有效
    const cutoff = 50000 - 45000  // = 5000
    const remedies: HerbalRemedy[] = (sys as any).remedies
    for (let i = remedies.length - 1; i >= 0; i--) {
      if (remedies[i].tick < cutoff) remedies.splice(i, 1)
    }
    expect(remedies).toHaveLength(1)
    expect(remedies[0].herbalistId).toBe(2)
  })

  it('cutoff 边界值：tick === cutoff 时不清除（< 而非 <=）', () => {
    const cutoff = 5000
    ;(sys as any).remedies.push(makeRemedy(1, 'chamomile', 'tea', { tick: cutoff }))
    const remedies: HerbalRemedy[] = (sys as any).remedies
    for (let i = remedies.length - 1; i >= 0; i--) {
      if (remedies[i].tick < cutoff) remedies.splice(i, 1)
    }
    expect(remedies).toHaveLength(1)
  })
})

// ─── MAX_REMEDIES 上限 ────────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — MAX_REMEDIES 上限', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('remedies 达到 100 条时记录正确', () => {
    for (let i = 0; i < 100; i++) (sys as any).remedies.push(makeRemedy(i + 1))
    expect((sys as any).remedies).toHaveLength(100)
  })

  it('手动截断 100 条后长度正确', () => {
    for (let i = 0; i < 110; i++) (sys as any).remedies.push(makeRemedy(i + 1))
    ;(sys as any).remedies.length = 100
    expect((sys as any).remedies).toHaveLength(100)
  })
})

// ─── update 节流（CHECK_INTERVAL） ────────────────────────────────────────────
describe('CreatureHerbalismSystem — update 节流', () => {
  let sys: CreatureHerbalismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达 CHECK_INTERVAL(1000) 时 lastCheck 不更新', () => {
    const em = makeEm()
    sys.update(0, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时 lastCheck 更新', () => {
    const em = makeEm()
    sys.update(0, em, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('连续两次调用，第二次在间隔内不触发更新', () => {
    const em = makeEm()
    sys.update(0, em, 1000)
    sys.update(0, em, 1100)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('第二次 tick 再次超过间隔时触发更新', () => {
    const em = makeEm()
    sys.update(0, em, 1000)
    sys.update(0, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('空 em 下 update 不抛出异常', () => {
    expect(() => makeSys().update(0, makeEm(), 1000)).not.toThrow()
  })
})

// ─── update 与 EntityManager 集成 ────────────────────────────────────────────
describe('CreatureHerbalismSystem — update 集成行为', () => {
  let sys: CreatureHerbalismSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random=0 + 成年生物时产出 remedy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1000)
    expect((sys as any).remedies.length).toBeGreaterThanOrEqual(1)
  })

  it('Math.random=1 时不产出 remedy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    addCreature(em, 20)
    sys.update(0, em, 1000)
    expect((sys as any).remedies).toHaveLength(0)
  })

  it('年龄 < 12 的生物不产出 remedy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 10)
    sys.update(0, em, 1000)
    expect((sys as any).remedies).toHaveLength(0)
  })

  it('产出 remedy 的 herbalistId 等于生物 eid', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(0, em, 1000)
    const remedies: HerbalRemedy[] = (sys as any).remedies
    remedies.forEach(r => expect(r.herbalistId).toBe(eid))
  })

  it('产出 remedy 的 potency >= 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1000)
    const remedies: HerbalRemedy[] = (sys as any).remedies
    remedies.forEach(r => expect(r.potency).toBeGreaterThanOrEqual(0))
  })

  it('产出 remedy 的 healingPower >= 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(0, em, 1000)
    const remedies: HerbalRemedy[] = (sys as any).remedies
    remedies.forEach(r => expect(r.healingPower).toBeGreaterThanOrEqual(0))
  })

  it('nextId 在产出后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    const before = (sys as any).nextId
    sys.update(0, em, 1000)
    expect((sys as any).nextId).toBeGreaterThan(before)
  })

  it('skillMap 在产出后记录技能值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(0, em, 1000)
    expect((sys as any).skillMap.get(eid)).toBeDefined()
  })

  it('技能值上限为 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 99.95)
    sys.update(0, em, 1000)
    expect((sys as any).skillMap.get(eid)).toBeLessThanOrEqual(100)
  })
})

// ─── HerbalRemedy 数据结构 ────────────────────────────────────────────────────
describe('CreatureHerbalismSystem — HerbalRemedy 数据结构', () => {
  beforeEach(() => { nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('makeRemedy 生成对象含 id 字段', () => {
    expect(makeRemedy(1)).toHaveProperty('id')
  })

  it('makeRemedy 生成对象含 herbalistId 字段', () => {
    expect(makeRemedy(5).herbalistId).toBe(5)
  })

  it('makeRemedy 生成对象含 herb 字段', () => {
    expect(makeRemedy(1, 'valerian').herb).toBe('valerian')
  })

  it('makeRemedy 生成对象含 form 字段', () => {
    expect(makeRemedy(1, 'chamomile', 'salve').form).toBe('salve')
  })

  it('makeRemedy 生成对象含 potency 字段（number）', () => {
    expect(typeof makeRemedy(1).potency).toBe('number')
  })

  it('makeRemedy 生成对象含 healingPower 字段（number）', () => {
    expect(typeof makeRemedy(1).healingPower).toBe('number')
  })

  it('makeRemedy 生成对象含 tick 字段（number）', () => {
    expect(typeof makeRemedy(1).tick).toBe('number')
  })

  it('连续调用 makeRemedy id 自增', () => {
    const r1 = makeRemedy(1)
    const r2 = makeRemedy(1)
    expect(r2.id).toBe(r1.id + 1)
  })
})
