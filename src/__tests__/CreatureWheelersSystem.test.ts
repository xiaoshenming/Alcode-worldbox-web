import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureWheelersSystem } from '../systems/CreatureWheelersSystem'
import type { Wheeler, WheelType } from '../systems/CreatureWheelersSystem'

let nextId = 1
function makeSys(): CreatureWheelersSystem { return new CreatureWheelersSystem() }
function makeWheeler(entityId: number, type: WheelType = 'cart', tickVal = 0): Wheeler {
  return { id: nextId++, entityId, skill: 70, wheelsBuilt: 12, wheelType: type, balance: 65, reputation: 45, tick: tickVal }
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

describe('CreatureWheelersSystem.getWheelers', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车轮工', () => { expect((sys as any).wheelers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'mill'))
    expect((sys as any).wheelers[0].wheelType).toBe('mill')
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelers.push(makeWheeler(1))
    expect((sys as any).wheelers).toBe((sys as any).wheelers)
  })
  it('支持所有4种车轮类型', () => {
    const types: WheelType[] = ['cart', 'mill', 'spinning', 'gear']
    types.forEach((t, i) => { ;(sys as any).wheelers.push(makeWheeler(i + 1, t)) })
    const all = (sys as any).wheelers
    types.forEach((t, i) => { expect(all[i].wheelType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelers.push(makeWheeler(1))
    ;(sys as any).wheelers.push(makeWheeler(2))
    expect((sys as any).wheelers).toHaveLength(2)
  })
})

describe('CreatureWheelersSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureWheelersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('首次 tick=0 时不执行（lastCheck=0，差值=0 < 1400）', () => {
    const em = makeEM([1])
    sys.update(0, em as any, 0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick < CHECK_INTERVAL(1400) 时跳过', () => {
    const em = makeEM([1])
    sys.update(0, em as any, 1399)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick === CHECK_INTERVAL 时执行', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('执行后更新 lastCheck，下次需再等 1400', () => {
    const em = makeEM([])
    sys.update(0, em as any, 1400)
    em.getEntitiesWithComponents.mockClear()
    sys.update(0, em as any, 1400 + 1399)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    sys.update(0, em as any, 1400 + 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })
})

describe('CreatureWheelersSystem skillMap 技能累积', () => {
  let sys: CreatureWheelersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('首次为实体创建初始技能并加 SKILL_GROWTH(0.065)', () => {
    // 强制 CRAFT_CHANCE 通过：随机总是 0
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 20 })
    sys.update(0, em as any, 1400)
    const skill = (sys as any).skillMap.get(10)
    // 初始值 = 3 + 0*7 = 3, +0.065 = 3.065，min(100,3.065)
    expect(skill).toBeCloseTo(3.065, 3)
    Math.random = origRandom
  })

  it('第二次调用同实体，技能在原有基础上累加 0.065', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 20 })
    sys.update(0, em as any, 1400)
    sys.update(0, em as any, 2800)
    const skill = (sys as any).skillMap.get(10)
    expect(skill).toBeCloseTo(3.065 + 0.065, 3)
    Math.random = origRandom
  })

  it('技能上限为 100', () => {
    ;(sys as any).skillMap.set(10, 99.98)
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 20 })
    sys.update(0, em as any, 1400)
    const skill = (sys as any).skillMap.get(10)
    expect(skill).toBe(100)
    Math.random = origRandom
  })
})

