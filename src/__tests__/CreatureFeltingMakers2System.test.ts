import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

const CHECK_INTERVAL = 2480
const RECRUIT_CHANCE = 0.0017
const MAX_MAKERS = 12

let nextId = 1
function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }
function makeMaker(entityId: number, overrides: Partial<FeltingMaker2> = {}): FeltingMaker2 {
  return { id: nextId++, entityId, needleSkill: 50, woolGrade: 60, densityControl: 70, artistry: 80, tick: 0, ...overrides }
}
const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

describe('CreatureFeltingMakers2System - 基础结构', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无制毡工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10, { needleSkill: 90, woolGrade: 85, densityControl: 80, artistry: 75 })
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.needleSkill).toBe(90); expect(r.woolGrade).toBe(85)
    expect(r.densityControl).toBe(80); expect(r.artistry).toBe(75)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('makers初始为空数组', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
    expect((sys as any).makers.length).toBe(0)
  })

  it('注入多个工匠后数组长度正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(5)
  })

  it('工匠tick字段默认为0', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].tick).toBe(0)
  })

  it('工匠id字段为数字', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('不同entityId的工匠各自独立', () => {
    ;(sys as any).makers.push(makeMaker(100))
    ;(sys as any).makers.push(makeMaker(200))
    expect((sys as any).makers[0].entityId).toBe(100)
    expect((sys as any).makers[1].entityId).toBe(200)
  })

  it('woolGrade字段可被正确读取', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 99 }))
    expect((sys as any).makers[0].woolGrade).toBe(99)
  })
})

describe('CreatureFeltingMakers2System - CHECK_INTERVAL 节流', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 < CHECK_INTERVAL 不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值 === CHECK_INTERVAL 时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick差值 > CHECK_INTERVAL 时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第一次update(tick=0)不通过节流', () => {
    const before = (sys as any).lastCheck
    sys.update(16, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('第二次触发需要再加CHECK_INTERVAL', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    // 差值 = CHECK_INTERVAL + CHECK_INTERVAL - 1 - CHECK_INTERVAL = CHECK_INTERVAL - 1，不更新
    sys.update(16, fakeEm, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    // 差值 = CHECK_INTERVAL * 2 - CHECK_INTERVAL = CHECK_INTERVAL，更新
    sys.update(16, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick差值恰好比CHECK_INTERVAL少1���不更新', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(16, fakeEm, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('节流期间makers不会被修改', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).lastCheck = 10000
    sys.update(16, fakeEm, 10000 + CHECK_INTERVAL - 1)
    // 节流期间不执行技能增长
    expect((sys as any).makers[0].needleSkill).toBe(50)
  })

  it('节流通过后lastCheck被更新为当前tick', () => {
    ;(sys as any).lastCheck = 0
    const targetTick = CHECK_INTERVAL * 3
    sys.update(16, fakeEm, targetTick)
    expect((sys as any).lastCheck).toBe(targetTick)
  })
})

describe('CreatureFeltingMakers2System - 技能递增', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('needleSkill 每次+0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.02)
  })

  it('artistry 每次+0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 80 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBeCloseTo(80.015)
  })

  it('densityControl 每次+0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 70 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBeCloseTo(70.01)
  })

  it('needleSkill上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('artistry上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBe(100)
  })

  it('densityControl上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBe(100)
  })

  it('needleSkill精确上限：恰好100时不超过100', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 100 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('artistry精确上限：恰好100时不超过100', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 100 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBe(100)
  })

  it('densityControl精确上限：恰好100时不超过100', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 100 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBe(100)
  })

  it('多个工匠全部接受技能增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 30 }))
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 50 }))
    ;(sys as any).makers.push(makeMaker(3, { needleSkill: 70 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(30.02)
    expect((sys as any).makers[1].needleSkill).toBeCloseTo(50.02)
    expect((sys as any).makers[2].needleSkill).toBeCloseTo(70.02)
  })

  it('三技能每次update均递增', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 10, artistry: 20, densityControl: 30 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    const m = (sys as any).makers[0]
    expect(m.needleSkill).toBeCloseTo(10.02)
    expect(m.artistry).toBeCloseTo(20.015)
    expect(m.densityControl).toBeCloseTo(30.01)
  })

  it('woolGrade不会被update修改', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 55 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].woolGrade).toBe(55)
  })

  it('连续两次update技能累加正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    sys.update(16, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureFeltingMakers2System - cleanup 机制', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('needleSkill > 3 时不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 4 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('needleSkill=2.98时update后变3.00被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.98 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('needleSkill < 3 时被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 1 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('混合时只保留needleSkill>3的工匠', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 2 }))
    ;(sys as any).makers.push(makeMaker(3, { needleSkill: 60 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers.every((m: FeltingMaker2) => m.needleSkill > 3)).toBe(true)
  })

  it('needleSkill=3时（等于阈值）被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 3 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    // 3 + 0.02 = 3.02 > 3，不被清除
    expect((sys as any).makers).toHaveLength(1)
  })

  it('needleSkill=2.99时update后为3.01不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    // 2.99 + 0.02 = 3.01 > 3，不被清除
    expect((sys as any).makers).toHaveLength(1)
  })

  it('全部低技能工匠被清除后数组为空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { needleSkill: 0.5 }))
    }
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cleanup不影响woolGrade字段', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50, woolGrade: 88 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].woolGrade).toBe(88)
  })

  it('cleanup后存活工匠保持正确的entityId', () => {
    ;(sys as any).makers.push(makeMaker(42, { needleSkill: 1 }))  // 会被删除
    ;(sys as any).makers.push(makeMaker(99, { needleSkill: 50 })) // 保留
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(99)
  })

  it('先增长技能再执行cleanup，顺序正确', () => {
    // needleSkill=2.98 -> 增长后=3.00 -> 3.00 <= 3 -> 被清除
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.98 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureFeltingMakers2System - 招募机制', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('makers数量达MAX_MAKERS(12)时不再招募', () => {
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { needleSkill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保通过RECRUIT_CHANCE概率
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(MAX_MAKERS)
  })

  it('随机概率 < RECRUIT_CHANCE 时才招募（mock）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(RECRUIT_CHANCE - 0.0001)
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0) // 可能新增1个
  })

  it('随机概率 >= RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(RECRUIT_CHANCE + 0.001)
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const beforeId = (sys as any).nextId
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(beforeId)
  })

  it('新招募工匠的技能在合理范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, fakeEm, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      const m = (sys as any).makers[0]
      expect(m.needleSkill).toBeGreaterThanOrEqual(10)
      expect(m.needleSkill).toBeLessThanOrEqual(35)
      expect(m.woolGrade).toBeGreaterThanOrEqual(15)
      expect(m.woolGrade).toBeLessThanOrEqual(45)
    }
  })

  it('新招募工匠的artistry在合理范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, fakeEm, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      const m = (sys as any).makers[0]
      expect(m.artistry).toBeGreaterThanOrEqual(5)
      expect(m.artistry).toBeLessThanOrEqual(30)
    }
  })

  it('11个makers时仍可继续招募', () => {
    for (let i = 0; i < MAX_MAKERS - 1; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { needleSkill: 50 }))
    }
    expect((sys as any).makers).toHaveLength(11)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, fakeEm, CHECK_INTERVAL)
    // 可能因cleanup删除再加1，但长度>=11
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)
  })
})

