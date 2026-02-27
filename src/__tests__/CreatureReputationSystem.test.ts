import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureReputationSystem } from '../systems/CreatureReputationSystem'
import type { CreatureReputation, ReputationTier } from '../systems/CreatureReputationSystem'

function makeSys(): CreatureReputationSystem { return new CreatureReputationSystem() }
function makeRep(entityId: number, score: number, tier: ReputationTier = 'neutral'): CreatureReputation {
  return { entityId, score, tier, kills: 0, heals: 0, trades: 0, builds: 0, lastAction: '', lastActionTick: 0 }
}

describe('CreatureReputationSystem.getReputation', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('无记录返回undefined', () => { expect(sys.getReputation(999)).toBeUndefined() })
  it('注入后可查询', () => {
    ;(sys as any).reputations.set(1, makeRep(1, 80, 'respected'))
    expect(sys.getReputation(1)?.tier).toBe('respected')
  })
  it('支持所有5种声望等级', () => {
    const tiers: ReputationTier[] = ['infamous', 'disliked', 'neutral', 'respected', 'legendary']
    tiers.forEach((t, i) => { ;(sys as any).reputations.set(i, makeRep(i, i * 20, t)) })
    tiers.forEach((t, i) => { expect(sys.getReputation(i)?.tier).toBe(t) })
  })
})

describe('CreatureReputationSystem.getTopReputation', () => {
  let sys: CreatureReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('空时返回空', () => { expect(sys.getTopReputation(3)).toHaveLength(0) })
  it('按score降序排列', () => {
    ;(sys as any).reputations.set(1, makeRep(1, 50))
    ;(sys as any).reputations.set(2, makeRep(2, 90))
    ;(sys as any).reputations.set(3, makeRep(3, 30))
    const top = sys.getTopReputation(2)
    expect(top[0].score).toBe(90)
    expect(top[1].score).toBe(50)
    expect(top).toHaveLength(2)
  })
})
