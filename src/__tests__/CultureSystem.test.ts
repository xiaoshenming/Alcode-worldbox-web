import { describe, it, expect, beforeEach } from 'vitest'
import { CultureSystem } from '../systems/CultureSystem'
import type { Culture, CultureTraitType } from '../systems/CultureSystem'

// CultureSystem 测试：
// - getCulture(civId)                     → 返回文明文化对象
// - getCultureBonus(civId, type)          → 按 trait 累加对应 bonus（纯计算）
// - getLanguageCompatibility(civA, civB)  → 相同语系返回1.0，不同按音素重叠计算

function makeCS(): CultureSystem {
  return new CultureSystem()
}

function makeCulture(civId: number, traits: CultureTraitType[] = [], langId = 0): Culture {
  return {
    civId,
    name: `Culture${civId}`,
    traits,
    language: {
      id: langId,
      name: `Lang${langId}`,
      phonemes: ['ka', 'la', 'ma', 'an', 'on', 'el'],
      namePatterns: ['CVC'],
    },
    artStyle: 'geometric',
    values: { militarism: 50, commerce: 50, piety: 50, knowledge: 50 },
    traditions: [],
    influence: 50,
  }
}

describe('CultureSystem.getCulture', () => {
  let cs: CultureSystem

  beforeEach(() => { cs = makeCS() })

  it('无��化时返回 undefined', () => {
    expect(cs.getCulture(1)).toBeUndefined()
  })

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
})

describe('CultureSystem.getCultureBonus', () => {
  let cs: CultureSystem

  beforeEach(() => { cs = makeCS() })

  it('无文化时返回 0', () => {
    expect(cs.getCultureBonus(1, 'combat')).toBe(0)
  })

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

  it('scholarly 特性 research 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['scholarly']))
    expect(cs.getCultureBonus(1, 'research')).toBe(0.2)
  })

  it('devout 特性 faith 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['devout']))
    expect(cs.getCultureBonus(1, 'faith')).toBe(0.2)
  })

  it('seafaring 特性 naval 加成 0.25', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['seafaring']))
    expect(cs.getCultureBonus(1, 'naval')).toBe(0.25)
  })

  it('agrarian 特性 food 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['agrarian']))
    expect(cs.getCultureBonus(1, 'food')).toBe(0.2)
  })

  it('nomadic 特性 speed 加成 0.2', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['nomadic']))
    expect(cs.getCultureBonus(1, 'speed')).toBe(0.2)
  })

  it('artistic 特性 influence 加成 0.25', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, ['artistic']))
    expect(cs.getCultureBonus(1, 'influence')).toBe(0.25)
  })

  it('多个特性累加同一类型加成', () => {
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

  it('任一文明无文化时返回 0', () => {
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
    ;(cs as any).cultures.set(1, makeCulture(1, [], 0))
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })

  it('相同语系（id相同）返回 1.0', () => {
    ;(cs as any).cultures.set(1, makeCulture(1, [], 0))
    ;(cs as any).cultures.set(2, makeCulture(2, [], 0))
    expect(cs.getLanguageCompatibility(1, 2)).toBe(1.0)
  })

  it('完全不同音素语系返回 0', () => {
    const c1 = makeCulture(1, [], 0)
    c1.language.phonemes = ['ka', 'la']
    const c2 = makeCulture(2, [], 1)
    c2.language.phonemes = ['zx', 'qw']
    ;(cs as any).cultures.set(1, c1)
    ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })

  it('部分音素共享时返回 (shared/maxLen)*0.6', () => {
    const c1 = makeCulture(1, [], 0)
    c1.language.phonemes = ['ka', 'la', 'ma', 'an']
    const c2 = makeCulture(2, [], 1)
    c2.language.phonemes = ['ka', 'la', 'zx', 'qw']
    ;(cs as any).cultures.set(1, c1)
    ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBeCloseTo(0.3)
  })

  it('空音素语系兼容性为 0（避免除零）', () => {
    const c1 = makeCulture(1, [], 0)
    c1.language.phonemes = []
    const c2 = makeCulture(2, [], 1)
    c2.language.phonemes = []
    ;(cs as any).cultures.set(1, c1)
    ;(cs as any).cultures.set(2, c2)
    expect(cs.getLanguageCompatibility(1, 2)).toBe(0)
  })
})
