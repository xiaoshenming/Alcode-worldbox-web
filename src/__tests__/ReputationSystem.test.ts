import { describe, it, expect, beforeEach } from 'vitest'
import { ReputationSystem } from '../systems/ReputationSystem'
import type { ReputationLevel } from '../systems/ReputationSystem'

function makeSys(): ReputationSystem { return new ReputationSystem() }

describe('ReputationSystem.getReputation', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回0', () => {
    expect(sys.getReputation(1)).toBe(0)
  })
  it('设置后可查询', () => {
    ;(sys as any).reputations.set(1, 75)
    expect(sys.getReputation(1)).toBe(75)
  })
  it('不同文明声望相互独立', () => {
    ;(sys as any).reputations.set(1, 80)
    ;(sys as any).reputations.set(2, -50)
    expect(sys.getReputation(1)).toBe(80)
    expect(sys.getReputation(2)).toBe(-50)
  })
})

describe('ReputationSystem.getReputationLevel', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('0声望返回neutral', () => {
    expect(sys.getReputationLevel(1)).toBe('neutral')
  })
  it('高声望返回revered', () => {
    ;(sys as any).reputations.set(1, 90)
    expect(sys.getReputationLevel(1)).toBe('revered')
  })
  it('低声望返回despised', () => {
    ;(sys as any).reputations.set(1, -90)
    expect(sys.getReputationLevel(1)).toBe('despised')
  })
  it('支持5种声望等级', () => {
    const cases: [number, ReputationLevel][] = [
      [90, 'revered'], [50, 'respected'], [0, 'neutral'], [-50, 'distrusted'], [-90, 'despised']
    ]
    cases.forEach(([score, level], i) => {
      ;(sys as any).reputations.set(i + 1, score)
      expect(sys.getReputationLevel(i + 1)).toBe(level)
    })
  })
})

describe('ReputationSystem bonus getters', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  // getDiplomacyModifier: 0声望->0, 正声望->正值, 负声望->负值
  it('getDiplomacyModifier在0声望时返回0', () => {
    expect(sys.getDiplomacyModifier(1)).toBe(0)
  })
  it('高声望getDiplomacyModifier更高', () => {
    ;(sys as any).reputations.set(1, 100)
    ;(sys as any).reputations.set(2, -100)
    expect(sys.getDiplomacyModifier(1)).toBeGreaterThan(sys.getDiplomacyModifier(2))
  })
  // getTradeWillingness: 0声望->1.0
  it('getTradeWillingness在0声望时返回1.0', () => {
    expect(sys.getTradeWillingness(1)).toBe(1.0)
  })
  it('高声望getTradeWillingness>1.0', () => {
    ;(sys as any).reputations.set(1, 100)
    expect(sys.getTradeWillingness(1)).toBeGreaterThan(1.0)
  })
})
