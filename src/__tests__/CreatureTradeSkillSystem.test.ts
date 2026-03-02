import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTradeSkillSystem } from '../systems/CreatureTradeSkillSystem'
import type { CreatureTradeSkill, TradeSkillType } from '../systems/CreatureTradeSkillSystem'

// CHECK_INTERVAL=700, TRAIN_INTERVAL=500, SKILL_GAIN=3, MAX_SKILL=100, MAX_TRADERS=150

function makeSys() { return new CreatureTradeSkillSystem() }

function makeTrader(id: number, skills: Partial<Record<TradeSkillType, number>> = {}): CreatureTradeSkill {
  return { entityId: id, skills, totalTrades: 0, profitGenerated: 0, lastTradeAt: 0 }
}

describe('CreatureTradeSkillSystem', () => {
  let sys: CreatureTradeSkillSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('traders Map初始为空', () => { expect((sys as any).traders.size).toBe(0) })
  it('getTraders()初始为空', () => { expect(sys.getTraders().size).toBe(0) })

  // ── CHECK_INTERVAL / TRAIN_INTERVAL 节流 ─────────────────────────────────

  it('tick差值<CHECK_INTERVAL(700)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 600)  // 600 < 700
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(700)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 700)
    expect((sys as any).lastCheck).toBe(700)
  })

  it('tick差值<TRAIN_INTERVAL(500)时不更新lastTrain', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastCheck = 999999  // 不触发check
    ;(sys as any).lastTrain = 0
    sys.update(1, em, 400)  // 400 < 500
    expect((sys as any).lastTrain).toBe(0)
  })

  it('tick差值>=TRAIN_INTERVAL(500)时更新lastTrain', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastCheck = 999999
    ;(sys as any).lastTrain = 0
    sys.update(1, em, 500)
    expect((sys as any).lastTrain).toBe(500)
  })

  // ── trainSkills: skill递增 ────────────────────────────────────────────────

  it('trainSkills增加已有技能（SKILL_GAIN=3）', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 50 }))
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.bartering).toBe(53)  // 50+3=53
  })

  it('trainSkills：skill上限100（MAX_SKILL）', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { negotiation: 99 }))
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.negotiation).toBe(100)  // Math.min(100, 99+3)=100
  })

  it('trainSkills：未持有的技能不增加', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 20 }))  // 只有bartering
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).trainSkills(em, 100)
    // negotiation没有设置，不应该出现
    expect(traders.get(1)!.skills.negotiation).toBeUndefined()
  })

  it('trainSkills：无creature时删除trader', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 30 }))
    traders.set(2, makeTrader(2, { diplomacy: 40 }))
    const em = { getComponent: (id: number, _: string) => id === 1 ? {} : null } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.has(1)).toBe(true)   // id=1有creature，保留
    expect(traders.has(2)).toBe(false)  // id=2无creature，删除
  })

  // ── getAverageSkill 纯计算 ───────────────────────────────────────────────

  it('getAverageSkill：单技能时返回该技能值', () => {
    const trader = makeTrader(1, { bartering: 60 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(60)
  })

  it('getAverageSkill：多技能取平均', () => {
    const trader = makeTrader(1, { bartering: 60, negotiation: 40 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(50)  // (60+40)/2=50
  })

  it('getAverageSkill：无技能时返回0', () => {
    const trader = makeTrader(1, {})
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(0)
  })

  // ── TradeSkillType 完整性 ────────────────────────────────────────────────

  it('5种TradeSkillType可以存入skills', () => {
    const skills: Partial<Record<TradeSkillType, number>> = {
      bartering: 10, negotiation: 20, appraisal: 30, logistics: 40, diplomacy: 50,
    }
    const trader = makeTrader(1, skills)
    expect(Object.keys(trader.skills).length).toBe(5)
  })
})