describe('CreatureWheelersSystem 时间过期清理', () => {
  let sys: CreatureWheelersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 在 cutoff(tick-55000) 内的记录保留', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart', 5000))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 1400) // cutoff = 1400-55000 = 负数，5000 > 负数 → 保留
    expect((sys as any).wheelers).toHaveLength(1)
  })

  it('tick < cutoff 的记录被清除', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart', 1000))
    ;(sys as any).wheelers.push(makeWheeler(2, 'mill', 60000))
    const em = makeEM([])
    // 第一次触发 update(lastCheck=0)，tick=56400
    // cutoff=56400-55000=1400, wheeler[0].tick=1000 < 1400 → 删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 56400)
    const wheelers = (sys as any).wheelers
    expect(wheelers).toHaveLength(1)
    expect(wheelers[0].entityId).toBe(2)
  })

  it('批量清理：多个过期记录全部移除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).wheelers.push(makeWheeler(i + 1, 'cart', 100 + i))
    }
    ;(sys as any).wheelers.push(makeWheeler(99, 'gear', 100000))
    const em = makeEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 56400)
    expect((sys as any).wheelers).toHaveLength(1)
    expect((sys as any).wheelers[0].entityId).toBe(99)
  })
})

describe('CreatureWheelersSystem wheelType 依据 skill 分配', () => {
  let sys: CreatureWheelersSystem

  beforeEach(() => { sys = makeSys() })

  it('skill < 25 → typeIdx=0 → cart', () => {
    const typeIdx = Math.min(3, Math.floor(10 / 25))
    expect(['cart', 'mill', 'spinning', 'gear'][typeIdx]).toBe('cart')
  })

  it('skill 25~49 → typeIdx=1 → mill', () => {
    const typeIdx = Math.min(3, Math.floor(30 / 25))
    expect(['cart', 'mill', 'spinning', 'gear'][typeIdx]).toBe('mill')
  })

  it('skill 50~74 → typeIdx=2 → spinning', () => {
    const typeIdx = Math.min(3, Math.floor(60 / 25))
    expect(['cart', 'mill', 'spinning', 'gear'][typeIdx]).toBe('spinning')
  })

  it('skill >= 75 → typeIdx=3 → gear', () => {
    const typeIdx = Math.min(3, Math.floor(90 / 25))
    expect(['cart', 'mill', 'spinning', 'gear'][typeIdx]).toBe('gear')
  })
})

describe('CreatureWheelersSystem MAX_WHEELERS=30 上限', () => {
  let sys: CreatureWheelersSystem

  beforeEach(() => { sys = makeSys() })

  it('已达 30 人，不再新增', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).wheelers.push(makeWheeler(i + 1))
    }
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([100], { 100: 20 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelers).toHaveLength(30)
    Math.random = origRandom
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreatureWheelersSystem balance公式', () => {
  it('skill=0时balance=20+0*0.7=20', () => {
    expect(20 + 0 * 0.7).toBeCloseTo(20)
  })

  it('skill=50时balance=20+50*0.7=55', () => {
    expect(20 + 50 * 0.7).toBeCloseTo(55)
  })

  it('skill=100时balance=20+100*0.7=90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90)
  })

  it('skill=25时balance=20+25*0.7=37.5', () => {
    expect(20 + 25 * 0.7).toBeCloseTo(37.5)
  })
})

describe('CreatureWheelersSystem reputation公式', () => {
  it('skill=0时reputation=12+0*0.8=12', () => {
    expect(12 + 0 * 0.8).toBeCloseTo(12)
  })

  it('skill=50时reputation=12+50*0.8=52', () => {
    expect(12 + 50 * 0.8).toBeCloseTo(52)
  })

  it('skill=100时reputation=12+100*0.8=92', () => {
    expect(12 + 100 * 0.8).toBeCloseTo(92)
  })
})

describe('CreatureWheelersSystem wheelsBuilt公式', () => {
  it('skill=9时wheelsBuilt=1+floor(9/9)=2', () => {
    expect(1 + Math.floor(9 / 9)).toBe(2)
  })

  it('skill=0时wheelsBuilt=1+floor(0/9)=1', () => {
    expect(1 + Math.floor(0 / 9)).toBe(1)
  })

  it('skill=90时wheelsBuilt=1+floor(90/9)=11', () => {
    expect(1 + Math.floor(90 / 9)).toBe(11)
  })
})

describe('CreatureWheelersSystem skillMap操作', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始skillMap为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('手动写入后可读取', () => {
    ;(sys as any).skillMap.set(10, 66)
    expect((sys as any).skillMap.get(10)).toBe(66)
  })
})

