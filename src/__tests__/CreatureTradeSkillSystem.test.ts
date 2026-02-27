import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTradeSkillSystem } from '../systems/CreatureTradeSkillSystem'
import type { CreatureTradeSkill, TradeSkillType } from '../systems/CreatureTradeSkillSystem'

function makeSys(): CreatureTradeSkillSystem { return new CreatureTradeSkillSystem() }
function makeTrader(entityId: number): CreatureTradeSkill {
  return { entityId, skills: { bartering: 70, negotiation: 60 }, totalTrades: 10, profitGenerated: 500, lastTradeAt: 0 }
}

describe('CreatureTradeSkillSystem getters', () => {
  let sys: CreatureTradeSkillSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无交易者', () => { expect(sys.getTraderCount()).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).traders.set(1, makeTrader(1))
    expect(sys.getTrader(1)?.entityId).toBe(1)
  })
  it('getTraders返回Map', () => {
    ;(sys as any).traders.set(1, makeTrader(1))
    expect(sys.getTraders()).toBeInstanceOf(Map)
  })
  it('getTrader无记录返回undefined', () => {
    expect(sys.getTrader(999)).toBeUndefined()
  })
  it('getTraderCount返回正确数量', () => {
    ;(sys as any).traders.set(1, makeTrader(1))
    ;(sys as any).traders.set(2, makeTrader(2))
    expect(sys.getTraderCount()).toBe(2)
  })
  it('技能字段正确', () => {
    ;(sys as any).traders.set(1, makeTrader(1))
    const trader = sys.getTrader(1)!
    expect(trader.skills.bartering).toBe(70)
    expect(trader.totalTrades).toBe(10)
  })
})
