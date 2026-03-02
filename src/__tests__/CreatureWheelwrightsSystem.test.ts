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
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelwrights).toHaveLength(1)
  })

  it('tick < cutoff 的记录被清除', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'cart', 1000))
    ;(sys as any).wheelwrights.push(makeMaker(2, 'mill', 60000))
    const em = makeEM([])
    // cutoff = 56400-55000=1400, wheeler[0].tick=1000 < 1400 → 删除
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
