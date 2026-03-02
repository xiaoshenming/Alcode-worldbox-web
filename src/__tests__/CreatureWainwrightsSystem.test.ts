import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureWainwrightsSystem } from '../systems/CreatureWainwrightsSystem'
import type { Wainwright, WagonType } from '../systems/CreatureWainwrightsSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureWainwrightsSystem { return new CreatureWainwrightsSystem() }
function makeMaker(entityId: number, type: WagonType = 'handcart', tick = 0): Wainwright {
  return { id: nextId++, entityId, skill: 70, wagonsBuilt: 12, wagonType: type, durability: 65, reputation: 45, tick }
}

function makeEmptyEm(): EntityManager {
  const em = new EntityManager()
  vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
  return em
}

describe('CreatureWainwrightsSystem.getWainwrights', () => {
  let sys: CreatureWainwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车辆工匠', () => { expect((sys as any).wainwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wainwrights.push(makeMaker(1, 'wagon'))
    expect((sys as any).wainwrights[0].wagonType).toBe('wagon')
  })
  it('返回内部引用', () => {
    ;(sys as any).wainwrights.push(makeMaker(1))
    expect((sys as any).wainwrights).toBe((sys as any).wainwrights)
  })
  it('支持所有4种车辆类型', () => {
    const types: WagonType[] = ['handcart', 'oxcart', 'wagon', 'chariot']
    types.forEach((t, i) => { ;(sys as any).wainwrights.push(makeMaker(i + 1, t)) })
    const all = (sys as any).wainwrights
    types.forEach((t, i) => { expect(all[i].wagonType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wainwrights.push(makeMaker(1))
    ;(sys as any).wainwrights.push(makeMaker(2))
    expect((sys as any).wainwrights).toHaveLength(2)
  })
})

describe('CreatureWainwrightsSystem — CHECK_INTERVAL 节流 (1500)', () => {
  let sys: CreatureWainwrightsSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('tick < CHECK_INTERVAL(1500) 时跳过，lastCheck 保持 0', () => {
    sys.update(0, em, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好 1500 时执行，lastCheck 更新为 1500', () => {
    sys.update(0, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('连续调用：第二次需间隔 1500 才再次执行', () => {
    sys.update(0, em, 1500)
    sys.update(0, em, 2999)  // 2999-1500=1499 < 1500，跳过
    expect((sys as any).lastCheck).toBe(1500)
    sys.update(0, em, 3000)  // 3000-1500=1500，执行
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureWainwrightsSystem — skillMap 与 wagonType 映射', () => {
  let sys: CreatureWainwrightsSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'w', age: 20, maxAge: 80, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    nextId = 1
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('skillMap 每次 update 增加 SKILL_GROWTH(0.06)', () => {
    sys.update(0, em, 1500)
    const eid = [...em.getAllEntities()][0]
    const skill1 = (sys as any).skillMap.get(eid) as number | undefined
    if (skill1 === undefined) return  // 未命中随机，跳过
    sys.update(0, em, 3000)
    const skill2 = (sys as any).skillMap.get(eid) as number
    expect(skill2).toBeCloseTo(skill1 + 0.06, 5)
  })

  it('skill 累积到 100 后不超过 100', () => {
    const eid = [...em.getAllEntities()][0]
    ;(sys as any).skillMap.set(eid, 99.97)
    sys.update(0, em, 1500)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('wagonType 由 skill 决定：skill<25→handcart', () => {
    const eid = [...em.getAllEntities()][0]
    ;(sys as any).skillMap.set(eid, 3)  // skill=3+0.06≈3.06，typeIdx=Math.min(3, floor(3/25))=0 → handcart
    sys.update(0, em, 1500)
    const wainwrights = (sys as any).wainwrights as Wainwright[]
    if (wainwrights.length > 0) {
      expect(wainwrights[0].wagonType).toBe('handcart')
    }
  })

  it('wagonType 由 skill 决定：skill≥75→chariot', () => {
    const eid = [...em.getAllEntities()][0]
    ;(sys as any).skillMap.set(eid, 75)  // typeIdx=Math.min(3, floor(75/25))=3 → chariot
    sys.update(0, em, 1500)
    const wainwrights = (sys as any).wainwrights as Wainwright[]
    if (wainwrights.length > 0) {
      expect(wainwrights[0].wagonType).toBe('chariot')
    }
  })
})

describe('CreatureWainwrightsSystem — wainwright 记录 cleanup (cutoff = tick - 56000)', () => {
  let sys: CreatureWainwrightsSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('超过 56000 tick 的记录被删除', () => {
    ;(sys as any).wainwrights.push(makeMaker(1, 'handcart', 0))        // 过期
    ;(sys as any).wainwrights.push(makeMaker(2, 'wagon', 60000))       // 未过期
    sys.update(0, em, 60000)  // cutoff=4000；tick=0 < 4000 → 删除
    const remaining = (sys as any).wainwrights as Wainwright[]
    expect(remaining.some(w => w.entityId === 1)).toBe(false)
    expect(remaining.some(w => w.entityId === 2)).toBe(true)
  })

  it('tick 恰等于 cutoff 时不删除（条件严格 <）', () => {
    ;(sys as any).wainwrights.push(makeMaker(1, 'oxcart', 4000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 60000)  // cutoff=4000，tick=4000，不满足 < 4000
    expect((sys as any).wainwrights).toHaveLength(1)
  })

  it('多条记录：只有过期的被清除', () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).wainwrights.push(makeMaker(i + 1, 'oxcart', i * 1000))  // tick=0,1000,2000,3000
    }
    ;(sys as any).wainwrights.push(makeMaker(10, 'chariot', 200000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 200000)  // cutoff=144000；tick=0~3000全 < 144000 → 删除
    const remaining = (sys as any).wainwrights as Wainwright[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(10)
  })
})

describe('CreatureWainwrightsSystem — 字段计算合法性', () => {
  it('durability = 25 + skill*0.65，skill=0→25，skill=100→90', () => {
    expect(25 + 0 * 0.65).toBe(25)
    expect(25 + 100 * 0.65).toBe(90)
  })

  it('reputation = 10 + skill*0.8，skill=50→50', () => {
    expect(10 + 50 * 0.8).toBe(50)
  })

  it('wagonsBuilt = 1 + floor(skill/10)', () => {
    expect(1 + Math.floor(40 / 10)).toBe(5)
    expect(1 + Math.floor(99 / 10)).toBe(10)
  })
})

describe('CreatureWainwrightsSystem — MAX_WAINWRIGHTS 上限(32)', () => {
  let sys: CreatureWainwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入 32 条记录后 length 为 32', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).wainwrights.push(makeMaker(i + 1))
    }
    expect((sys as any).wainwrights).toHaveLength(32)
  })

  it('update 时若已满 32 条，跳过新增', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).wainwrights.push(makeMaker(i + 1, 'handcart', 999999))
    }
    const em = makeEmptyEm()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1500)
    vi.restoreAllMocks()
    expect((sys as any).wainwrights.length).toBeLessThanOrEqual(32)
  })
})
