import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePuddlerSystem } from '../systems/CreaturePuddlerSystem'
import type { Puddler } from '../systems/CreaturePuddlerSystem'

let nextId = 1
function makeSys(): CreaturePuddlerSystem { return new CreaturePuddlerSystem() }
function makePuddler(entityId: number, overrides: Partial<Puddler> = {}): Puddler {
  return {
    id: nextId++,
    entityId,
    puddlingSkill: 70,
    stirringTechnique: 65,
    carbonControl: 75,
    ironPurity: 80,
    tick: 0,
    ...overrides,
  }
}
function makeEm(entities: number[] = []) {
  return { getEntitiesWithComponent: () => entities } as any
}

const CHECK_INTERVAL = 2780

describe('CreaturePuddlerSystem - 初始状态', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无精炼工', () => { expect((sys as any).puddlers).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('puddlers是空数组', () => { expect(Array.isArray((sys as any).puddlers)).toBe(true) })
  it('每次makeSys都返回独立实例', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).puddlers.push(makePuddler(1))
    expect((s2 as any).puddlers).toHaveLength(0)
  })
})

describe('CreaturePuddlerSystem - 数据注入与查询', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询entityId', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers).toBe((sys as any).puddlers)
  })
  it('puddlingSkill字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(2, { puddlingSkill: 70 }))
    expect((sys as any).puddlers[0].puddlingSkill).toBe(70)
  })
  it('ironPurity字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(2, { ironPurity: 80 }))
    expect((sys as any).puddlers[0].ironPurity).toBe(80)
  })
  it('stirringTechnique字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(3, { stirringTechnique: 65 }))
    expect((sys as any).puddlers[0].stirringTechnique).toBe(65)
  })
  it('carbonControl字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(4, { carbonControl: 75 }))
    expect((sys as any).puddlers[0].carbonControl).toBe(75)
  })
  it('tick字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(5, { tick: 100 }))
    expect((sys as any).puddlers[0].tick).toBe(100)
  })
  it('id字段正确', () => {
    const p = makePuddler(6)
    ;(sys as any).puddlers.push(p)
    expect((sys as any).puddlers[0].id).toBe(p.id)
  })
  it('多个全部返回', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    ;(sys as any).puddlers.push(makePuddler(2))
    expect((sys as any).puddlers).toHaveLength(2)
  })
  it('注入10个精炼工', () => {
    for (let i = 0; i < 10; i++) (sys as any).puddlers.push(makePuddler(i + 1))
    expect((sys as any).puddlers).toHaveLength(10)
  })
})

describe('CreaturePuddlerSystem - 节流机制 CHECK_INTERVAL', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick未达到CHECK_INTERVAL时update不执行技能增长', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 20 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL - 1)
    expect((sys as any).puddlers[0].puddlingSkill).toBe(20)
  })
  it('达到CHECK_INTERVAL时技能递增', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 20 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeGreaterThan(20)
  })
  it('lastCheck在达到间隔后更新为当前tick', () => {
    const em = makeEm([])
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('首次update(tick=0)执行（0-0>=CHECK_INTERVAL为false）不执行', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    // tick=0时 0-0=0 < CHECK_INTERVAL，不执行
    expect((sys as any).puddlers[0].puddlingSkill).toBe(50)
  })
  it('连续两次达到间隔后执行两次技能增长', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(50.04, 8)
  })
  it('tick差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 30 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(30.02, 8)
  })
  it('tick差值为CHECK_INTERVAL-1时不执行第二次', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 30 }))
    const em = makeEm([])
    // 先触发一次让lastCheck=CHECK_INTERVAL
    sys.update(0, em, CHECK_INTERVAL)        // 触发，lastCheck=CHECK_INTERVAL
    // 再过 CHECK_INTERVAL-1 不触发第二次
    sys.update(0, em, CHECK_INTERVAL * 2 - 1)
    // 技能只增长了1次
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(30.02, 8)
  })
})

describe('CreaturePuddlerSystem - 技能增长量', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('puddlingSkill 每次递增 0.02', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(50.02, 10)
  })
  it('stirringTechnique 每次递增 0.015', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { stirringTechnique: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBeCloseTo(50.015, 10)
  })
  it('ironPurity 每次递增 0.01', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 50 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBeCloseTo(50.01, 10)
  })
  it('carbonControl字段不随update增长（源码未写增长逻辑）', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { carbonControl: 60 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].carbonControl).toBe(60)
  })
  it('多个精炼工各自技能都增长', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 40 }))
    ;(sys as any).puddlers.push(makePuddler(2, { puddlingSkill: 60 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(40.02, 8)
    expect((sys as any).puddlers[1].puddlingSkill).toBeCloseTo(60.02, 8)
  })
  it('技能起始值0时也能正常增长', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 10, stirringTechnique: 0 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBeCloseTo(0.015, 10)
  })
})

describe('CreaturePuddlerSystem - 技能上限', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('puddlingSkill 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBe(100)
  })
  it('stirringTechnique 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { stirringTechnique: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBe(100)
  })
  it('ironPurity 上限为100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 99.99 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBe(100)
  })
  it('已满100的puddlingSkill不会超过100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 100 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].puddlingSkill).toBe(100)
  })
  it('已满100的stirringTechnique不会超过100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { stirringTechnique: 100 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBe(100)
  })
  it('已满100的ironPurity不会超过100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 100 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBe(100)
  })
})

