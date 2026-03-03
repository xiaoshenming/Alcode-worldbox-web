import { describe, it, expect, beforeEach } from 'vitest'
import { CultureSystem } from '../systems/CultureSystem'
import type { Culture, CultureTraitType } from '../systems/CultureSystem'

function makeCS(): CultureSystem { return new CultureSystem() }

function makeCulture(civId: number, traits: CultureTraitType[] = [], langId = 0): Culture {
  return {
    civId, name: `Culture${civId}`, traits,
    language: { id: langId, name: `Lang${langId}`, phonemes: ['ka', 'la', 'ma', 'an', 'on', 'el'], namePatterns: ['CVC'] },
    artStyle: 'geometric',
    values: { militarism: 50, commerce: 50, piety: 50, knowledge: 50 },
    traditions: [], influence: 50,
  }
}

describe('CultureSystem.getCulture', () => {
  let cs: CultureSystem
  beforeEach(() => { cs = makeCS() })

  it('无文化时返回 undefined', () => { expect(cs.getCulture(1)).toBeUndefined() })
  it('注入文化后可查询', () => {
    const c = makeCulture(1, ['warrior'])
    ;(cs as any).cultures.set(1, c)
    expect(cs.getCulture(1)).toBe(c)
  })
  it('不同文明各自独立', () => {
    ;(cs as any).cultures.set(1, makeCulture(1))
    ;(cs as any).cultures.set(2, makeCulture(2))
    expect(cs.getCulture(1)!.civId).toBe(1)
    expect(cs.getCulture(2)!.civId).toBe(2)
    expect(cs.getCulture(3)).toBeUndefined()
  })
  it('注入后 civId 正确', () => {
    ;(cs as any).cultures.set(5, makeCulture(5))
    expect(cs.getCulture(5)?.civId).toBe(5)
  })
  it('文化对象有 traits 字段', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(cs.getCulture(1)?.traits).toContain('warrior')
  })
  it('文化对象有 influence 字段', () => {
    ;(cs as any).cultures.set(1, makeCulture(1))
    expect(cs.getCulture(1)?.influence).toBe(50)
  })
  it('文化对象有 artStyle 字段', () => {
    ;(cs as any).cultures.set(1, makeCulture(1))
    expect(cs.getCulture(1)?.artStyle).toBe('geometric')
  })
})

describe('CultureSystem.getCultureBonus', () => {
  let cs: CultureSystem
  beforeEach(() => { cs = makeCS() })

  it('无文化时返回 0', () => { expect(cs.getCultureBonus(1, 'combat')).toBe(0) })
  it('warrior 特性 combat 加成 0.15', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(cs.getCultureBonus(1, 'combat')).toBe(0.15)
  })
  it('warrior 特性 morale 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(cs.getCultureBonus(1, 'morale')).toBe(0.1)
  })
  it('merchant 特性 trade 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['merchant']))
    expect(cs.getCultureBonus(1, 'trade')).toBe(0.2)
  })
  it('merchant 特性 gold 加成 0.15', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['merchant']))
    expect(cs.getCultureBonus(1, 'gold')).toBe(0.15)
  })
  it('scholarly 特性 research 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['scholarly']))
    expect(cs.getCultureBonus(1, 'research')).toBe(0.2)
  })
  it('scholarly 特性 techSpeed 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['scholarly']))
    expect(cs.getCultureBonus(1, 'techSpeed')).toBe(0.1)
  })
  it('devout 特性 faith 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['devout']))
    expect(cs.getCultureBonus(1, 'faith')).toBe(0.2)
  })
  it('devout 特性 happiness 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['devout']))
    expect(cs.getCultureBonus(1, 'happiness')).toBe(0.1)
  })
  it('seafaring 特性 naval 加成 0.25', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['seafaring']))
    expect(cs.getCultureBonus(1, 'naval')).toBe(0.25)
  })
  it('seafaring 特性 trade 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['seafaring']))
    expect(cs.getCultureBonus(1, 'trade')).toBe(0.1)
  })
  it('agrarian 特性 food 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['agrarian']))
    expect(cs.getCultureBonus(1, 'food')).toBe(0.2)
  })
  it('agrarian 特性 growth 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['agrarian']))
    expect(cs.getCultureBonus(1, 'growth')).toBe(0.1)
  })
  it('nomadic 特性 speed 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['nomadic']))
    expect(cs.getCultureBonus(1, 'speed')).toBe(0.2)
  })
  it('nomadic 特性 exploration 加成 0.15', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['nomadic']))
    expect(cs.getCultureBonus(1, 'exploration')).toBe(0.15)
  })
  it('artistic 特性 influence 加成 0.25', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['artistic']))
    expect(cs.getCultureBonus(1, 'influence')).toBe(0.25)
  })
  it('artistic 特性 happiness 加成 0.1', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['artistic']))
    expect(cs.getCultureBonus(1, 'happiness')).toBe(0.1)
  })
  it('多个特性累加 trade 加成', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['merchant', 'seafaring']))
    expect(cs.getCultureBonus(1, 'trade')).toBeCloseTo(0.2 + 0.1)
  })
  it('无关 bonus 类型返回 0', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(cs.getCultureBonus(1, 'food')).toBe(0)
  })
  it('空 traits 时所有加成为 0', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, []))
    expect(cs.getCultureBonus(1, 'combat')).toBe(0)
    expect(cs.getCultureBonus(1, 'trade')).toBe(0)
  })
})

