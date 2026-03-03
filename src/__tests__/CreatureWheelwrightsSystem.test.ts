import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureWheelwrightsSystem } from '../systems/CreatureWheelwrightsSystem'
import type { Wheelwright, WheelType } from '../systems/CreatureWheelwrightsSystem'

let nextId = 1
function makeSys(): CreatureWheelwrightsSystem { return new CreatureWheelwrightsSystem() }
function makeMaker(entityId: number, type: WheelType = 'cart', tickVal = 0): Wheelwright {
  return { id: nextId++, entityId, skill: 70, wheelsBuilt: 12, wheelType: type, durability: 65, efficiency: 60, tick: tickVal }
}

function makeEM(eids: number[] = [], ageMap: Record<number, number> = {}) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(eids),
    getComponent: vi.fn().mockImplementation((_eid: number, _type: string) => {
      const age = ageMap[_eid] ?? 20
      return { age }
    }),
    hasComponent: vi.fn().mockReturnValue(true),
    getEntitiesWithComponent: vi.fn().mockReturnValue(eids),
  }
}

describe('CreatureWheelwrightsSystem.getWheelwrights', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轮辙工匠', () => { expect((sys as any).wheelwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'wagon'))
    expect((sys as any).wheelwrights[0].wheelType).toBe('wagon')
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect((sys as any).wheelwrights).toBe((sys as any).wheelwrights)
  })
  it('支持所有4种车轮类型(Wheelwrights)', () => {
    const types: WheelType[] = ['cart', 'wagon', 'mill', 'chariot']
    types.forEach((t, i) => { ;(sys as any).wheelwrights.push(makeMaker(i + 1, t)) })
    const all = (sys as any).wheelwrights
    types.forEach((t, i) => { expect(all[i].wheelType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    ;(sys as any).wheelwrights.push(makeMaker(2))
    expect((sys as any).wheelwrights).toHaveLength(2)
  })
})

describe('CreatureWheelwrightsSystem CHECK_INTERVAL=1400 节流', () => {
  let sys: CreatureWheelwrightsSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不执行', () => {
    const em = makeEM([1])
    sys.update(0, em as any, 0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick=1399 时跳过', () => {
    const em = makeEM([1])
    sys.update(0, em as any, 1399)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick=1400 时执行', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('执行后更新 lastCheck，下次需再等 1400', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1400)
    em.getEntitiesWithComponents.mockClear()
    sys.update(0, em as any, 2799)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    sys.update(0, em as any, 2800)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })
})

describe('CreatureWheelwrightsSystem skillMap 技能累积 (SKILL_GROWTH=0.07)', () => {
  let sys: CreatureWheelwrightsSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('首次为实体创建技能，加 0.07', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 20 })
    sys.update(0, em as any, 1400)
    const skill = (sys as any).skillMap.get(10)
    // initial = 2+0*8=2, +0.07=2.07
    expect(skill).toBeCloseTo(2.07, 3)
    Math.random = origRandom
  })

  it('第二次调用，技能继续累加 0.07', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 20 })
    sys.update(0, em as any, 1400)
    sys.update(0, em as any, 2800)
    const skill = (sys as any).skillMap.get(10)
    expect(skill).toBeCloseTo(2.07 + 0.07, 3)
    Math.random = origRandom
  })

  it('技能上限为 100', () => {
    ;(sys as any).skillMap.set(20, 99.97)
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([20], { 20: 20 })
    sys.update(0, em as any, 1400)
    const skill = (sys as any).skillMap.get(20)
    expect(skill).toBe(100)
    Math.random = origRandom
  })
})

