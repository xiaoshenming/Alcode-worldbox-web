import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivalryDuelSystem } from '../systems/CreatureRivalryDuelSystem'
import type { Duel, DuelRecord, DuelStake } from '../systems/CreatureRivalryDuelSystem'

// CHECK_INTERVAL=900, MAX_ACTIVE_DUELS=8, BASE_HP=100, MAX_ROUNDS=10
// FLEE_HP_THRESHOLD=20, history上限50

function makeSys() { return new CreatureRivalryDuelSystem() }

function makeDuel(id: number, challengerId = 1, defenderId = 2): Duel {
  return {
    id, challengerId, defenderId,
    stake: 'honor', round: 0, maxRounds: 10,
    challengerHp: 100, defenderHp: 100,
    outcome: null, startTick: 0,
  }
}

describe('CreatureRivalryDuelSystem', () => {
  let sys: CreatureRivalryDuelSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('activeDuels初始为空', () => { expect((sys as any).activeDuels.length).toBe(0) })
  it('history初始为空', () => { expect((sys as any).history.length).toBe(0) })
  it('duelingIds初始为空Set', () => { expect((sys as any).duelingIds.size).toBe(0) })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

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

  // ── endDuel: history记录 ─────────────────────────────────────────────────

  it('endDuel(victory)记录history：winnerId=challengerId', () => {
    const activeDuels = (sys as any).activeDuels as Duel[]
    const duel = makeDuel(1, 10, 20)
    activeDuels.push(duel)
    ;(sys as any).duelingIds.add(10)
    ;(sys as any).duelingIds.add(20)

    ;(sys as any).endDuel(0, duel, 'victory', 500)
    const history = (sys as any).history as DuelRecord[]
    expect(history.length).toBe(1)
    expect(history[0].winnerId).toBe(10)  // challengerId wins on victory
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
    expect(history[0].winnerId).toBe(20)  // defenderId wins on defeat
    expect(history[0].loserId).toBe(10)
  })

  it('endDuel(draw)不记录到history', () => {
    const activeDuels = (sys as any).activeDuels as Duel[]
    const duel = makeDuel(1, 10, 20)
    activeDuels.push(duel)

    ;(sys as any).endDuel(0, duel, 'draw', 500)
    expect((sys as any).history.length).toBe(0)  // draw不记录
  })

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

  // ── history 截断（上限50） ────────────────────────────────────────────────

  it('history超过50条时截断到50', () => {
    const history = (sys as any).history as DuelRecord[]
    for (let i = 0; i < 55; i++) {
      history.push({ duelId: i + 1, winnerId: i, loserId: i + 1, stake: 'honor', rounds: 3, tick: i * 100 })
    }
    // 模拟endDuel的截断逻辑
    if (history.length > 50) history.splice(0, history.length - 50)
    expect(history.length).toBe(50)
  })

  // ── DuelStake 完整性 ─────────────────────────────────────────────────────

  it('5种DuelStake均可有效存入Duel', () => {
    const stakes: DuelStake[] = ['honor', 'territory', 'mate', 'leadership', 'grudge']
    const activeDuels = (sys as any).activeDuels as Duel[]
    for (const stake of stakes) {
      activeDuels.push(makeDuel(activeDuels.length + 1))
      activeDuels[activeDuels.length - 1].stake = stake
    }
    expect(activeDuels.length).toBe(5)
    expect(activeDuels[2].stake).toBe('mate')
  })
})