describe('CultureSystem.getLanguageCompatibility', () => {
  let cs: CultureSystem
  beforeEach(() => { cs = makeCS() })

  it('任一文明无文化时返回 0', () => { expect(cs.getLanguageCompatibility(1, 2)).toBe(0) })
  it('一方有文化另一方没有返回 0', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, [], 0))
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })
  it('相同语系（id相同）返回 1.0', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, [], 0))
    ;(cs as any).cultures.set(2, makeCulture(2, [], 0))
    expect(cs.getLanguageCompatibility(1, 2)).toBe(1.0)
  })
  it('完全不同音素返回 0', () => {
    const c1 = makeCulture(1, [], 0); c1.language.phonemes = ['ka', 'la']
    const c2 = makeCulture(2, [], 1); c2.language.phonemes = ['zx', 'qw']
    ;(cs as any).cultures.set(1, c1); ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })
  it('部分音素共享时返回 (shared/maxLen)*0.6', () => {
    const c1 = makeCulture(1, [], 0); c1.language.phonemes = ['ka', 'la', 'ma', 'an']
    const c2 = makeCulture(2, [], 1); c2.language.phonemes = ['ka', 'la', 'zx', 'qw']
    ;(cs as any).cultures.set(1, c1); ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBeCloseTo(0.3)
  })
  it('空音素语系兼容性为 0', () => {
    const c1 = makeCulture(1, [], 0); c1.language.phonemes = []
    const c2 = makeCulture(2, [], 1); c2.language.phonemes = []
    ;(cs as any).cultures.set(1, c1); ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })
  it('返回值在 [0, 1] 范围内', () => {
    const c1 = makeCulture(1, [], 0); c1.language.phonemes = ['a', 'b', 'c']
    const c2 = makeCulture(2, [], 1); c2.language.phonemes = ['a', 'x', 'y']
    ;(cs as any).cultures.set(1, c1); ;(cs as any).cultures.set(2, c2)
    const compat = cs.getLanguageCompatibility(1, 2)
    expect(compat).toBeGreaterThanOrEqual(0)
    expect(compat).toBeLessThanOrEqual(1)
  })
  it('完全相同音素不同 id 时 < 1（乘以 0.6）', () => {
    const c1 = makeCulture(1, [], 0); c1.language.phonemes = ['a', 'b']
    const c2 = makeCulture(2, [], 1); c2.language.phonemes = ['a', 'b']
    ;(cs as any).cultures.set(1, c1); ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBeCloseTo(0.6)
  })
})