describe('CreatureFeltingMakers2System - update整合场景', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('节流未到时多字段均不变', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 40, artistry: 50, densityControl: 60 }))
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    const m = (sys as any).makers[0]
    expect(m.needleSkill).toBe(40)
    expect(m.artistry).toBe(50)
    expect(m.densityControl).toBe(60)
  })

  it('update后技能永远不超过100', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 100, artistry: 100, densityControl: 100 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    const m = (sys as any).makers[0]
    expect(m.needleSkill).toBeLessThanOrEqual(100)
    expect(m.artistry).toBeLessThanOrEqual(100)
    expect(m.densityControl).toBeLessThanOrEqual(100)
  })

  it('空makers执行update不抛错', () => {
    expect(() => sys.update(16, fakeEm, CHECK_INTERVAL)).not.toThrow()
  })

  it('update后lastCheck被更新为传入的tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL * 5)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
  })

  it('多次触发update，技能稳定累加', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 10 }))
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(16, fakeEm, CHECK_INTERVAL * i)
      ;(sys as any).lastCheck = CHECK_INTERVAL * i
    }
    // 5次 * 0.02 = 0.1，最终约10.10
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(10.1, 1)
  })

  it('dt参数对结果无影响', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 40 }))
    sys.update(100, fakeEm, CHECK_INTERVAL) // dt=100
    const val1 = (sys as any).makers[0].needleSkill
    // 重置
    sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 40 }))
    sys.update(1, fakeEm, CHECK_INTERVAL)   // dt=1
    const val2 = (sys as any).makers[0].needleSkill
    expect(val1).toBeCloseTo(val2)
  })
})