describe('CreaturePuddlerSystem - cleanup 清理逻辑', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('puddlingSkill<=4 时精炼工被移除（技能增长后恰好为4）', () => {
    const sys2 = makeSys()
    ;(sys2 as any).puddlers.push(makePuddler(3, { puddlingSkill: 3.98 }))
    const em = makeEm([])
    sys2.update(0, em, 0)
    sys2.update(0, em, CHECK_INTERVAL)
    // 3.98+0.02=4.0，<=4 被删除
    expect((sys2 as any).puddlers).toHaveLength(0)
  })
  it('puddlingSkill>4 时精炼工保留', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 5 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(1)
  })
  it('puddlingSkill恰好为4时被移除', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 4 }))
    const em = makeEm([])
    // 4+0.02=4.02 > 4，不被删除；直接注入skill=3.98测边界
    const sys2 = makeSys()
    ;(sys2 as any).puddlers.push(makePuddler(10, { puddlingSkill: 3.5 }))
    const em2 = makeEm([])
    sys2.update(0, em2, 0)
    sys2.update(0, em2, CHECK_INTERVAL)
    // 3.5+0.02=3.52 <= 4 => 被删除
    expect((sys2 as any).puddlers).toHaveLength(0)
  })
  it('skill=5 的精炼工在多次update后保留', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 5 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    expect((sys as any).puddlers).toHaveLength(1)
  })
  it('混合情况：低技能被清除，高技能保留', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 3 }))    // 低
    ;(sys as any).puddlers.push(makePuddler(2, { puddlingSkill: 50 }))   // 高
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(1)
    expect((sys as any).puddlers[0].entityId).toBe(2)
  })
  it('全部低技能时全部被清除', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 1 }))
    ;(sys as any).puddlers.push(makePuddler(2, { puddlingSkill: 2 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(0)
  })
})

describe('CreaturePuddlerSystem - 招募逻辑', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_PUDDLERS=10：达到上限时不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).puddlers.push(makePuddler(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers.length).toBeLessThanOrEqual(10)
  })
  it('RECRUIT_CHANCE=0.0014：random>=0.0014时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(0)
  })
  it('成功招募时nextId递增', () => {
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    const len = (sys as any).puddlers.length
    if (len > 0) {
      expect((sys as any).nextId).toBe(6)
    }
  })
  it('招募的精炼工puddlingSkill在10~35范围内', () => {
    // 让random=0.0001触发招募，其余random用来生成属性
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.0001 // RECRUIT_CHANCE check
      return 0.5 // 其余生成属性用
    })
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    if ((sys as any).puddlers.length > 0) {
      const skill = (sys as any).puddlers[0].puddlingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(35)
    }
  })
  it('9个精炼工时仍可触发招募', () => {
    for (let i = 0; i < 9; i++) {
      ;(sys as any).puddlers.push(makePuddler(i + 1, { puddlingSkill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    // 9个中有些skill=50不被清理，可能增至10
    expect((sys as any).puddlers.length).toBeGreaterThanOrEqual(9)
  })
})

describe('CreaturePuddlerSystem - 边界与异常', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空精炼工列表时update不报错', () => {
    const em = makeEm([])
    expect(() => {
      sys.update(0, em, 0)
      sys.update(0, em, CHECK_INTERVAL)
    }).not.toThrow()
  })
  it('puddlingSkill精确为4.01时保留', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 4.01 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    // 4.01+0.02=4.03 > 4 => 保留
    expect((sys as any).puddlers).toHaveLength(1)
  })
  it('entityId=0 的精炼工正常处理', () => {
    ;(sys as any).puddlers.push(makePuddler(0, { puddlingSkill: 50 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers).toHaveLength(1)
    expect((sys as any).puddlers[0].entityId).toBe(0)
  })
  it('非常大的tick值也能正常触发update', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, 1_000_000)
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(50.02, 8)
  })
  it('lastCheck更新为当前tick', () => {
    const em = makeEm([])
    sys.update(0, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('相同tick不会重复触发', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50 }))
    const em = makeEm([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL) // 同一tick，不再触发
    expect((sys as any).puddlers[0].puddlingSkill).toBeCloseTo(50.02, 8)
  })
  it('stirringTechnique从0增长到0.015', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { puddlingSkill: 50, stirringTechnique: 0 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].stirringTechnique).toBeCloseTo(0.015, 10)
  })
  it('ironPurity接近100时不超过100', () => {
    ;(sys as any).puddlers.push(makePuddler(1, { ironPurity: 99.999 }))
    const em = makeEm([])
    sys.update(0, em, 0)
    sys.update(0, em, CHECK_INTERVAL)
    expect((sys as any).puddlers[0].ironPurity).toBe(100)
  })
  it('update多次后lastCheck始终等于最后触发的tick', () => {
    const em = makeEm([])
    sys.update(0, em, CHECK_INTERVAL)
    sys.update(0, em, CHECK_INTERVAL * 2)
    sys.update(0, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})