describe('CultureSystem — update 与影响力', () => {
  it('非 SPREAD_INTERVAL tick 时不执行 update', () => {
    const cs = makeCS()
    ;(cs as any).cultures.set(1, makeCulture(1, ['artistic']))
    const influBefore = (cs as any).cultures.get(1).influence
    cs.update(1, [{ id: 1, neighbors: [], tradePartners: [], population: 10 }])
    expect((cs as any).cultures.get(1).influence).toBe(influBefore)
  })
  it('SPREAD_INTERVAL=180 时文化影响力增加', () => {
    const cs = makeCS()
    const c = makeCulture(1); c.influence = 50
    ;(cs as any).cultures.set(1, c)
    cs.update(180, [{ id: 1, neighbors: [], tradePartners: [], population: 10 }])
    expect((cs as any).cultures.get(1).influence).toBeGreaterThan(50)
  })
  it('artistic trait 影响力增长更快', () => {
    const cs1 = makeCS(), cs2 = makeCS()
    const c1 = makeCulture(1, ['artistic']); c1.influence = 50
    const c2 = makeCulture(1, []); c2.influence = 50
    ;(cs1 as any).cultures.set(1, c1); ;(cs2 as any).cultures.set(1, c2)
    cs1.update(180, [{ id: 1, neighbors: [], tradePartners: [], population: 10 }])
    cs2.update(180, [{ id: 1, neighbors: [], tradePartners: [], population: 10 }])
    expect((cs1 as any).cultures.get(1).influence).toBeGreaterThan((cs2 as any).cultures.get(1).influence)
  })
  it('影响力上限为 100', () => {
    const cs = makeCS()
    const c = makeCulture(1); c.influence = 99.9
    ;(cs as any).cultures.set(1, c)
    cs.update(180, [{ id: 1, neighbors: [], tradePartners: [], population: 1000 }])
    expect((cs as any).cultures.get(1).influence).toBeLessThanOrEqual(100)
  })
})

describe('CultureSystem — 综合与边界', () => {
  it('getCulture 查不存在时不崩溃', () => { expect(() => makeCS().getCulture(999)).not.toThrow() })
  it('getCultureBonus 查不存在文明不崩溃', () => { expect(() => makeCS().getCultureBonus(999, 'combat')).not.toThrow() })
  it('getLanguageCompatibility 双方均不存在不崩溃', () => { expect(() => makeCS().getLanguageCompatibility(99, 100)).not.toThrow() })
  it('cultures 内部是 Map', () => { expect((makeCS() as any).cultures).toBeInstanceOf(Map) })
  it('cultures 初始为空', () => { expect((makeCS() as any).cultures.size).toBe(0) })
  it('getCultureBonus 接受任意 type 字符串不崩溃', () => {
    const cs = makeCS()
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(() => cs.getCultureBonus(1, 'nonexistent_bonus_type')).not.toThrow()
  })
  it('warrior 两个特性中不含 food 加成', () => {
    const cs = makeCS()
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    expect(cs.getCultureBonus(1, 'food')).toBe(0)
  })
  it('多文明共存互不影响', () => {
    const cs = makeCS()
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior']))
    ;(cs as any).cultures.set(2, makeCulture(2, ['merchant']))
    expect(cs.getCultureBonus(1, 'combat')).toBe(0.15)
    expect(cs.getCultureBonus(2, 'combat')).toBe(0)
    expect(cs.getCultureBonus(2, 'trade')).toBe(0.2)
  })
  it('warrior+scholarly 累加 research 为 0', () => {
    const cs = makeCS()
    ;(cs as any).cultures.set(1, makeCulture(1, ['warrior', 'scholarly']))
    expect(cs.getCultureBonus(1, 'research')).toBe(0.2)
  })
  it('update 在 tick=0 时不崩溃', () => { expect(() => makeCS().update(0, [])).not.toThrow() })
  it('update 空文明数据不崩溃', () => { expect(() => makeCS().update(180, [])).not.toThrow() })
})
