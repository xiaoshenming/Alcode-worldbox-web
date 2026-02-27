import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivalryDuelSystem } from '../systems/CreatureRivalryDuelSystem'
import type { Duel, DuelRecord, DuelStake } from '../systems/CreatureRivalryDuelSystem'

let nextId = 1
function makeSys(): CreatureRivalryDuelSystem { return new CreatureRivalryDuelSystem() }
function makeDuel(challengerId: number, defenderId: number, stake: DuelStake = 'honor'): Duel {
  return { id: nextId++, challengerId, defenderId, stake, round: 1, maxRounds: 5, challengerHp: 100, defenderHp: 100, outcome: null, startTick: 0 }
}
function makeRecord(duelId: number, winnerId: number, loserId: number): DuelRecord {
  return { duelId, winnerId, loserId, stake: 'honor' as DuelStake, rounds: 3, tick: 0 }
}

describe('CreatureRivalryDuelSystem getters', () => {
  let sys: CreatureRivalryDuelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无决斗', () => { expect(sys.getActiveDuels()).toHaveLength(0) })
  it('注入后可查询activeDuels', () => {
    ;(sys as any).activeDuels.push(makeDuel(1, 2, 'territory'))
    expect(sys.getActiveDuels()[0].stake).toBe('territory')
  })
  it('getActiveDuels返回内部引用', () => {
    ;(sys as any).activeDuels.push(makeDuel(1, 2))
    expect(sys.getActiveDuels()).toBe((sys as any).activeDuels)
  })
  it('getDuelHistory返回内部history引用', () => {
    ;(sys as any).history.push(makeRecord(1, 1, 2))
    expect(sys.getDuelHistory()).toBe((sys as any).history)
  })
  it('支持所有5种决斗赌注', () => {
    const stakes: DuelStake[] = ['honor', 'territory', 'mate', 'leadership', 'grudge']
    stakes.forEach((s, i) => { ;(sys as any).activeDuels.push(makeDuel(i + 1, i + 2, s)) })
    const all = sys.getActiveDuels()
    stakes.forEach((s, i) => { expect(all[i].stake).toBe(s) })
  })
  it('outcome初始为null', () => {
    ;(sys as any).activeDuels.push(makeDuel(1, 2))
    expect(sys.getActiveDuels()[0].outcome).toBeNull()
  })
})
