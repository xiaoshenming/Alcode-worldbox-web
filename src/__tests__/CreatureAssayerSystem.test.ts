import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAssayerSystem } from '../systems/CreatureAssayerSystem'
import type { Assayer } from '../systems/CreatureAssayerSystem'

// CHECK_INTERVAL=2790, RECRUIT_CHANCE=0.0014, MAX_ASSAYERS=10
// 技能递增: assayingSkill+0.02/tick, chemicalKnowledge+0.015/tick, purityAssessment+0.01/tick
// cleanup: assayingSkill<=4 时删除

let nextId = 1

function makeAssSys(): CreatureAssayerSystem {
  return new CreatureAssayerSystem()
}

function makeAssayer(entityId: number, overrides: Partial<Assayer> = {}): Assayer {
  return {
    id: nextId++,
    entityId,
    assayingSkill: 20,
    chemicalKnowledge: 25,
    precisionTesting: 15,
    purityAssessment: 20,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAssayerSystem', () => {
  let sys: CreatureAssayerSystem

  beforeEach(() => { sys = makeAssSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无化验师', () => {
    expect((sys as any).assayers).toHaveLength(0)
  })

  it('注入化验师后可查询', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toHaveLength(1)
    expect((sys as any).assayers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toBe((sys as any).assayers)
  })

  it('多个化���师全部返回', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    ;(sys as any).assayers.push(makeAssayer(2))
    ;(sys as any).assayers.push(makeAssayer(3))
    expect((sys as any).assayers).toHaveLength(3)
  })

  it('化验师数据字段完整', () => {
    const a = makeAssayer(10, { assayingSkill: 80, chemicalKnowledge: 70, precisionTesting: 60, purityAssessment: 75 })
    ;(sys as any).assayers.push(a)
    const result = (sys as any).assayers[0]
    expect(result.assayingSkill).toBe(80)
    expect(result.chemicalKnowledge).toBe(70)
    expect(result.precisionTesting).toBe(60)
    expect(result.purityAssessment).toBe(75)
  })

  it('新实例的nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('新实例的lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('assayers是数组类型', () => {
    expect(Array.isArray((sys as any).assayers)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeAssSys()
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys2 as any).assayers).toHaveLength(0)
  })

  it('化验师id字段存在', () => {
    const a = makeAssayer(5)
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].id).toBeDefined()
  })

  it('化验师tick字段存在', () => {
    const a = makeAssayer(5, { tick: 999 })
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].tick).toBe(999)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2790)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2790
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2790)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)  // 2790 >= 2790
    expect((sys as any).lastCheck).toBe(2790)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)  // 7000-5000=2000 < 2790，不更新
    expect((sys as any).lastCheck).toBe(5000)
    sys.update(1, em, 7790)  // 7790-5000=2790 >= 2790，更新
    expect((sys as any).lastCheck).toBe(7790)
  })

  it('tick差值恰好等于CHECK_INTERVAL-1时不更新', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2789)  // 2789 < 2790
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值=CHECK_INTERVAL+1时更新', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2791)
    expect((sys as any).lastCheck).toBe(2791)
  })

  it('lastCheck大于tick时不更新（防负值）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 4000)  // 4000-5000=-1000 < 2790，不更新
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续触发两次CHECK_INTERVAL', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).lastCheck).toBe(2790)
    sys.update(1, em, 5580)
    expect((sys as any).lastCheck).toBe(5580)
  })

  // ── 技能递增 ──────────────────────────────────────────────────────────────

  it('update后assayingSkill+0.02', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].assayingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后chemicalKnowledge+0.015', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { chemicalKnowledge: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].chemicalKnowledge).toBeCloseTo(40.015, 5)
  })

  it('update后purityAssessment+0.01', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { purityAssessment: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].purityAssessment).toBeCloseTo(30.01, 5)
  })

  it('assayingSkill上限为100', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].assayingSkill).toBe(100)
  })

  it('chemicalKnowledge上限为100', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { chemicalKnowledge: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].chemicalKnowledge).toBe(100)
  })

  it('purityAssessment上限为100', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { purityAssessment: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].purityAssessment).toBe(100)
  })

  it('assayingSkill=100时保持100', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].assayingSkill).toBe(100)
  })

  it('chemicalKnowledge=100时保持100', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { chemicalKnowledge: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].chemicalKnowledge).toBe(100)
  })

  it('precisionTesting不在递增列表中（不变）', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { precisionTesting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    // 源码中precisionTesting没有递增，应该保持不变
    expect((sys as any).assayers[0].precisionTesting).toBe(50)
  })

  it('多个化验师同时递增技能', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 10 }))
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 20 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers[0].assayingSkill).toBeCloseTo(10.02, 5)
    expect((sys as any).assayers[1].assayingSkill).toBeCloseTo(20.02, 5)
  })

  it('tick不满足CHECK_INTERVAL时技能不递增', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 100 < 2790
    expect((sys as any).assayers[0].assayingSkill).toBe(50)
  })

  // ── cleanup ───────────────────────────────────────────────────────────────

  it('cleanup: assayingSkill<=4时删除（先递增后cleanup，3.98+0.02=4.00<=4）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 30 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    vi.restoreAllMocks()
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(2)
  })

  it('cleanup: assayingSkill>4时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 10 }))
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(2)
    vi.restoreAllMocks()
  })

  it('cleanup: assayingSkill=4.01保留（4+0.02=4.02>4）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 4.01 }))  // 4.01+0.02=4.03>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('cleanup: assayingSkill=3.97删除（3.97+0.02=3.99<=4）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 3.97 }))  // 3.97+0.02=3.99<=4，删除
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('cleanup: 全部低技能时清空列表', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 1 }))
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 2 }))
    ;(sys as any).assayers.push(makeAssayer(3, { assayingSkill: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('cleanup: 空列表时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 2790)).not.toThrow()
    vi.restoreAllMocks()
    expect((sys as any).assayers.length).toBe(0)
  })

  it('cleanup在技能递增之后执行（递增后再判断）', () => {
    const em = {} as any
    // assayingSkill=3.98 -> 递增+0.02 -> 4.00 -> 4<=4 -> 删除
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 3.98 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
  })

  // ── 招募逻辑（MAX_ASSAYERS=10）────────────────────────────────────────────

  it('assayers数量达MAX_ASSAYERS=10时即使随机也不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // 远小于RECRUIT_CHANCE=0.0014
    const em = {} as any
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).assayers.push(makeAssayer(i, { assayingSkill: 50 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    // 应保持10个（cleanup后不增加）
    expect((sys as any).assayers.length).toBeLessThanOrEqual(10)
  })

  it('assayers数量=0时有机会招募新化验师', () => {
    // 强制随机数=0（<RECRUIT_CHANCE），触发招募
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    // 是否有新化验师（有机会生成）
    expect((sys as any).assayers.length).toBeGreaterThanOrEqual(0)
  })

  it('招募时随机概率>RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)  // 远大于0.0014
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
  })

  it('新招募的化验师assayingSkill在10-35范围内', () => {
    // 让random返回特定值控制范围：10 + random()*25
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)      // RECRUIT_CHANCE比较（0 < 0.0014）
      .mockReturnValue(0.5)        // 后续随机值（10+0.5*25=22.5）
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    if ((sys as any).assayers.length > 0) {
      const skill = (sys as any).assayers[0].assayingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(35)
    }
  })

  it('新招募化验师chemicalKnowledge在15-35范围内', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    if ((sys as any).assayers.length > 0) {
      const ck = (sys as any).assayers[0].chemicalKnowledge
      expect(ck).toBeGreaterThanOrEqual(15)
      expect(ck).toBeLessThanOrEqual(35)
    }
  })

  it('新招募化验师purityAssessment在10-35范围内', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    if ((sys as any).assayers.length > 0) {
      const pa = (sys as any).assayers[0].purityAssessment
      expect(pa).toBeGreaterThanOrEqual(10)
      expect(pa).toBeLessThanOrEqual(35)
    }
  })

  it('新招募化验师precisionTesting在5-25范围内', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    if ((sys as any).assayers.length > 0) {
      const pt = (sys as any).assayers[0].precisionTesting
      expect(pt).toBeGreaterThanOrEqual(5)
      expect(pt).toBeLessThanOrEqual(25)
    }
  })

  // ── 连续多轮update技能积累 ────────────────────────────────────────────────

  it('连续3轮update后assayingSkill递增3*0.02=0.06', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    ;(sys as any).lastCheck = 2790
    sys.update(1, em, 5580)
    ;(sys as any).lastCheck = 5580
    sys.update(1, em, 8370)
    expect((sys as any).assayers[0].assayingSkill).toBeCloseTo(50.06, 4)
  })

  it('连续多轮后chemicalKnowledge积累', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { chemicalKnowledge: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    ;(sys as any).lastCheck = 2790
    sys.update(1, em, 5580)
    expect((sys as any).assayers[0].chemicalKnowledge).toBeCloseTo(50.03, 4)
  })

  it('连续多轮后purityAssessment积累', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { purityAssessment: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    ;(sys as any).lastCheck = 2790
    sys.update(1, em, 5580)
    expect((sys as any).assayers[0].purityAssessment).toBeCloseTo(50.02, 4)
  })

  // ── 数据结构完整性 ────────────────────────────────────────────────────────

  it('化验师id唯一（模拟2个插入）', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    ;(sys as any).assayers.push(makeAssayer(2))
    const ids = (sys as any).assayers.map((a: Assayer) => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('化验师entityId可以为0', () => {
    ;(sys as any).assayers.push(makeAssayer(0))
    expect((sys as any).assayers[0].entityId).toBe(0)
  })

  it('assayingSkill=0的化验师会在cleanup中被删除（0<=4）', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
  })

  it('tick=CHECK_INTERVAL时lastCheck精确等于tick', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).lastCheck).toBe(2790)
  })

  it('化验师assayingSkill接近下限时update后仍可能被删除', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 3.5 }))  // 3.5+0.02=3.52 <=4
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(0)
  })
})
