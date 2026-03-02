import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLanguageSystem } from '../systems/CreatureLanguageSystem'
import type { Language } from '../systems/CreatureLanguageSystem'

// EVOLVE_INTERVAL=1200, DRIFT_INTERVAL=2000, MAX_LANGUAGES=30
// COMPLEXITY_GAIN=0.2, MAX_COMPLEXITY=10
// computeSimilarities: 同family+50, |复杂度差|*5扣分(从30开始), 词汇比例*20

function makeSys() { return new CreatureLanguageSystem() }

function makeLang(civId: number, overrides: Partial<Language> = {}): Language {
  return {
    id: civId,
    name: `Lang${civId}`,
    civId,
    rootFamily: civId,  // 默认不同family
    complexity: 5,
    vocabulary: 1000,
    age: 0,
    parentId: null,
    ...overrides,
  }
}

// 直接注入语言到系统内部
function injectLangs(sys: CreatureLanguageSystem, langs: Language[]) {
  for (const lang of langs) {
    sys.getLanguages().set(lang.civId, lang)
  }
}

describe('CreatureLanguageSystem', () => {
  let sys: CreatureLanguageSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureLanguageSystem) })
  it('初始getLanguages为空Map', () => { expect(sys.getLanguages().size).toBe(0) })

  // ── computeSimilarities 算法验证 ─────────────────────────────────────────────

  it('同family语言相似度基础+50', () => {
    const langA = makeLang(1, { rootFamily: 100, complexity: 5, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 100, complexity: 5, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    const sims = (sys as any).similarities
    expect(sims.length).toBe(1)
    // 同family(+50) + 复杂度差0(+30) + 词汇比1.0(+20) = 100
    expect(sims[0].similarity).toBe(100)
  })

  it('不同family语言相似度不加50', () => {
    const langA = makeLang(1, { rootFamily: 1, complexity: 5, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 2, complexity: 5, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    const sims = (sys as any).similarities
    // 不同family(+0) + 复杂度差0(+30) + 词汇比1.0(+20) = 50
    expect(sims[0].similarity).toBe(50)
  })

  it('复杂度差距越大相似度越低', () => {
    // 差距=6, sim -= 6*5=30 => 从30开始则为max(0,30-30)=0
    const langA = makeLang(1, { rootFamily: 1, complexity: 1, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 1, complexity: 7, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    const sims = (sys as any).similarities
    // 同family(+50) + 复杂度差6 => max(0,30-30)=0 + 词汇比1.0(+20) = 70
    expect(sims[0].similarity).toBe(70)
  })

  it('词汇量比例影响相似度（词汇差异大→相似度低）', () => {
    const langA = makeLang(1, { rootFamily: 1, complexity: 5, vocabulary: 100 })
    const langB = makeLang(2, { rootFamily: 1, complexity: 5, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    const sims = (sys as any).similarities
    // 同family(+50) + 复杂度差0(+30) + 词汇比=100/1000=0.1 => floor(0.1*20)=2
    // = 82
    expect(sims[0].similarity).toBe(82)
  })

  it('相似度最大值被clamp到100', () => {
    const langA = makeLang(1, { rootFamily: 100, complexity: 5, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 100, complexity: 5, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities[0].similarity).toBeLessThanOrEqual(100)
  })

  it('单一语言时similarities为空（需要至少2种语言）', () => {
    injectLangs(sys, [makeLang(1)])
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(0)
  })

  it('3种语言产生C(3,2)=3对相似度', () => {
    injectLangs(sys, [makeLang(1), makeLang(2), makeLang(3)])
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(3)
  })

  // ── evolveLanguages: 已有语言更新 ───────────────────────────────────────────

  it('evolveLanguages: 已有语言age递增', () => {
    const lang = makeLang(1, { age: 5 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.age).toBe(6)
  })

  it('evolveLanguages: 已有语言complexity递增COMPLEXITY_GAIN(0.2)', () => {
    const lang = makeLang(1, { complexity: 5 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.complexity).toBeCloseTo(5.2, 5)
  })

  it('evolveLanguages: complexity不超过MAX_COMPLEXITY(10)', () => {
    const lang = makeLang(1, { complexity: 9.9 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.complexity).toBe(10)
  })

  it('evolveLanguages: dead civ的语言被删除', () => {
    injectLangs(sys, [makeLang(1)])
    ;(sys as any).evolveLanguages([2], 100)  // civId=2存活，civId=1死亡
    expect(sys.getLanguages().has(1)).toBe(false)
  })

  // ── EVOLVE_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到EVOLVE_INTERVAL(1200)时不更新', () => {
    ;(sys as any).lastEvolve = 0
    sys.update(1, [], 1199)
    expect((sys as any).lastEvolve).toBe(0)
  })

  it('tick达到EVOLVE_INTERVAL(1200)时更新lastEvolve', () => {
    ;(sys as any).lastEvolve = 0
    sys.update(1, [], 1200)
    expect((sys as any).lastEvolve).toBe(1200)
  })
})
