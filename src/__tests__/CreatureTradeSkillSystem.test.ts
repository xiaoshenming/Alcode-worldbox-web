import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据结构 ──────────────────────────────────────────────────────────

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('traders Map初始为空', () => { expect((sys as any).traders.size).toBe(0) })
  it('getTraders()初始为空', () => { expect(sys.getTraders().size).toBe(0) })
  it('getTraders()返回Map类型', () => { expect(sys.getTraders()).toBeInstanceOf(Map) })
  it('getTraders()返回内部引用', () => {
    const a = sys.getTraders()
    const b = sys.getTraders()
    expect(a).toBe(b)
  })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('lastTrain初始为0', () => { expect((sys as any).lastTrain).toBe(0) })

  // ── CHECK_INTERVAL / TRAIN_INTERVAL ���流 ─────────────────────────────────

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

  it('CHECK_INTERVAL恰好等于700时触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 1700)  // 1700-1000=700
    expect((sys as any).lastCheck).toBe(1700)
  })

  it('TRAIN_INTERVAL恰好等于500时触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastCheck = 999999
    ;(sys as any).lastTrain = 1000
    sys.update(1, em, 1500)  // 1500-1000=500
    expect((sys as any).lastTrain).toBe(1500)
  })

  it('两个节流条件可在同一tick独立触发', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastTrain = 0
    sys.update(1, em, 700)
    // 700>=700触发check，700>=500触发train
    expect((sys as any).lastCheck).toBe(700)
    expect((sys as any).lastTrain).toBe(700)
  })

  it('tick为0时两个节流均不触发（差值为0）', () => {
    const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => ({}) } as any
    ;(sys as any).lastCheck = 0
    ;(sys as any).lastTrain = 0
    sys.update(1, em, 0)
    // tick - lastCheck = 0-0 = 0，不触发（需要>=700/500）
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).lastTrain).toBe(0)
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

  it('trainSkills：skill恰好在100时不再增加', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { appraisal: 100 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.appraisal).toBe(100)
  })

  it('trainSkills：所有5种技能均可增加', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, {
      bartering: 10, negotiation: 20, appraisal: 30, logistics: 40, diplomacy: 50
    }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    ;(sys as any).trainSkills(em, 100)
    const t = traders.get(1)!
    expect(t.skills.bartering).toBe(13)
    expect(t.skills.negotiation).toBe(23)
    expect(t.skills.appraisal).toBe(33)
    expect(t.skills.logistics).toBe(43)
    expect(t.skills.diplomacy).toBe(53)
  })

  it('trainSkills：多个trader同时训练', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 10 }))
    traders.set(2, makeTrader(2, { logistics: 20 }))
    traders.set(3, makeTrader(3, { diplomacy: 30 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.bartering).toBe(13)
    expect(traders.get(2)!.skills.logistics).toBe(23)
    expect(traders.get(3)!.skills.diplomacy).toBe(33)
  })

  it('trainSkills：skill=97时加3恰好等于100', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 97 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.bartering).toBe(100)
  })

  it('trainSkills：skill=98时加3被截断到100', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { negotiation: 98 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.skills.negotiation).toBe(100)
  })

  it('trainSkills：空traders时不报错', () => {
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    expect(() => (sys as any).trainSkills(em, 100)).not.toThrow()
  })

  it('trainSkills：同时删除多个无效trader', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 10 }))
    traders.set(2, makeTrader(2, { logistics: 20 }))
    traders.set(3, makeTrader(3, { diplomacy: 30 }))
    const em = { getComponent: (_id: number, _: string) => null } as any
    ;(sys as any).trainSkills(em, 100)
    expect(traders.size).toBe(0)
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

  it('getAverageSkill：3种技能平均', () => {
    const trader = makeTrader(1, { bartering: 30, negotiation: 60, appraisal: 90 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(60)  // (30+60+90)/3=60
  })

  it('getAverageSkill：5种技能全满时返回100', () => {
    const trader = makeTrader(1, {
      bartering: 100, negotiation: 100, appraisal: 100, logistics: 100, diplomacy: 100
    })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(100)
  })

  it('getAverageSkill：技能全为0时返回0', () => {
    const trader = makeTrader(1, { bartering: 0, negotiation: 0 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(0)
  })

  it('getAverageSkill：diplomacy单项40时返回40', () => {
    const trader = makeTrader(1, { diplomacy: 40 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(40)
  })

  it('getAverageSkill：logistics单项75时返回75', () => {
    const trader = makeTrader(1, { logistics: 75 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(75)
  })

  it('getAverageSkill：4种技能平均计算正确', () => {
    const trader = makeTrader(1, { bartering: 20, negotiation: 40, appraisal: 60, logistics: 80 })
    const avg = (sys as any).getAverageSkill(trader)
    expect(avg).toBe(50)  // (20+40+60+80)/4=50
  })

  // ── TradeSkillType 完整性 ────────────────────────────────────────────────

  it('5种TradeSkillType可以存入skills', () => {
    const skills: Partial<Record<TradeSkillType, number>> = {
      bartering: 10, negotiation: 20, appraisal: 30, logistics: 40, diplomacy: 50,
    }
    const trader = makeTrader(1, skills)
    expect(Object.keys(trader.skills).length).toBe(5)
  })

  it('TradeSkillType: bartering合法', () => {
    const trader = makeTrader(1, { bartering: 55 })
    expect(trader.skills.bartering).toBe(55)
  })

  it('TradeSkillType: negotiation合法', () => {
    const trader = makeTrader(1, { negotiation: 33 })
    expect(trader.skills.negotiation).toBe(33)
  })

  it('TradeSkillType: appraisal合法', () => {
    const trader = makeTrader(1, { appraisal: 77 })
    expect(trader.skills.appraisal).toBe(77)
  })

  it('TradeSkillType: logistics合法', () => {
    const trader = makeTrader(1, { logistics: 11 })
    expect(trader.skills.logistics).toBe(11)
  })

  it('TradeSkillType: diplomacy合法', () => {
    const trader = makeTrader(1, { diplomacy: 99 })
    expect(trader.skills.diplomacy).toBe(99)
  })

  // ── assignTraders: MAX_TRADERS 上限 ──────────────────────────────────────

  it('assignTraders：traders已满MAX_TRADERS时不再招募', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    // 填满150个
    for (let i = 0; i < 150; i++) traders.set(i, makeTrader(i))
    const em = { getEntitiesWithComponents: () => [200, 201, 202] as number[] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 强制总是招募
    ;(sys as any).assignTraders(em, 100)
    expect(traders.size).toBe(150)  // 不超过150
  })

  it('assignTraders：已存在的trader不重复添加', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 50 }))
    const em = { getEntitiesWithComponents: () => [1] as number[] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 强制总是招募
    ;(sys as any).assignTraders(em, 100)
    // entityId=1已存在，不应被重新添加（skills不应被重置）
    expect(traders.get(1)!.skills.bartering).toBe(50)
  })

  it('assignTraders：无实体时不新增trader', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).assignTraders(em, 100)
    expect((sys as any).traders.size).toBe(0)
  })

  // ── totalTrades / profitGenerated 字段 ───────────────────────────────────

  it('新建trader的totalTrades为0', () => {
    const t = makeTrader(1, { bartering: 50 })
    expect(t.totalTrades).toBe(0)
  })

  it('新建trader的profitGenerated为0', () => {
    const t = makeTrader(1, { bartering: 50 })
    expect(t.profitGenerated).toBe(0)
  })

  it('新建trader的lastTradeAt为0', () => {
    const t = makeTrader(1, { bartering: 50 })
    expect(t.lastTradeAt).toBe(0)
  })

  it('手动修改totalTrades后可读取', () => {
    const t = makeTrader(1, { bartering: 50 })
    t.totalTrades = 42
    expect(t.totalTrades).toBe(42)
  })

  it('手动修改profitGenerated后可读取', () => {
    const t = makeTrader(1, { bartering: 50 })
    t.profitGenerated = 200
    expect(t.profitGenerated).toBe(200)
  })

  // ── trainSkills trade活动：totalTrades递增 ───────────────────────────────

  it('trainSkills中random<0.15时totalTrades+1', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 60 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 0.1 < 0.15，触发trade
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.totalTrades).toBe(1)
  })

  it('trainSkills中random>=0.15时totalTrades不变', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 60 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.5)  // 0.5 >= 0.15，不触发trade
    ;(sys as any).trainSkills(em, 100)
    expect(traders.get(1)!.totalTrades).toBe(0)
  })

  it('trainSkills trade活动：lastTradeAt更新为当前tick', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 60 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 触发trade
    ;(sys as any).trainSkills(em, 9999)
    expect(traders.get(1)!.lastTradeAt).toBe(9999)
  })

  it('trainSkills profitGenerated = floor(avgSkill * 0.5)', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 80 }))
    const em = { getComponent: (_id: number, _: string) => ({}) } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 触发trade
    ;(sys as any).trainSkills(em, 100)
    // trainSkills先给bartering +3 → 83，然后触发trade
    // avgSkill=83, profit = floor(83 * 0.5) = floor(41.5) = 41
    expect(traders.get(1)!.profitGenerated).toBe(41)
  })

  // ── getTraders() 返回引用行为 ─────────────────────────────────────────────

  it('getTraders()返回的Map与内部traders相同', () => {
    const traders = (sys as any).traders as Map<number, CreatureTradeSkill>
    traders.set(1, makeTrader(1, { bartering: 20 }))
    expect(sys.getTraders().size).toBe(1)
    expect(sys.getTraders().get(1)!.entityId).toBe(1)
  })

  it('getTraders()修改后影响内部状态', () => {
    sys.getTraders().set(99, makeTrader(99, { diplomacy: 55 }))
    expect((sys as any).traders.size).toBe(1)
    expect((sys as any).traders.get(99)!.skills.diplomacy).toBe(55)
  })
})
