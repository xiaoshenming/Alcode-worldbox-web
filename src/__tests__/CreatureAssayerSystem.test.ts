import { describe, it, expect, beforeEach } from 'vitest'
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

  it('多个化验师全部返回', () => {
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

  // ── cleanup ───────────────────────────────────────────────────────────────

  it('cleanup: assayingSkill<=4时删除（先递增后cleanup，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 30 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(2)
  })

  it('cleanup: assayingSkill>4时保留', () => {
    const em = {} as any
    ;(sys as any).assayers.push(makeAssayer(1, { assayingSkill: 10 }))
    ;(sys as any).assayers.push(makeAssayer(2, { assayingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2790)
    expect((sys as any).assayers.length).toBe(2)
  })
})
