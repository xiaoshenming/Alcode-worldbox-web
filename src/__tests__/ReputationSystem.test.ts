import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReputationSystem } from '../systems/ReputationSystem'
import type { ReputationLevel, ReputationAction } from '../systems/ReputationSystem'

function makeSys(): ReputationSystem { return new ReputationSystem() }

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
// getReputation
// ─────────────────────────────────────────────────────────────────────────────
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

  it('声望可以为负值', () => {
    ;(sys as any).reputations.set(5, -100)
    expect(sys.getReputation(5)).toBe(-100)
  })

  it('声望可以为0', () => {
    ;(sys as any).reputations.set(3, 0)
    expect(sys.getReputation(3)).toBe(0)
  })

  it('声望可以为最大值100', () => {
    ;(sys as any).reputations.set(7, 100)
    expect(sys.getReputation(7)).toBe(100)
  })

  it('声望可以为最小值-100', () => {
    ;(sys as any).reputations.set(8, -100)
    expect(sys.getReputation(8)).toBe(-100)
  })

  it('大civId也能正常存取', () => {
    ;(sys as any).reputations.set(9999, 42)
    expect(sys.getReputation(9999)).toBe(42)
  })

  it('多个文明同时存在时各自正确', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).reputations.set(i, i * 10)
    }
    for (let i = 1; i <= 10; i++) {
      expect(sys.getReputation(i)).toBe(i * 10)
    }
  })

  it('未设置的civId不影响已设置的', () => {
    ;(sys as any).reputations.set(1, 55)
    expect(sys.getReputation(2)).toBe(0)
    expect(sys.getReputation(1)).toBe(55)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getReputationLevel 阈值边界
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem.getReputationLevel 阈值边界', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('0声望返回neutral', () => {
    expect(sys.getReputationLevel(1)).toBe('neutral')
  })

  it('高声望(90)返回revered', () => {
    ;(sys as any).reputations.set(1, 90)
    expect(sys.getReputationLevel(1)).toBe('revered')
  })

  it('低声望(-90)返回despised', () => {
    ;(sys as any).reputations.set(1, -90)
    expect(sys.getReputationLevel(1)).toBe('despised')
  })

  it('支持5种声望等级的典型值', () => {
    const cases: [number, ReputationLevel][] = [
      [90, 'revered'], [50, 'respected'], [0, 'neutral'], [-50, 'distrusted'], [-90, 'despised']
    ]
    cases.forEach(([score, level], i) => {
      ;(sys as any).reputations.set(i + 1, score)
      expect(sys.getReputationLevel(i + 1)).toBe(level)
    })
  })

  it('恰好在revered阈值(60)时返回revered', () => {
    ;(sys as any).reputations.set(1, 60)
    expect(sys.getReputationLevel(1)).toBe('revered')
  })

  it('59声望返回respected', () => {
    ;(sys as any).reputations.set(1, 59)
    expect(sys.getReputationLevel(1)).toBe('respected')
  })

  it('恰好在respected阈值(20)时返回respected', () => {
    ;(sys as any).reputations.set(1, 20)
    expect(sys.getReputationLevel(1)).toBe('respected')
  })

  it('19声望返回neutral', () => {
    ;(sys as any).reputations.set(1, 19)
    expect(sys.getReputationLevel(1)).toBe('neutral')
  })

  it('恰好在neutral阈值(-20)时返回neutral', () => {
    ;(sys as any).reputations.set(1, -20)
    expect(sys.getReputationLevel(1)).toBe('neutral')
  })

  it('-21声望返回distrusted', () => {
    ;(sys as any).reputations.set(1, -21)
    expect(sys.getReputationLevel(1)).toBe('distrusted')
  })

  it('恰好在distrusted阈值(-60)时返回distrusted', () => {
    ;(sys as any).reputations.set(1, -60)
    expect(sys.getReputationLevel(1)).toBe('distrusted')
  })

  it('-61声望返回despised', () => {
    ;(sys as any).reputations.set(1, -61)
    expect(sys.getReputationLevel(1)).toBe('despised')
  })

  it('-100声望返回despised', () => {
    ;(sys as any).reputations.set(1, -100)
    expect(sys.getReputationLevel(1)).toBe('despised')
  })

  it('100声望返回revered', () => {
    ;(sys as any).reputations.set(1, 100)
    expect(sys.getReputationLevel(1)).toBe('revered')
  })

  it('untracked civId默认neutral', () => {
    expect(sys.getReputationLevel(999)).toBe('neutral')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getDiplomacyModifier
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem.getDiplomacyModifier', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('0声望时返回0', () => {
    expect(sys.getDiplomacyModifier(1)).toBe(0)
  })

  it('100声望时返回0.3', () => {
    ;(sys as any).reputations.set(1, 100)
    expect(sys.getDiplomacyModifier(1)).toBeCloseTo(0.3)
  })

  it('-100声望时返回-0.3', () => {
    ;(sys as any).reputations.set(1, -100)
    expect(sys.getDiplomacyModifier(1)).toBeCloseTo(-0.3)
  })

  it('50声望时返回0.15', () => {
    ;(sys as any).reputations.set(1, 50)
    expect(sys.getDiplomacyModifier(1)).toBeCloseTo(0.15)
  })

  it('-50声望时返回-0.15', () => {
    ;(sys as any).reputations.set(1, -50)
    expect(sys.getDiplomacyModifier(1)).toBeCloseTo(-0.15)
  })

  it('高声望比低声望有更高diplomacy modifier', () => {
    ;(sys as any).reputations.set(1, 100)
    ;(sys as any).reputations.set(2, -100)
    expect(sys.getDiplomacyModifier(1)).toBeGreaterThan(sys.getDiplomacyModifier(2))
  })

  it('modifier范围在[-0.3, 0.3]之间', () => {
    const cases = [100, 80, 60, 20, 0, -20, -60, -80, -100]
    cases.forEach((score, i) => {
      ;(sys as any).reputations.set(i + 1, score)
      const mod = sys.getDiplomacyModifier(i + 1)
      expect(mod).toBeGreaterThanOrEqual(-0.3)
      expect(mod).toBeLessThanOrEqual(0.3)
    })
  })

  it('modifier与声望分数线性相关', () => {
    ;(sys as any).reputations.set(1, 10)
    ;(sys as any).reputations.set(2, 20)
    const mod1 = sys.getDiplomacyModifier(1)
    const mod2 = sys.getDiplomacyModifier(2)
    expect(mod2).toBeCloseTo(mod1 * 2)
  })

  it('untracked civId返回0', () => {
    expect(sys.getDiplomacyModifier(999)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getTradeWillingness
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem.getTradeWillingness', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('0声望时返回1.0', () => {
    expect(sys.getTradeWillingness(1)).toBe(1.0)
  })

  it('100声望时返回1.3', () => {
    ;(sys as any).reputations.set(1, 100)
    expect(sys.getTradeWillingness(1)).toBeCloseTo(1.3)
  })

  it('-100声望时返回0.7', () => {
    ;(sys as any).reputations.set(1, -100)
    expect(sys.getTradeWillingness(1)).toBeCloseTo(0.7)
  })

  it('50声望时返回1.15', () => {
    ;(sys as any).reputations.set(1, 50)
    expect(sys.getTradeWillingness(1)).toBeCloseTo(1.15)
  })

  it('-50声望时返回0.85', () => {
    ;(sys as any).reputations.set(1, -50)
    expect(sys.getTradeWillingness(1)).toBeCloseTo(0.85)
  })

  it('高声望的trade willingness高于低声望', () => {
    ;(sys as any).reputations.set(1, 100)
    ;(sys as any).reputations.set(2, -100)
    expect(sys.getTradeWillingness(1)).toBeGreaterThan(sys.getTradeWillingness(2))
  })

  it('trade willingness在[0.7, 1.3]范围', () => {
    const cases = [100, 50, 0, -50, -100]
    cases.forEach((score, i) => {
      ;(sys as any).reputations.set(i + 1, score)
      const w = sys.getTradeWillingness(i + 1)
      expect(w).toBeGreaterThanOrEqual(0.7)
      expect(w).toBeLessThanOrEqual(1.3)
    })
  })

  it('untracked civId返回1.0', () => {
    expect(sys.getTradeWillingness(999)).toBe(1.0)
  })

  it('trade willingness与diplomacy modifier偏移量相同', () => {
    ;(sys as any).reputations.set(1, 80)
    const trade = sys.getTradeWillingness(1)
    const diplo = sys.getDiplomacyModifier(1)
    expect(trade - 1.0).toBeCloseTo(diplo)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getHistory
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem.getHistory', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回空数组', () => {
    expect(sys.getHistory(1)).toEqual([])
  })

  it('注入历史后可查询', () => {
    const hist = [{ action: 'war_won' as ReputationAction, tick: 100, delta: 10 }]
    ;(sys as any).history.set(1, hist)
    expect(sys.getHistory(1)).toHaveLength(1)
  })

  it('默认count=10只返回最近10条', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      action: 'trade_success' as ReputationAction, tick: i, delta: 1
    }))
    ;(sys as any).history.set(1, entries)
    const result = sys.getHistory(1)
    expect(result).toHaveLength(10)
    // slice(-10)返回最后10条
    expect(result[0].tick).toBe(5)
    expect(result[9].tick).toBe(14)
  })

  it('count参数可自定义', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      action: 'ally_helped' as ReputationAction, tick: i, delta: 2
    }))
    ;(sys as any).history.set(1, entries)
    expect(sys.getHistory(1, 5)).toHaveLength(5)
  })

  it('count大于历史数量时返回全部', () => {
    const entries = [
      { action: 'wonder_built' as ReputationAction, tick: 1, delta: 20 }
    ]
    ;(sys as any).history.set(1, entries)
    expect(sys.getHistory(1, 100)).toHaveLength(1)
  })

  it('不同civId的历史相互独立', () => {
    ;(sys as any).history.set(1, [{ action: 'war_won' as ReputationAction, tick: 1, delta: 5 }])
    ;(sys as any).history.set(2, [
      { action: 'alliance_broken' as ReputationAction, tick: 2, delta: -10 },
      { action: 'city_conquered' as ReputationAction, tick: 3, delta: -5 }
    ])
    expect(sys.getHistory(1)).toHaveLength(1)
    expect(sys.getHistory(2)).toHaveLength(2)
    expect(sys.getHistory(3)).toEqual([])
  })

  it('getHistory返回的记录包含action/tick/delta字段', () => {
    const entry = { action: 'espionage_caught' as ReputationAction, tick: 500, delta: -15 }
    ;(sys as any).history.set(1, [entry])
    const result = sys.getHistory(1, 1)
    expect(result[0].action).toBe('espionage_caught')
    expect(result[0].tick).toBe(500)
    expect(result[0].delta).toBe(-15)
  })
})

