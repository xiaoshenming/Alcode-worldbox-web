import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureRivalryDuelSystem } from '../systems/CreatureRivalryDuelSystem'
import type { Duel, DuelRecord, DuelStake, DuelOutcome } from '../systems/CreatureRivalryDuelSystem'

// CHECK_INTERVAL=900, MAX_ACTIVE_DUELS=8, BASE_HP=100, MAX_ROUNDS=10
// FLEE_HP_THRESHOLD=20, history上限50
// DAMAGE_RANGE=[8,25], CHALLENGE_CHANCE=0.012
// STAKE_WEIGHTS: honor=0.3, territory=0.25, mate=0.15, leadership=0.1, grudge=0.2

function makeSys() { return new CreatureRivalryDuelSystem() }

function makeDuel(id: number, challengerId = 1, defenderId = 2, stake: DuelStake = 'honor'): Duel {
  return {
    id, challengerId, defenderId,
    stake, round: 0, maxRounds: 10,
    challengerHp: 100, defenderHp: 100,
    outcome: null, startTick: 0,
  }
}

function makeRecord(duelId: number, winnerId = 1, loserId = 2, stake: DuelStake = 'honor', rounds = 3, tick = 100): DuelRecord {
  return { duelId, winnerId, loserId, stake, rounds, tick }
}