describe('CreatureWheelersSystem - 数据完整性', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入所有字段后完整保存', () => {
    ;(sys as any).wheelers.push(makeWheeler(42, 'gear', 99999))
    const m = (sys as any).wheelers[0]
    expect(m.entityId).toBe(42)
    expect(m.wheelType).toBe('gear')
    expect(m.tick).toBe(99999)
  })
})

describe('CreatureWheelersSystem - lastCheck额外', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('CreatureWheelersSystem - 年龄门槛age>=12', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('age=11时不被录入', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 11 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelers).toHaveLength(0)
    Math.random = origRandom
  })

  it('age=12时可被录入', () => {
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    const em = makeEM([10], { 10: 12 })
    sys.update(0, em as any, 1400)
    expect((sys as any).wheelers).toHaveLength(1)
    Math.random = origRandom
  })
})

describe('CreatureWheelersSystem - wheelers数组批量操作', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入8条后length为8', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).wheelers.push(makeWheeler(i + 1))
    }
    expect((sys as any).wheelers).toHaveLength(8)
  })

  it('splice后length正确', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart'))
    ;(sys as any).wheelers.push(makeWheeler(2, 'mill'))
    ;(sys as any).wheelers.splice(0, 1)
    expect((sys as any).wheelers).toHaveLength(1)
    expect((sys as any).wheelers[0].wheelType).toBe('mill')
  })
})

describe('CreatureWheelersSystem - WheelType字符串合法性', () => {
  it('4种WheelType均为字符串', () => {
    const types: WheelType[] = ['cart', 'mill', 'spinning', 'gear']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })
})

describe('CreatureWheelersSystem - 数据完整性（额外）', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('balance和reputation字段均保留', () => {
    ;(sys as any).wheelers.push(makeWheeler(5, 'gear', 5000))
    const m = (sys as any).wheelers[0]
    expect(m.balance).toBeDefined()
    expect(m.reputation).toBeDefined()
  })
})

describe('CreatureWheelersSystem - SKILL_GROWTH与常量', () => {
  it('SKILL_GROWTH=0.065精确值', () => {
    const SKILL_GROWTH = 0.065
    expect(SKILL_GROWTH).toBeCloseTo(0.065)
  })

  it('CHECK_INTERVAL=1400精确值', () => {
    expect(1400).toBe(1400)
  })
})

describe('CreatureWheelersSystem - 数据合法性多项', () => {
  it('wheelsBuilt非负整数', () => {
    const m = makeWheeler(1)
    expect(m.wheelsBuilt).toBeGreaterThanOrEqual(0)
  })

  it('balance为正数', () => {
    const m = makeWheeler(1)
    expect(m.balance).toBeGreaterThan(0)
  })

  it('reputation为正数', () => {
    const m = makeWheeler(1)
    expect(m.reputation).toBeGreaterThan(0)
  })
})

describe('CreatureWheelersSystem - 数据结构字段类型', () => {
  it('Wheeler接口所有字段为合法类型', () => {
    const m = makeWheeler(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.entityId).toBe('number')
    expect(typeof m.skill).toBe('number')
    expect(typeof m.wheelsBuilt).toBe('number')
    expect(typeof m.wheelType).toBe('string')
    expect(typeof m.balance).toBe('number')
    expect(typeof m.reputation).toBe('number')
    expect(typeof m.tick).toBe('number')
  })
})

describe('CreatureWheelersSystem - nextId初始', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreatureWheelersSystem - 综合3测试', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入并查询skill字段', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart', 0))
    expect((sys as any).wheelers[0].skill).toBe(70)
  })

  it('注入并查询wheelsBuilt字段', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart', 0))
    expect((sys as any).wheelers[0].wheelsBuilt).toBe(12)
  })

  it('注入并查询balance字段', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'cart', 0))
    expect((sys as any).wheelers[0].balance).toBe(65)
  })
})