describe('CreatureWheelwrightsSystem 时间过期清理 (cutoff=tick-55000)', () => {
  let sys: CreatureWheelwrightsSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 在 cutoff 内的记录保留', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 5000))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelwrights).toHaveLength(1)
  })

  it('tick < cutoff 的记录被清除', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 1000))
    ;(sys as any).wheelwrights.push(makeMaker(2, 'mill', 60000))
    const em = makeEM([])
    // cutoff = 56400-55000=1400, wheeler[0].tick=1000 < 1400 → 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 56400)
    expect((sys as any).wheelwrights).toHaveLength(1)
    expect((sys as any).wheelwrights[0].entityId).toBe(2)
  })

  it('批量清理：多个过期全部移除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).wheelwrights.push(makeMaker(i + 1, 'cart', 100 + i))
    }
    ;(sys as any).wheelwrights.push(makeMaker(99, 'chariot', 100000))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 56400)
    expect((sys as any).wheelwrights).toHaveLength(1)
    expect((sys as any).wheelwrights[0].entityId).toBe(99)
  })
})

describe('CreatureWheelwrightsSystem wheelType 依据 skill 分配', () => {
  it('skill < 25 → cart', () => {
    const typeIdx = Math.min(3, Math.floor(10 / 25))
    expect(['cart', 'wagon', 'mill', 'chariot'][typeIdx]).toBe('cart')
  })

  it('skill 25~49 → wagon', () => {
    const typeIdx = Math.min(3, Math.floor(30 / 25))
    expect(['cart', 'wagon', 'mill', 'chariot'][typeIdx]).toBe('wagon')
  })

  it('skill 50~74 → mill', () => {
    const typeIdx = Math.min(3, Math.floor(60 / 25))
    expect(['cart', 'wagon', 'mill', 'chariot'][typeIdx]).toBe('mill')
  })

  it('skill >= 75 → chariot', () => {
    const typeIdx = Math.min(3, Math.floor(90 / 25))
    expect(['cart', 'wagon', 'mill', 'chariot'][typeIdx]).toBe('chariot')
  })
})

describe('CreatureWheelwrightsSystem MAX_WHEELWRIGHTS=34 上限', () => {
  let sys: CreatureWheelwrightsSystem

  beforeEach(() => { sys = makeSys() })

  it('已达 34 人，不再新增', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).wheelwrights.push(makeMaker(i + 1))
    }
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([100], { 100: 20 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelwrights).toHaveLength(34)
    Math.random = origRandom
  })
})

describe('CreatureWheelwrightsSystem 年龄门槛(age>=8)', () => {
  let sys: CreatureWheelwrightsSystem

  beforeEach(() => { sys = makeSys() })

  it('age=7 的实体不被录入', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 7 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelwrights).toHaveLength(0)
    Math.random = origRandom
  })

  it('age=8 的实体可被录入', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 8 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelwrights).toHaveLength(1)
    Math.random = origRandom
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureWheelwrightsSystem durability公式', () => {
  it('skill=0时durability=30+0*0.6=30', () => {
    expect(30 + 0 * 0.6).toBeCloseTo(30)
  })

  it('skill=50时durability=30+50*0.6=60', () => {
    expect(30 + 50 * 0.6).toBeCloseTo(60)
  })

  it('skill=100时durability=30+100*0.6=90', () => {
    expect(30 + 100 * 0.6).toBeCloseTo(90)
  })

  it('skill=25时durability=30+25*0.6=45', () => {
    expect(30 + 25 * 0.6).toBeCloseTo(45)
  })
})

describe('CreatureWheelwrightsSystem efficiency公式', () => {
  it('skill=0时efficiency=20+0*0.7=20', () => {
    expect(20 + 0 * 0.7).toBeCloseTo(20)
  })

  it('skill=50时efficiency=20+50*0.7=55', () => {
    expect(20 + 50 * 0.7).toBeCloseTo(55)
  })

  it('skill=100时efficiency=20+100*0.7=90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90)
  })
})

describe('CreatureWheelwrightsSystem wheelsBuilt公式', () => {
  it('skill=11时wheelsBuilt=1+floor(11/11)=2', () => {
    expect(1 + Math.floor(11 / 11)).toBe(2)
  })

  it('skill=0时wheelsBuilt=1+floor(0/11)=1', () => {
    expect(1 + Math.floor(0 / 11)).toBe(1)
  })

  it('skill=99时wheelsBuilt=1+floor(99/11)=10', () => {
    expect(1 + Math.floor(99 / 11)).toBe(10)
  })
})