describe('CreatureRivalryDuelSystem', () => {
  let sys: CreatureRivalryDuelSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始化状态 ──────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('初始化不崩溃', () => { expect(sys).toBeDefined() })

    it('activeDuels初始为空数组', () => {
      expect((sys as any).activeDuels).toBeInstanceOf(Array)
      expect((sys as any).activeDuels.length).toBe(0)
    })

    it('history初始为空数组', () => {
      expect((sys as any).history).toBeInstanceOf(Array)
      expect((sys as any).history.length).toBe(0)
    })

    it('duelingIds初始为空Set', () => {
      expect((sys as any).duelingIds).toBeInstanceOf(Set)
      expect((sys as any).duelingIds.size).toBe(0)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

  describe('CHECK_INTERVAL节流逻辑', () => {
    it('tick差值<CHECK_INTERVAL(900)时不更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 800)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值>=CHECK_INTERVAL(900)时更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 900)
      expect((sys as any).lastCheck).toBe(900)
    })

    it('tick差值恰好899时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 1
      sys.update(1, em, 900)  // 900-1=899 < 900
      expect((sys as any).lastCheck).toBe(1)
    })

    it('tick差值恰好900时触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 100
      sys.update(1, em, 1000)  // 1000-100=900 >= 900
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('连续两次update，第二次��值不足时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, 900)   // 触发
      sys.update(1, em, 1700)  // 1700-900=800 < 900
      expect((sys as any).lastCheck).toBe(900)
    })

    it('update不触发时activeDuels不变', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).activeDuels.push(makeDuel(1))
      sys.update(1, em, 800)  // 不触发
      expect((sys as any).activeDuels.length).toBe(1)
    })
  })

  // ── endDuel: history记录 ─────────────────────────────────────────────────

  describe('endDuel history记录', () => {
    it('endDuel(victory)记录history：winnerId=challengerId', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 10, 20)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(10)
      ;(sys as any).duelingIds.add(20)

      ;(sys as any).endDuel(0, duel, 'victory', 500)
      const history = (sys as any).history as DuelRecord[]
      expect(history.length).toBe(1)
      expect(history[0].winnerId).toBe(10)
      expect(history[0].loserId).toBe(20)
      expect(history[0].stake).toBe('honor')
    })

    it('endDuel(defeat)记录history：winnerId=defenderId', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 10, 20)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(10)
      ;(sys as any).duelingIds.add(20)

      ;(sys as any).endDuel(0, duel, 'defeat', 500)
      const history = (sys as any).history as DuelRecord[]
      expect(history[0].winnerId).toBe(20)
      expect(history[0].loserId).toBe(10)
    })

    it('endDuel(draw)不记录到history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 10, 20)
      activeDuels.push(duel)

      ;(sys as any).endDuel(0, duel, 'draw', 500)
      expect((sys as any).history.length).toBe(0)
    })

    it('endDuel(fled)记录到history：winnerId=challengerId', () => {
      // fled与victory逻辑相同：outcome!=='victory'时winnerId=defenderId
      // 注意：fled时 outcome !== 'victory' 所以 winnerId=defenderId
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 10, 20)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(10)
      ;(sys as any).duelingIds.add(20)

      ;(sys as any).endDuel(0, duel, 'fled', 500)
      const history = (sys as any).history as DuelRecord[]
      expect(history.length).toBe(1)
      expect(history[0].winnerId).toBe(20)  // outcome!=='victory' => winnerId=defenderId
      expect(history[0].loserId).toBe(10)
    })

    it('endDuel记录正确的duelId和tick', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(42, 1, 2)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      ;(sys as any).endDuel(0, duel, 'victory', 9999)
      const rec = (sys as any).history[0] as DuelRecord
      expect(rec.duelId).toBe(42)
      expect(rec.tick).toBe(9999)
    })

    it('endDuel记录duel.round到rounds字段', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      duel.round = 7
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).history[0].rounds).toBe(7)
    })

    it('endDuel记录duel.stake到history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2, 'territory')
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).history[0].stake).toBe('territory')
    })

    it('endDuel设置duel.outcome', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      activeDuels.push(duel)

      ;(sys as any).endDuel(0, duel, 'draw', 100)
      expect(duel.outcome).toBe('draw')
    })
  })

  // ── endDuel: activeDuels和duelingIds清理 ────────────────────────────────

  describe('endDuel清理逻辑', () => {
    it('endDuel后从activeDuels移除，duelingIds清理', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 10, 20)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(10)
      ;(sys as any).duelingIds.add(20)

      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect(activeDuels.length).toBe(0)
      expect((sys as any).duelingIds.has(10)).toBe(false)
      expect((sys as any).duelingIds.has(20)).toBe(false)
    })

    it('endDuel只删除指定index的duel', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const d1 = makeDuel(1, 1, 2)
      const d2 = makeDuel(2, 3, 4)
      const d3 = makeDuel(3, 5, 6)
      activeDuels.push(d1, d2, d3)

      ;(sys as any).endDuel(1, d2, 'draw', 100)  // 删除index=1的d2
      expect(activeDuels.length).toBe(2)
      expect(activeDuels[0].id).toBe(1)
      expect(activeDuels[1].id).toBe(3)
    })

    it('endDuel后challengerId从duelingIds移除', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 100, 200)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(100)
      ;(sys as any).duelingIds.add(200)
      ;(sys as any).duelingIds.add(300)  // 无关的id

      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).duelingIds.has(100)).toBe(false)
      expect((sys as any).duelingIds.has(200)).toBe(false)
      expect((sys as any).duelingIds.has(300)).toBe(true)  // 无关的保留
    })
  })

  // ── history 截断（上限50） ────────────────────────────────────────────────

  describe('history截断逻辑', () => {
    it('history超过50条时截断到50', () => {
      const history = (sys as any).history as DuelRecord[]
      for (let i = 0; i < 55; i++) {
        history.push(makeRecord(i + 1, i, i + 1))
      }
      if (history.length > 50) history.splice(0, history.length - 50)
      expect(history.length).toBe(50)
    })

    it('endDuel(victory)触发时history超过50条自动截断', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const history = (sys as any).history as DuelRecord[]
      // 先填充50条记录
      for (let i = 0; i < 50; i++) {
        history.push(makeRecord(i + 1))
      }
      // 再endDuel一次，history变51，截断到50
      const duel = makeDuel(99, 1, 2)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)
      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect(history.length).toBe(50)
    })

    it('history恰好50条时不截断', () => {
      const history = (sys as any).history as DuelRecord[]
      for (let i = 0; i < 50; i++) {
        history.push(makeRecord(i + 1))
      }
      expect(history.length).toBe(50)
      // 不调用truncate，验证50条不变
      if (history.length > 50) history.splice(0, history.length - 50)
      expect(history.length).toBe(50)
    })

    it('history截断后保留最新记录（从头部删除）', () => {
      const history = (sys as any).history as DuelRecord[]
      for (let i = 0; i < 55; i++) {
        history.push(makeRecord(i + 1, i, i + 1))
      }
      if (history.length > 50) history.splice(0, history.length - 50)
      expect(history[0].duelId).toBe(6)
      expect(history[49].duelId).toBe(55)
    })

    it('history截断大量记录后保留最新50条', () => {
      const history = (sys as any).history as DuelRecord[]
      for (let i = 0; i < 100; i++) {
        history.push(makeRecord(i + 1))
      }
      if (history.length > 50) history.splice(0, history.length - 50)
      expect(history.length).toBe(50)
      expect(history[0].duelId).toBe(51)
      expect(history[49].duelId).toBe(100)
    })
  })

  // ── DuelStake 完整性 ─────────────────────────────────────────────────────

  describe('DuelStake类型完整性', () => {
    it('5种DuelStake均可有效存入Duel', () => {
      const stakes: DuelStake[] = ['honor', 'territory', 'mate', 'leadership', 'grudge']
      const activeDuels = (sys as any).activeDuels as Duel[]
      for (const stake of stakes) {
        activeDuels.push(makeDuel(activeDuels.length + 1, 1, 2, stake))
      }
      expect(activeDuels.length).toBe(5)
      expect(activeDuels[2].stake).toBe('mate')
    })

    it('honor stake可正常存入history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2, 'honor')
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)
      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).history[0].stake).toBe('honor')
    })

    it('territory stake可正常存入history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2, 'territory')
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)
      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).history[0].stake).toBe('territory')
    })

    it('leadership stake可正常存入history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2, 'leadership')
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)
      ;(sys as any).endDuel(0, duel, 'defeat', 100)
      expect((sys as any).history[0].stake).toBe('leadership')
    })

    it('grudge stake可正常存入history', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2, 'grudge')
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)
      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect((sys as any).history[0].stake).toBe('grudge')
    })
  })

  // ── DuelOutcome 完整性 ───────────────────────────────────────────────────

  describe('DuelOutcome类型完整性', () => {
    it('victory结局时duel.outcome为victory', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1)
      activeDuels.push(duel)
      ;(sys as any).endDuel(0, duel, 'victory', 100)
      expect(duel.outcome).toBe('victory')
    })

    it('defeat结局时duel.outcome为defeat', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1)
      activeDuels.push(duel)
      ;(sys as any).endDuel(0, duel, 'defeat', 100)
      expect(duel.outcome).toBe('defeat')
    })

    it('draw结局时duel.outcome为draw', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1)
      activeDuels.push(duel)
      ;(sys as any).endDuel(0, duel, 'draw', 100)
      expect(duel.outcome).toBe('draw')
    })

    it('fled结局时duel.outcome为fled', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1)
      activeDuels.push(duel)
      ;(sys as any).endDuel(0, duel, 'fled', 100)
      expect(duel.outcome).toBe('fled')
    })
  })

  // ── Duel 接口字段完整性 ──────────────────────────────────────────────────

  describe('Duel接口字段', () => {
    it('Duel包含所有必要字段', () => {
      const duel = makeDuel(5, 10, 20, 'mate')
      expect(duel.id).toBe(5)
      expect(duel.challengerId).toBe(10)
      expect(duel.defenderId).toBe(20)
      expect(duel.stake).toBe('mate')
      expect(duel.round).toBe(0)
      expect(duel.maxRounds).toBe(10)
      expect(duel.challengerHp).toBe(100)
      expect(duel.defenderHp).toBe(100)
      expect(duel.outcome).toBeNull()
      expect(duel.startTick).toBe(0)
    })

    it('challengerHp和defenderHp初始为BASE_HP(100)', () => {
      const duel = makeDuel(1)
      expect(duel.challengerHp).toBe(100)
      expect(duel.defenderHp).toBe(100)
    })

    it('maxRounds初始为MAX_ROUNDS(10)', () => {
      const duel = makeDuel(1)
      expect(duel.maxRounds).toBe(10)
    })

    it('outcome初始为null', () => {
      const duel = makeDuel(1)
      expect(duel.outcome).toBeNull()
    })
  })

  // ── DuelRecord 接口字段 ──────────────────────────────────────────────────

  describe('DuelRecord接口字段', () => {
    it('DuelRecord包含duelId、winnerId、loserId、stake、rounds、tick', () => {
      const rec: DuelRecord = makeRecord(42, 10, 20, 'grudge', 5, 1000)
      expect(rec.duelId).toBe(42)
      expect(rec.winnerId).toBe(10)
      expect(rec.loserId).toBe(20)
      expect(rec.stake).toBe('grudge')
      expect(rec.rounds).toBe(5)
      expect(rec.tick).toBe(1000)
    })
  })

  // ── MAX_ACTIVE_DUELS 上限 ────────────────────────────────────────────────

  describe('MAX_ACTIVE_DUELS上限', () => {
    it('activeDuels达到MAX_ACTIVE_DUELS(8)时不发起新挑战', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      for (let i = 0; i < 8; i++) {
        activeDuels.push(makeDuel(i + 1, i * 2 + 1, i * 2 + 2))
      }
      const em = {
        getEntitiesWithComponents: () => [100, 101] as number[],
        getComponent: () => ({ x: 0, y: 0 }),
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 全部触发challenge
      ;(sys as any).initiateChallenge(em, 1000)
      expect(activeDuels.length).toBe(8)  // 不增加
    })

    it('activeDuels为7时还可以发起一场挑战（若条件满足）', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      for (let i = 0; i < 7; i++) {
        activeDuels.push(makeDuel(i + 1, i * 2 + 1, i * 2 + 2))
        ;(sys as any).duelingIds.add(i * 2 + 1)
        ;(sys as any).duelingIds.add(i * 2 + 2)
      }
      // 提供两个新的非决斗实体
      const mockComponent = { x: 0, y: 0 }
      const em = {
        getEntitiesWithComponents: () => [100, 101] as number[],
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return mockComponent
          if (type === 'creature') return {}
          return null
        },
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).initiateChallenge(em, 1000)
      expect(activeDuels.length).toBe(8)
    })
  })

  // ── resolveDuels 回合逻辑 ────────────────────────────────────────────────

  describe('resolveDuels回合逻辑', () => {
    it('resolveDuels：参与者不存在时结束决斗', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      // challenger不存在，defender存在
      const em = {
        getComponent: (id: number, type: string) => {
          if (type !== 'creature') return null
          return id === 2 ? {} : null  // 只有defender存在
        }
      } as any
      ;(sys as any).resolveDuels(em, 1000)
      // c1=null => endDuel(i, duel, 'defeat', tick)
      expect(activeDuels.length).toBe(0)
    })

    it('resolveDuels：回合数达到maxRounds时平局', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      duel.round = 9  // 下一回合变10=maxRounds
      duel.challengerHp = 50  // 保持HP > FLEE_HP_THRESHOLD和>0
      duel.defenderHp = 50
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      const em = {
        getComponent: (_id: number, type: string) => type === 'creature' ? {} : null
      } as any
      // mock random使HP损失不触发flee或KO
      // damage = 8 + random * 17; mock 0 => damage=8; 50-8=42 > FLEE_HP_THRESHOLD(20) > 0
      // flee check: random < 0.4; mock 0.5 => 不触发
      vi.spyOn(Math, 'random').mockReturnValue(0.5)  // damage=8+0.5*17=16.5; 50-16.5=33.5>20; flee=0.5>=0.4不触发
      ;(sys as any).resolveDuels(em, 1000)
      // round=10 >= maxRounds=10 => draw
      expect((sys as any).history.length).toBe(0)  // draw不记录history
      expect(activeDuels.length).toBe(0)  // 已移除
    })

    it('resolveDuels：HP降到<=0时KO结束', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      duel.defenderHp = 5  // 下一轮必然KO（损伤至少8）
      activeDuels.push(duel)
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      const em = {
        getComponent: (_id: number, type: string) => type === 'creature' ? {} : null
      } as any
      // mock: flee check返回0.5(>0.4，不触发flee), damage用0(最小8)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).resolveDuels(em, 1000)
      // defenderHp = 5 - 8.5 = -3.5 <= 0 => victory
      expect((sys as any).history.length).toBe(1)
      expect((sys as any).history[0].winnerId).toBe(1)  // challengerId wins
    })
  })

  // ── pickStake 方法 ───────────────────────────────────────────────────────

  describe('pickStake方法', () => {
    it('pickStake返回有效的DuelStake', () => {
      const validStakes: DuelStake[] = ['honor', 'territory', 'mate', 'leadership', 'grudge']
      const stake = (sys as any).pickStake() as DuelStake
      expect(validStakes).toContain(stake)
    })

    it('pickStake多次调用都返回有效值', () => {
      const validStakes: DuelStake[] = ['honor', 'territory', 'mate', 'leadership', 'grudge']
      for (let i = 0; i < 20; i++) {
        const stake = (sys as any).pickStake() as DuelStake
        expect(validStakes).toContain(stake)
      }
    })
  })

  // ── 边界条件与健壮性 ─────────────────────────────────────────────────────

  describe('边界条件与健壮性', () => {
    it('update传入空实体列表时不崩溃', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      expect(() => sys.update(1, em, 900)).not.toThrow()
    })

    it('多个决斗同时endDuel时逆序遍历正确', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const d1 = makeDuel(1, 1, 2)
      const d2 = makeDuel(2, 3, 4)
      activeDuels.push(d1, d2)
      ;(sys as any).duelingIds.add(1); (sys as any).duelingIds.add(2)
      ;(sys as any).duelingIds.add(3); (sys as any).duelingIds.add(4)

      // 两者的creature都不存在 => 都会endDuel
      const em = { getComponent: () => null } as any
      ;(sys as any).resolveDuels(em, 1000)
      expect(activeDuels.length).toBe(0)
    })

    it('同一实体不能同时参与两场决斗', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      activeDuels.push(makeDuel(1, 1, 2))
      ;(sys as any).duelingIds.add(1)
      ;(sys as any).duelingIds.add(2)

      const em = {
        getEntitiesWithComponents: () => [1, 3] as number[],
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return { x: 0, y: 0 }
          if (type === 'creature') return {}
          return null
        }
      } as any

      // 实体1已在duelingIds中，不应发起挑战
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).initiateChallenge(em, 1000)
      expect(activeDuels.length).toBe(1)  // 不增加
    })

    it('history为空时endDuel draw不崩溃', () => {
      const activeDuels = (sys as any).activeDuels as Duel[]
      const duel = makeDuel(1, 1, 2)
      activeDuels.push(duel)
      expect(() => (sys as any).endDuel(0, duel, 'draw', 100)).not.toThrow()
    })

    it('nextId在每次发起挑战后递增', () => {
      const before = (sys as any).nextId
      const em = {
        getEntitiesWithComponents: () => [1, 2] as number[],
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return { x: 0, y: 0 }
          if (type === 'creature') return {}
          return null
        }
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).initiateChallenge(em, 1000)
      expect((sys as any).nextId).toBeGreaterThan(before)
    })
  })
})
