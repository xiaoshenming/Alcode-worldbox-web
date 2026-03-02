import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — 初始化', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureLanguageSystem) })
  it('初始getLanguages为空Map', () => { expect(sys.getLanguages().size).toBe(0) })
  it('初始similarities为空数组', () => { expect((sys as any).similarities.length).toBe(0) })
  it('初始lastEvolve=0', () => { expect((sys as any).lastEvolve).toBe(0) })
  it('初始lastDrift=0', () => { expect((sys as any).lastDrift).toBe(0) })
  it('getLanguages返回同一个Map实例', () => {
    expect(sys.getLanguages()).toBe(sys.getLanguages())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — computeSimilarities 算法', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

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
    // 同family(+50) + 复杂度差0(+30) + 词汇比=100/1000=0.1 => floor(0.1*20)=2 = 82
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

  it('4种语言产生C(4,2)=6对相似度', () => {
    injectLangs(sys, [makeLang(1), makeLang(2), makeLang(3), makeLang(4)])
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(6)
  })

  it('零语言时similarities为空', () => {
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(0)
  })

  it('相似度对包含正确的civA和civB', () => {
    const langA = makeLang(10, { rootFamily: 1 })
    const langB = makeLang(20, { rootFamily: 1 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    const sim = (sys as any).similarities[0]
    expect([sim.civA, sim.civB]).toContain(10)
    expect([sim.civA, sim.civB]).toContain(20)
  })

  it('复杂度差=6时复杂度贡献为max(0,30-30)=0', () => {
    const langA = makeLang(1, { rootFamily: 99, complexity: 1, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 99, complexity: 7, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    // 同family+50, 复杂度0, 词汇+20 = 70
    expect((sys as any).similarities[0].similarity).toBe(70)
  })

  it('复杂度差=10时复杂度贡献为0（max(0,30-50)=0）', () => {
    const langA = makeLang(1, { rootFamily: 99, complexity: 0, vocabulary: 1000 })
    const langB = makeLang(2, { rootFamily: 99, complexity: 10, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    // 同family+50, 复杂度max(0,30-50)=0, 词汇+20 = 70
    expect((sys as any).similarities[0].similarity).toBe(70)
  })

  it('词汇比=0.5时贡献floor(0.5*20)=10', () => {
    // rootFamily 不同（11 vs 22）避免同family +50 加成
    const langA = makeLang(1, { rootFamily: 11, complexity: 5, vocabulary: 500 })
    const langB = makeLang(2, { rootFamily: 22, complexity: 5, vocabulary: 1000 })
    injectLangs(sys, [langA, langB])
    ;(sys as any).computeSimilarities()
    // 不同family(+0) + 复杂度差0(+30) + floor(0.5*20)=10 = 40
    expect((sys as any).similarities[0].similarity).toBe(40)
  })

  it('computeSimilarities 每次调用清空旧结果', () => {
    injectLangs(sys, [makeLang(1), makeLang(2)])
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(1)
    // 再次调用，结果仍为1对（不是2对）
    ;(sys as any).computeSimilarities()
    expect((sys as any).similarities.length).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — evolveLanguages: 已有语言更新', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('已有语言age递增', () => {
    const lang = makeLang(1, { age: 5 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.age).toBe(6)
  })

  it('已有语言complexity递增COMPLEXITY_GAIN(0.2)', () => {
    const lang = makeLang(1, { complexity: 5 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.complexity).toBeCloseTo(5.2, 5)
  })

  it('complexity不超过MAX_COMPLEXITY(10)', () => {
    const lang = makeLang(1, { complexity: 9.9 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.complexity).toBe(10)
  })

  it('dead civ的语言被删除', () => {
    injectLangs(sys, [makeLang(1)])
    ;(sys as any).evolveLanguages([2], 100)  // civId=2存活，civId=1死亡
    expect(sys.getLanguages().has(1)).toBe(false)
  })

  it('complexity已达10时不再递增', () => {
    const lang = makeLang(1, { complexity: 10 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.complexity).toBe(10)
  })

  it('每次evolve vocabulary增加(5-24)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // floor(0*20)+5=5
    const lang = makeLang(1, { vocabulary: 1000 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.vocabulary).toBe(1005)
  })

  it('evolveLanguages: 多个活跃civ各自的语言均被更新', () => {
    const lang1 = makeLang(1, { age: 0, complexity: 5 })
    const lang2 = makeLang(2, { age: 10, complexity: 7 })
    injectLangs(sys, [lang1, lang2])
    ;(sys as any).evolveLanguages([1, 2], 100)
    expect(lang1.age).toBe(1)
    expect(lang2.age).toBe(11)
  })

  it('evolveLanguages: civId不在存活列表时被删除', () => {
    injectLangs(sys, [makeLang(1), makeLang(2)])
    ;(sys as any).evolveLanguages([1], 100)  // 只有civ1存活
    expect(sys.getLanguages().has(1)).toBe(true)
    expect(sys.getLanguages().has(2)).toBe(false)
  })

  it('evolveLanguages: 空civIds时清空所有语言', () => {
    injectLangs(sys, [makeLang(1), makeLang(2)])
    ;(sys as any).evolveLanguages([], 100)
    expect(sys.getLanguages().size).toBe(0)
  })

  it('已有语言age从0开始递增到1', () => {
    const lang = makeLang(1, { age: 0 })
    injectLangs(sys, [lang])
    ;(sys as any).evolveLanguages([1], 100)
    expect(lang.age).toBe(1)
  })

  it('新civ创建语言，complexity初始为1', () => {
    ;(sys as any).evolveLanguages([99], 100)
    const lang = sys.getLanguages().get(99)
    expect(lang).toBeDefined()
    expect(lang!.complexity).toBe(1)
  })

  it('新civ创建语言，age初始为0', () => {
    ;(sys as any).evolveLanguages([99], 100)
    const lang = sys.getLanguages().get(99)
    expect(lang!.age).toBe(0)
  })

  it('新civ创建语言，parentId为null', () => {
    ;(sys as any).evolveLanguages([99], 100)
    const lang = sys.getLanguages().get(99)
    expect(lang!.parentId).toBeNull()
  })

  it('新civ创建语言，vocabulary在50-149范围', () => {
    // mock random=0 => 50+floor(0*100)=50
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).evolveLanguages([99], 100)
    const lang = sys.getLanguages().get(99)
    expect(lang!.vocabulary).toBeGreaterThanOrEqual(50)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — MAX_LANGUAGES 限制', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('已达MAX_LANGUAGES(30)时不创建新语言', () => {
    // 注入30个语言
    for (let i = 1; i <= 30; i++) {
      injectLangs(sys, [makeLang(i)])
    }
    expect(sys.getLanguages().size).toBe(30)
    // 尝试为新civ创建语言
    ;(sys as any).evolveLanguages([...Array.from({length: 30}, (_, i) => i + 1), 99], 100)
    // civ 99 不能创建新语言
    expect(sys.getLanguages().has(99)).toBe(false)
  })

  it('语言数量小于30时可以创建新语言', () => {
    for (let i = 1; i <= 5; i++) {
      injectLangs(sys, [makeLang(i)])
    }
    ;(sys as any).evolveLanguages([1, 2, 3, 4, 5, 99], 100)
    expect(sys.getLanguages().has(99)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — driftLanguages', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('vocabulary不会低于20（下限保护）', () => {
    // mock random: 第一次<0.1触发漂移，第二次返回0（floor(0*10)-3=-3）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const lang = makeLang(1, { vocabulary: 20 })
    injectLangs(sys, [lang])
    ;(sys as any).driftLanguages()
    expect(lang.vocabulary).toBeGreaterThanOrEqual(20)
  })

  it('driftLanguages: 不触发时vocabulary不变', () => {
    // mock random=0.999 > 0.1，不触发
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const lang = makeLang(1, { vocabulary: 500 })
    injectLangs(sys, [lang])
    ;(sys as any).driftLanguages()
    expect(lang.vocabulary).toBe(500)
  })

  it('driftLanguages: 触发时vocabulary可能增加', () => {
    // mock random: 先返回0(触发，<0.1)，再返回0.9(floor(0.9*10)-3=9-3=6)
    const randomMock = vi.spyOn(Math, 'random')
    let callCount = 0
    randomMock.mockImplementation(() => callCount++ === 0 ? 0 : 0.9)
    const lang = makeLang(1, { vocabulary: 500 })
    injectLangs(sys, [lang])
    ;(sys as any).driftLanguages()
    expect(lang.vocabulary).toBeGreaterThanOrEqual(20)
  })

  it('driftLanguages: 空语言表时安全运行', () => {
    expect(() => (sys as any).driftLanguages()).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — EVOLVE_INTERVAL 节流', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

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

  it('恰好差值1200时触发', () => {
    ;(sys as any).lastEvolve = 0
    sys.update(1, [], 1200)
    expect((sys as any).lastEvolve).toBe(1200)
  })

  it('差值1199不触发', () => {
    sys.update(1, [], 1199)
    expect((sys as any).lastEvolve).toBe(0)
  })

  it('第二次需要再等1200', () => {
    sys.update(1, [], 1200)
    expect((sys as any).lastEvolve).toBe(1200)
    sys.update(1, [], 1200 + 1199) // 不够
    expect((sys as any).lastEvolve).toBe(1200)
    sys.update(1, [], 1200 + 1200) // 触发
    expect((sys as any).lastEvolve).toBe(2400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — DRIFT_INTERVAL 节流', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('tick未达到DRIFT_INTERVAL(2000)时lastDrift不更新', () => {
    ;(sys as any).lastDrift = 0
    sys.update(1, [], 1999)
    expect((sys as any).lastDrift).toBe(0)
  })

  it('tick达到DRIFT_INTERVAL(2000)时更新lastDrift', () => {
    ;(sys as any).lastDrift = 0
    sys.update(1, [], 2000)
    expect((sys as any).lastDrift).toBe(2000)
  })

  it('DRIFT_INTERVAL恰好2000触发', () => {
    sys.update(1, [], 2000)
    expect((sys as any).lastDrift).toBe(2000)
  })

  it('DRIFT_INTERVAL 1999不触发', () => {
    sys.update(1, [], 1999)
    expect((sys as any).lastDrift).toBe(0)
  })

  it('drift触发后computeSimilarities被调用（similarities更新）', () => {
    const lang1 = makeLang(1, { rootFamily: 1 })
    const lang2 = makeLang(2, { rootFamily: 1 })
    injectLangs(sys, [lang1, lang2])
    sys.update(1, [1, 2], 2000)
    // drift触发后计算了similarities
    expect((sys as any).similarities.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureLanguageSystem — getLanguages 公共API', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })

  it('getLanguages返回Map', () => {
    expect(sys.getLanguages()).toBeInstanceOf(Map)
  })

  it('注入后getLanguages包含对应语言', () => {
    injectLangs(sys, [makeLang(1)])
    expect(sys.getLanguages().has(1)).toBe(true)
  })

  it('getLanguages.get返回正确对象', () => {
    const lang = makeLang(5, { name: 'TestLang' })
    injectLangs(sys, [lang])
    expect(sys.getLanguages().get(5)!.name).toBe('TestLang')
  })

  it('删除后getLanguages不包含', () => {
    injectLangs(sys, [makeLang(1)])
    sys.getLanguages().delete(1)
    expect(sys.getLanguages().has(1)).toBe(false)
  })
})