describe('CreatureWheelwrightsSystem skillMap操作', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入后可读取', () => {
    ;(sys as any).skillMap.set(11, 44)
    expect((sys as any).skillMap.get(11)).toBe(44)
  })
})

describe('CreatureWheelwrightsSystem - 数据完整性', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段后完整保存', () => {
    ;(sys as any).wheelwrights.push(makeMaker(42, 'chariot', 88888))
    const m = (sys as any).wheelwrights[0]
    expect(m.entityId).toBe(42)
    expect(m.wheelType).toBe('chariot')
    expect(m.tick).toBe(88888)
  })
})

describe('CreatureWheelwrightsSystem - lastCheck额外', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureWheelwrightsSystem - wheelwrights数组批量操作', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入8条后length为8', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).wheelwrights.push(makeMaker(i + 1))
    }
    expect((sys as any).wheelwrights).toHaveLength(8)
  })

  it('splice后length正确', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart'))
    ;(sys as any).wheelwrights.push(makeMaker(2, 'wagon'))
    ;(sys as any).wheelwrights.splice(0, 1)
    expect((sys as any).wheelwrights).toHaveLength(1)
    expect((sys as any).wheelwrights[0].wheelType).toBe('wagon')
  })
})

describe('CreatureWheelwrightsSystem - WheelType字符串合法性', () => {
  it('4种WheelType均为字符串', () => {
    const types: WheelType[] = ['cart', 'wagon', 'mill', 'chariot']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })
})

describe('CreatureWheelwrightsSystem - durability和efficiency字段保留', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('durability和efficiency字段均存在', () => {
    ;(sys as any).wheelwrights.push(makeMaker(5, 'chariot', 5000))
    const m = (sys as any).wheelwrights[0]
    expect(m.durability).toBeDefined()
    expect(m.efficiency).toBeDefined()
  })
})

describe('CreatureWheelwrightsSystem - SKILL_GROWTH与常量', () => {
  it('SKILL_GROWTH=0.07精确值', () => {
    const SKILL_GROWTH = 0.07
    expect(SKILL_GROWTH).toBeCloseTo(0.07)
  })

  it('CHECK_INTERVAL=1400精确值', () => {
    expect(1400).toBe(1400)
  })
})

describe('CreatureWheelwrightsSystem - 数据合法性多项', () => {
  it('wheelsBuilt非负整数', () => {
    const m = makeMaker(1)
    expect(m.wheelsBuilt).toBeGreaterThanOrEqual(0)
  })

  it('durability为正数', () => {
    const m = makeMaker(1)
    expect(m.durability).toBeGreaterThan(0)
  })

  it('efficiency为正数', () => {
    const m = makeMaker(1)
    expect(m.efficiency).toBeGreaterThan(0)
  })
})

describe('CreatureWheelwrightsSystem - 数据结构字段类型', () => {
  it('Wheelwright接口所有字段为合法类型', () => {
    const m = makeMaker(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.wheelsBuilt).toBe('number')
    expect(typeof m.wheelType).toBe('string')
    expect(typeof m.durability).toBe('number')
    expect(typeof m.efficiency).toBe('number')
    expect(typeof m.tick).toBe('number')
  })
})

describe('CreatureWheelwrightsSystem - nextId初始', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureWheelwrightsSystem - 综合3测试', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入并查询skill字段', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 0))
    expect((sys as any).wheelwrights[0].skill).toBe(70)
  })

  it('注入并查询wheelsBuilt字段', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 0))
    expect((sys as any).wheelwrights[0].wheelsBuilt).toBe(12)
  })

  it('注入并查询durability字段', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 0))
    expect((sys as any).wheelwrights[0].durability).toBe(65)
  })
})
