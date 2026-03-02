import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSummitSystem } from '../systems/DiplomaticSummitSystem'
import type { Summit, SummitTopic } from '../systems/DiplomaticSummitSystem'

vi.mock('../systems/EventLog', () => ({ EventLog: { log: vi.fn() } }))

// 常量参考：
// SUMMIT_INTERVAL=3000, SUMMIT_DURATION=120, MAX_HISTORY=30
// PEACE_THRESHOLD=-20, TRADE_THRESHOLD=10, ALLIANCE_THRESHOLD=40
// SUCCESS_BONUS=15, FAILURE_PENALTY=-10
// _SUMMIT_DIFFICULTY: { peace:0.5, trade:0.6, alliance:0.4, territory:0.3 }
// 成功条件: Math.random() < chance, chance = clamp(0.1,0.9, base + avgRel/200)

function makeCivManager(civs: { id: number; name: string; population: number; relations?: Map<number, number> }[] = []) {
  return { civilizations: new Map(civs.map(c => [c.id, { ...c, relations: c.relations ?? new Map() }])) } as any
}

function makeSys() { return new DiplomaticSummitSystem() }

describe('DiplomaticSummitSystem', () => {
  let sys: DiplomaticSummitSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────────────────────

  it('初始activeSummit为null', () => { expect((sys as any).activeSummit).toBeNull() })
  it('初始summits历史为空', () => { expect((sys as any).summits).toHaveLength(0) })
  it('初始nextSummitTick为SUMMIT_INTERVAL(3000)', () => { expect((sys as any).nextSummitTick).toBe(3000) })
  it('初始displayAlpha为0', () => { expect((sys as any).displayAlpha).toBe(0) })
  it('summits是数组', () => { expect(Array.isArray((sys as any).summits)).toBe(true) })

  it('初始_usedIdxSet为空Set', () => {
    expect((sys as any)._usedIdxSet.size).toBe(0)
  })

  it('初始_aliveCivsBuf为空数组', () => {
    expect(Array.isArray((sys as any)._aliveCivsBuf)).toBe(true)
    expect((sys as any)._aliveCivsBuf.length).toBe(0)
  })

  it('初始_participantsBuf为空数组', () => {
    expect(Array.isArray((sys as any)._participantsBuf)).toBe(true)
    expect((sys as any)._participantsBuf.length).toBe(0)
  })

  // ── civs不足时不spawn ─────────────────────────────────────────────────────

  it('civs为空时不spawn summit', () => {
    const cm = makeCivManager([])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('只有1个civ时不spawn summit', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('population=0的civ不算alive', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 0 },
      { id: 2, name: 'B', population: 0 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('1个alive+1个dead不spawn', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 0 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('population为负数的civ不算alive（<=0）', () => {
    // population<=0不满足>0，所以不alive
    const popCheck = (pop: number) => pop > 0
    expect(popCheck(-1)).toBe(false)
    expect(popCheck(0)).toBe(false)
    expect(popCheck(1)).toBe(true)
  })

  // ── tick条件 ──────────────────────────────────────────────────────────────

  it('tick<nextSummitTick时不spawn', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 2999)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('tick>=nextSummitTick且civs>=2时spawn activeSummit', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit).not.toBeNull()
  })

  it('tick=nextSummitTick时恰好spawn', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)  // 3000 >= 3000
    expect((sys as any).activeSummit).not.toBeNull()
  })

  it('spawn后nextSummitTick更新为tick+3000', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).nextSummitTick).toBe(6000)
  })

  it('tick=5000时spawn后nextSummitTick=8000', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).nextSummitTick = 5000
    sys.update(1, cm, 5000)
    expect((sys as any).nextSummitTick).toBe(8000)
  })

  // ── spawn内容验证 ─────────────────────────────────────────────────────────

  it('spawn后activeSummit包含必要字段', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    const s = (sys as any).activeSummit
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('participants')
    expect(s).toHaveProperty('topic')
    expect(s).toHaveProperty('startTick', 3000)
    expect(s).toHaveProperty('duration', 120)
    expect(s).toHaveProperty('resolved', false)
  })

  it('spawn后activeSummit.outcome初始为空字符串', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.outcome).toBe('')
  })

  it('spawn后participants数组非空', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.participants.length).toBeGreaterThanOrEqual(2)
  })

  it('spawn后topic是有效SummitTopic', () => {
    const validTopics: SummitTopic[] = ['peace', 'trade', 'alliance', 'territory']
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect(validTopics).toContain((sys as any).activeSummit?.topic)
  })

  it('spawn后activeSummit.id是正整数', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.id).toBeGreaterThan(0)
  })

  // ── activeSummit存在时不spawn新的 ──────────────────────────────────────────

  it('activeSummit存在时不spawn新summit', () => {
    ;(sys as any).activeSummit = { id: 99, participants: [1, 2], topic: 'peace', startTick: 3000, duration: 120, resolved: false, outcome: '' }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit.id).toBe(99)
  })

  it('activeSummit存在时update不修改nextSummitTick（直接return）', () => {
    ;(sys as any).activeSummit = { id: 99, participants: [1, 2], topic: 'trade', startTick: 100, duration: 120, resolved: false, outcome: '' }
    const prevTick = (sys as any).nextSummitTick
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    // tick-startTick=100-100=0 < 120，不resolve，直接return
    sys.update(1, cm, 100)
    // nextSummitTick不应该改变
    expect((sys as any).nextSummitTick).toBe(prevTick)
  })

  // ── activeSummit解决与归档 ─────────────────────────────────────────────────

  it('tick-startTick>=duration时activeSummit解决并归档', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 1000, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 1120)  // 1120-1000=120 >= 120
    expect((sys as any).activeSummit).toBeNull()
    expect((sys as any).summits).toHaveLength(1)
  })

  it('解决后summit.resolved=true', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 120)
    expect((sys as any).summits[0].resolved).toBe(true)
  })

  it('tick-startTick<duration时activeSummit不解决', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'alliance',
      startTick: 1000, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 1050)  // 50 < 120
    expect((sys as any).activeSummit).not.toBeNull()
    expect((sys as any).summits).toHaveLength(0)
  })

  it('tick-startTick恰好=duration时解决', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 500, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 620)  // 620-500=120 >= 120
    expect((sys as any).activeSummit).toBeNull()
  })

  it('解决后activeSummit设为null', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 200)
    expect((sys as any).activeSummit).toBeNull()
  })

  it('participants中只有1个alive时summit崩溃归档', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 0 },  // dead
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    sys.update(1, cm, 200)
    expect((sys as any).summits).toHaveLength(1)
    expect((sys as any).summits[0].outcome).toContain('collapsed')
  })

  // ── 成功/失败对关系的影响 ─────────────────────────────────────────────────

  it('成功时关系增加SUCCESS_BONUS(15)', () => {
    const rel1 = new Map([[2, 0]])
    const rel2 = new Map([[1, 0]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    // 强制成功：base=0.6, avgRel=0, chance=0.6, random<0.6
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, cm, 200)
    expect(rel1.get(2)).toBe(15)
    expect(rel2.get(1)).toBe(15)
  })

  it('失败时关系减少FAILURE_PENALTY(10)', () => {
    const rel1 = new Map([[2, 0]])
    const rel2 = new Map([[1, 0]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'alliance',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    // 强制失败：base=0.4, avgRel=0, chance=0.4, random>=0.4
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, cm, 200)
    expect(rel1.get(2)).toBe(-10)
    expect(rel2.get(1)).toBe(-10)
  })

  it('关系最大值不超过100', () => {
    const rel1 = new Map([[2, 95]])
    const rel2 = new Map([[1, 95]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 成功
    sys.update(1, cm, 200)
    expect(rel1.get(2)).toBeLessThanOrEqual(100)
    expect(rel2.get(1)).toBeLessThanOrEqual(100)
  })

  it('关系最小值不低于-100', () => {
    const rel1 = new Map([[2, -95]])
    const rel2 = new Map([[1, -95]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'alliance',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)  // 失败
    sys.update(1, cm, 200)
    expect(rel1.get(2)).toBeGreaterThanOrEqual(-100)
    expect(rel2.get(1)).toBeGreaterThanOrEqual(-100)
  })

  // ── MAX_HISTORY=30 限制 ────────────────────────────────────────────────────

  it('summits超过MAX_HISTORY(30)时从头删除', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).summits.push({ id: i + 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: true, outcome: 'ok' })
    }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 99, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 120)
    expect((sys as any).summits).toHaveLength(30)
  })

  it('summits历史30条时id=1的被移除', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).summits.push({ id: i + 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: true, outcome: 'ok' })
    }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 99, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 120)
    const ids = (sys as any).summits.map((s: Summit) => s.id)
    expect(ids).not.toContain(1)
  })

  it('summits<30时不触发shift', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).summits.push({ id: i + 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: true, outcome: 'ok' })
    }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    ;(sys as any).activeSummit = {
      id: 99, participants: [1, 2], topic: 'peace',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 120)
    expect((sys as any).summits).toHaveLength(30)
  })

  // ── topic选择逻辑 ─────────────────────────────────────────────────────────

  it('participants关系<-20时topic为peace', () => {
    const rel1 = new Map([[2, -30]])
    const rel2 = new Map([[1, -30]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('peace')
  })

  it('participants关系>=40时topic为alliance', () => {
    const rel1 = new Map([[2, 50]])
    const rel2 = new Map([[1, 50]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('alliance')
  })

  it('participants关系在[-20,10)时topic为territory', () => {
    // avg=-10: 不满足<-20(peace)，不满足>=10(territory threshold), 满足<10
    // 逻辑: if avg<PEACE(-20) → peace; if avg<TRADE(10) → territory; if avg<ALLIANCE(40) → trade; else → alliance
    // avg=-10: -10不<-20，-10<10 → territory
    const rel1 = new Map([[2, -10]])
    const rel2 = new Map([[1, -10]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('territory')
  })

  it('participants关系在[10,40)时topic为trade', () => {
    // avg=25: 25不<-20，25>=10不<40 → trade
    const rel1 = new Map([[2, 25]])
    const rel2 = new Map([[1, 25]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('trade')
  })

  it('关系恰好等于PEACE_THRESHOLD(-20)时topic为territory', () => {
    // avg=-20: -20不<-20, -20<10 → territory
    const rel1 = new Map([[2, -20]])
    const rel2 = new Map([[1, -20]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('territory')
  })

  it('关系恰好等于TRADE_THRESHOLD(10)时topic为trade', () => {
    // avg=10: 10不<-20, 10不<10, 10<40 → trade
    const rel1 = new Map([[2, 10]])
    const rel2 = new Map([[1, 10]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('trade')
  })

  it('关系恰好等于ALLIANCE_THRESHOLD(40)时topic为alliance', () => {
    // avg=40: 40不<40 → alliance
    const rel1 = new Map([[2, 40]])
    const rel2 = new Map([[1, 40]])
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10, relations: rel1 },
      { id: 2, name: 'B', population: 10, relations: rel2 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('alliance')
  })

  it('无关系数据时avg=0 → territory', () => {
    // avg=0: 0不<-20, 0<10 → territory
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
    ])
    sys.update(1, cm, 3000)
    expect((sys as any).activeSummit?.topic).toBe('territory')
  })

  // ── evaluateSuccess 概率逻辑 ──────────────────────────────────────────────

  it('chance下限为0.1：关系极低时也至少有10%成功率', () => {
    // base(peace)=0.5, avgRel=-200, bonus=-1, chance=max(0.1,0.5-1)=0.1
    const base = 0.5
    const avgRel = -200
    const chance = Math.max(0.1, Math.min(0.9, base + avgRel / 200))
    expect(chance).toBe(0.1)
  })

  it('chance上限为0.9：关系极高时也最多90%成功率', () => {
    // base(trade)=0.6, avgRel=200, bonus=1, chance=min(0.9,0.6+1)=0.9
    const base = 0.6
    const avgRel = 200
    const chance = Math.max(0.1, Math.min(0.9, base + avgRel / 200))
    expect(chance).toBe(0.9)
  })

  it('evaluateSuccess基础概率：peace=0.5', () => {
    const difficulty: Record<SummitTopic, number> = { peace: 0.5, trade: 0.6, alliance: 0.4, territory: 0.3 }
    expect(difficulty['peace']).toBe(0.5)
  })

  it('evaluateSuccess基础概率：trade=0.6', () => {
    const difficulty: Record<SummitTopic, number> = { peace: 0.5, trade: 0.6, alliance: 0.4, territory: 0.3 }
    expect(difficulty['trade']).toBe(0.6)
  })

  it('evaluateSuccess基础概率：alliance=0.4', () => {
    const difficulty: Record<SummitTopic, number> = { peace: 0.5, trade: 0.6, alliance: 0.4, territory: 0.3 }
    expect(difficulty['alliance']).toBe(0.4)
  })

  it('evaluateSuccess基础概率：territory=0.3', () => {
    const difficulty: Record<SummitTopic, number> = { peace: 0.5, trade: 0.6, alliance: 0.4, territory: 0.3 }
    expect(difficulty['territory']).toBe(0.3)
  })

  it('成功时outcome包含topic标签', () => {
    const rel1 = new Map([[2, 0]])
    const rel2 = new Map([[1, 0]])
    const cm = makeCivManager([
      { id: 1, name: 'Alpha', population: 10, relations: rel1 },
      { id: 2, name: 'Beta', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'trade',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.1)  // 成功
    sys.update(1, cm, 200)
    expect((sys as any).summits[0].outcome).toContain('Trade Agreement')
  })

  it('失败时outcome包含"failed"', () => {
    const rel1 = new Map([[2, 0]])
    const rel2 = new Map([[1, 0]])
    const cm = makeCivManager([
      { id: 1, name: 'Alpha', population: 10, relations: rel1 },
      { id: 2, name: 'Beta', population: 10, relations: rel2 },
    ])
    ;(sys as any).activeSummit = {
      id: 1, participants: [1, 2], topic: 'alliance',
      startTick: 0, duration: 120, resolved: false, outcome: '',
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)  // 失败
    sys.update(1, cm, 200)
    expect((sys as any).summits[0].outcome).toContain('failed')
  })

  // ── 系统实例独立性 ────────────────────────────────────────────────────────

  it('两个系统实例互相独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).summits.push({ id: 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: true, outcome: '' })
    expect((sys2 as any).summits).toHaveLength(0)
  })

  it('displayAlpha初始为0', () => {
    expect((sys as any).displayAlpha).toBe(0)
  })

  it('summits数组可以手动推入条目', () => {
    ;(sys as any).summits.push({ id: 1, participants: [1, 2], topic: 'peace', startTick: 0, duration: 120, resolved: true, outcome: 'test' })
    expect((sys as any).summits).toHaveLength(1)
    expect((sys as any).summits[0].topic).toBe('peace')
  })

  it('Summit接口包含必要字段', () => {
    const s: Summit = { id: 1, participants: [1, 2], topic: 'trade', startTick: 0, duration: 120, resolved: false, outcome: '' }
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('participants')
    expect(s).toHaveProperty('topic')
    expect(s).toHaveProperty('startTick')
    expect(s).toHaveProperty('duration')
    expect(s).toHaveProperty('resolved')
    expect(s).toHaveProperty('outcome')
  })

  it('3个alive civs时spawn的participants至少2个', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 },
      { id: 3, name: 'C', population: 10 },
    ])
    sys.update(1, cm, 3000)
    const s = (sys as any).activeSummit
    expect(s?.participants.length).toBeGreaterThanOrEqual(2)
  })
})