// ────────────────────────────────────────────────────────────────────────────���
// update / decay 逻辑
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem.update decay', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('非DECAY_INTERVAL的tick不执行decay', () => {
    ;(sys as any).reputations.set(1, 50)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    const em = {} as any
    sys.update(1, civManager, em) // tick=1，不是60的倍数
    expect(sys.getReputation(1)).toBe(50)
  })

  it('DECAY_INTERVAL(60)的倍数tick执行decay', () => {
    ;(sys as any).reputations.set(1, 50)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    const em = {} as any
    sys.update(60, civManager, em)
    expect(sys.getReputation(1)).toBeLessThan(50)
  })

  it('正声望decay后仍为正', () => {
    ;(sys as any).reputations.set(1, 10)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    sys.update(60, civManager, {} as any)
    expect(sys.getReputation(1)).toBeGreaterThanOrEqual(0)
  })

  it('负声望decay后仍为负或0', () => {
    ;(sys as any).reputations.set(1, -10)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    sys.update(60, civManager, {} as any)
    expect(sys.getReputation(1)).toBeLessThanOrEqual(0)
  })

  it('0声望decay后仍为0', () => {
    ;(sys as any).reputations.set(1, 0)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    sys.update(60, civManager, {} as any)
    expect(sys.getReputation(1)).toBe(0)
  })

  it('死亡文明(不在civManager中)的声望被清除', () => {
    ;(sys as any).reputations.set(99, 80)
    const civManager = { civilizations: new Map() } as any // 空map，无civId 99
    sys.update(60, civManager, {} as any)
    expect((sys as any).reputations.has(99)).toBe(false)
  })

  it('死亡文明的历史记录也被清除', () => {
    ;(sys as any).reputations.set(99, 80)
    ;(sys as any).history.set(99, [{ action: 'war_won' as ReputationAction, tick: 1, delta: 5 }])
    const civManager = { civilizations: new Map() } as any
    sys.update(60, civManager, {} as any)
    expect((sys as any).history.has(99)).toBe(false)
  })

  it('活跃文明在decay后声望记录仍存在', () => {
    ;(sys as any).reputations.set(1, 30)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    sys.update(60, civManager, {} as any)
    expect((sys as any).reputations.has(1)).toBe(true)
  })

  it('多次decay最终使声望趋向0', () => {
    ;(sys as any).reputations.set(1, 1)
    const civManager = { civilizations: new Map([[1, {}]]) } as any
    // 100次decay
    for (let t = 60; t <= 6000; t += 60) {
      sys.update(t, civManager, {} as any)
    }
    expect(sys.getReputation(1)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 私有字段结构验证
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem 内部结构', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('reputations初始为空Map', () => {
    expect((sys as any).reputations.size).toBe(0)
  })

  it('history初始为空Map', () => {
    expect((sys as any).history.size).toBe(0)
  })

  it('maxHistoryPerCiv为20', () => {
    expect((sys as any).maxHistoryPerCiv).toBe(20)
  })

  it('reputations是Map类型', () => {
    expect((sys as any).reputations).toBeInstanceOf(Map)
  })

  it('history是Map类型', () => {
    expect((sys as any).history).toBeInstanceOf(Map)
  })

  it('设置多个文明声望后Map.size正确', () => {
    ;(sys as any).reputations.set(1, 10)
    ;(sys as any).reputations.set(2, 20)
    ;(sys as any).reputations.set(3, 30)
    expect((sys as any).reputations.size).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// levelFromScore 私有方法边界
// ─────────────────────────────────────────────────────────────────────────────
describe('ReputationSystem levelFromScore 私有方法', () => {
  let sys: ReputationSystem
  beforeEach(() => { sys = makeSys() })

  it('score=60返回revered', () => {
    expect((sys as any).levelFromScore(60)).toBe('revered')
  })

  it('score=20返回respected', () => {
    expect((sys as any).levelFromScore(20)).toBe('respected')
  })

  it('score=-20返回neutral', () => {
    expect((sys as any).levelFromScore(-20)).toBe('neutral')
  })

  it('score=-60返回distrusted', () => {
    expect((sys as any).levelFromScore(-60)).toBe('distrusted')
  })

  it('score=-100返回despised', () => {
    expect((sys as any).levelFromScore(-100)).toBe('despised')
  })

  it('score=0返回neutral', () => {
    expect((sys as any).levelFromScore(0)).toBe('neutral')
  })

  it('score=100返回revered', () => {
    expect((sys as any).levelFromScore(100)).toBe('revered')
  })

  it('score极小负数(-101)返回despised（fallback）', () => {
    expect((sys as any).levelFromScore(-101)).toBe('despised')
  })
})
