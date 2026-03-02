import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MythologySystem } from '../systems/MythologySystem'

function makeSys(): MythologySystem { return new MythologySystem() }

function makeMyth(civId: number, type: string, opts: Partial<{
  id: number; belief: number; historical: boolean; createdTick: number
}> = {}) {
  return {
    id: opts.id ?? 1,
    type,
    title: 'A Myth',
    text: 'Long ago...',
    civId,
    createdTick: opts.createdTick ?? 0,
    belief: opts.belief ?? 0.8,
    historical: opts.historical ?? false,
    truncText: 'Long ago...',
  }
}

// ─── getMythsForCiv ───────────────────────────────────────────────────────────

describe('MythologySystem.getMythsForCiv - 基础查询', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无神话时返回空数组', () => {
    expect(sys.getMythsForCiv(1)).toHaveLength(0)
  })
  it('注入1条神话后返回长度1', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    expect(sys.getMythsForCiv(1)).toHaveLength(1)
  })
  it('查询不存在的civId返回空数组', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'hero')])
    expect(sys.getMythsForCiv(999)).toHaveLength(0)
  })
  it('不同文明神话数量相互独立', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'disaster'), makeMyth(2, 'divine')])
    expect(sys.getMythsForCiv(1)).toHaveLength(1)
    expect(sys.getMythsForCiv(2)).toHaveLength(2)
  })
  it('支持6种神话类型', () => {
    const types = ['creation', 'hero', 'disaster', 'divine', 'prophecy', 'origin']
    ;(sys as any).myths.set(1, types.map(t => makeMyth(1, t)))
    expect(sys.getMythsForCiv(1)).toHaveLength(6)
  })
  it('返回同一数组引用（只读）', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    expect(sys.getMythsForCiv(1)).toBe((sys as any).myths.get(1))
  })
  it('civId=0 时也能正常查询', () => {
    ;(sys as any).myths.set(0, [makeMyth(0, 'origin')])
    expect(sys.getMythsForCiv(0)).toHaveLength(1)
  })
  it('注入多条神话后数量正确', () => {
    const arr = [1, 2, 3, 4, 5].map(i => makeMyth(1, 'hero', { id: i }))
    ;(sys as any).myths.set(1, arr)
    expect(sys.getMythsForCiv(1)).toHaveLength(5)
  })
  it('返回值包含正确的type字段', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'prophecy')])
    expect(sys.getMythsForCiv(1)[0].type).toBe('prophecy')
  })
  it('返回值包含正确的civId', () => {
    ;(sys as any).myths.set(42, [makeMyth(42, 'divine')])
    expect(sys.getMythsForCiv(42)[0].civId).toBe(42)
  })
  it('多个文明同时存在互不干扰', () => {
    for (let civ = 1; civ <= 5; civ++) {
      ;(sys as any).myths.set(civ, [makeMyth(civ, 'creation')])
    }
    for (let civ = 1; civ <= 5; civ++) {
      expect(sys.getMythsForCiv(civ)).toHaveLength(1)
      expect(sys.getMythsForCiv(civ)[0].civId).toBe(civ)
    }
  })
  it('可以查询belief值', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'hero', { belief: 0.75 })])
    expect(sys.getMythsForCiv(1)[0].belief).toBeCloseTo(0.75)
  })
  it('can query historical flag', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'disaster', { historical: true })])
    expect(sys.getMythsForCiv(1)[0].historical).toBe(true)
  })
})

// ─── getCulturalSimilarity ────────────────────────────────────────────────────

describe('MythologySystem.getCulturalSimilarity - 基础相似度', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('双方无神话时相似度为0', () => {
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('只有一方有神话时相似度为0', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('另一方无神话时相似度为0', () => {
    ;(sys as any).myths.set(2, [makeMyth(2, 'hero')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('类型完全不同时相似度为0', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'hero')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('有共同神话类型时相似度>0', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation'), makeMyth(2, 'disaster')])
    expect(sys.getCulturalSimilarity(1, 2)).toBeGreaterThan(0)
  })
  it('完全相同的神话类型集合时相似度为1', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(1)
  })
  it('相似度在0到1之间', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero'), makeMyth(1, 'disaster')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation'), makeMyth(2, 'prophecy')])
    const sim = sys.getCulturalSimilarity(1, 2)
    expect(sim).toBeGreaterThanOrEqual(0)
    expect(sim).toBeLessThanOrEqual(1)
  })
  it('对称性：getCulturalSimilarity(A,B) === getCulturalSimilarity(B,A)', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation'), makeMyth(2, 'disaster')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(sys.getCulturalSimilarity(2, 1))
  })
  it('6种类型全部共有时相似度为1', () => {
    const types = ['creation', 'hero', 'disaster', 'divine', 'prophecy', 'origin']
    ;(sys as any).myths.set(1, types.map(t => makeMyth(1, t)))
    ;(sys as any).myths.set(2, types.map(t => makeMyth(2, t)))
    expect(sys.getCulturalSimilarity(1, 2)).toBe(1)
  })
  it('3中2共有时相似度约为0.5（2/4，但union=3+1=4）', () => {
    // A有 creation+hero，B有 creation+disaster
    // shared=1(creation)，totalUnique=3(creation,hero,disaster)
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation'), makeMyth(2, 'disaster')])
    const sim = sys.getCulturalSimilarity(1, 2)
    expect(sim).toBeCloseTo(1 / 3, 5)
  })
  it('重复类型不影响计算（每类型只计一次）', () => {
    // A有两条creation，相当于只有creation
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'creation')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(1)
  })
  it('自身与自身相似度为1', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero')])
    expect(sys.getCulturalSimilarity(1, 1)).toBe(1)
  })
  it('一方有空数组时返回0', () => {
    ;(sys as any).myths.set(1, [])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe('MythologySystem.update - 节奏控制', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tickCounter不满GEN_INTERVAL时不生成神话', () => {
    sys.update(1, [1])
    expect(sys.getMythsForCiv(1)).toHaveLength(0)
  })
  it('tickCounter满GEN_INTERVAL时生成神话', () => {
    const GEN_INTERVAL = 5000
    ;(sys as any).tickCounter = GEN_INTERVAL - 1
    sys.update(GEN_INTERVAL, [1])
    expect(sys.getMythsForCiv(1).length).toBeGreaterThan(0)
  })
  it('新文明首先生成creation神话', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    expect(myths.some(m => m.type === 'creation')).toBe(true)
  })
  it('已有creation再更新时优先生成origin', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    expect(myths.some(m => m.type === 'origin')).toBe(true)
  })
  it('达到MAX_MYTHS_PER_CIV后不再生成', () => {
    const maxMyths = Array.from({ length: 8 }, (_, i) => makeMyth(1, 'creation', { id: i + 100 }))
    ;(sys as any).myths.set(1, maxMyths)
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    expect(sys.getMythsForCiv(1)).toHaveLength(8)
  })
  it('可以同时为多个文明生成神话', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1, 2, 3])
    expect(sys.getMythsForCiv(1).length).toBeGreaterThan(0)
    expect(sys.getMythsForCiv(2).length).toBeGreaterThan(0)
    expect(sys.getMythsForCiv(3).length).toBeGreaterThan(0)
  })
  it('belief会随update衰减', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation', { belief: 0.9 })])
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [])
    const belief = sys.getMythsForCiv(1)[0].belief
    expect(belief).toBeLessThan(0.9)
  })
  it('belief不会低于0.1', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation', { belief: 0.1 })])
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [])
    expect(sys.getMythsForCiv(1)[0].belief).toBeGreaterThanOrEqual(0.1)
  })
  it('生成的神话belief在0.5到1之间', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    for (const m of myths) {
      expect(m.belief).toBeGreaterThanOrEqual(0.5)
      expect(m.belief).toBeLessThanOrEqual(1.0)
    }
  })
  it('生成的神话携带正确的civId', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [7])
    const myths = sys.getMythsForCiv(7)
    expect(myths.every(m => m.civId === 7)).toBe(true)
  })
  it('生成的神话包含非空title', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    expect(myths[0].title.length).toBeGreaterThan(0)
  })
  it('生成的神话包含非空text', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    expect(myths[0].text.length).toBeGreaterThan(0)
  })
  it('truncText不超过43个字符（40+省略号）', () => {
    ;(sys as any).tickCounter = 4999
    sys.update(5000, [1])
    const myths = sys.getMythsForCiv(1)
    for (const m of myths) {
      expect(m.truncText.length).toBeLessThanOrEqual(43)
    }
  })
})

// ─── handleKeyDown ────────────────────────────────────────────────────────────

describe('MythologySystem.handleKeyDown - 键盘切换面板', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('Shift+Y 切换可见状态为true', () => {
    const e = { shiftKey: true, key: 'Y' } as KeyboardEvent
    sys.handleKeyDown(e)
    expect((sys as any).visible).toBe(true)
  })
  it('Shift+Y 再次调用切换为false', () => {
    const e = { shiftKey: true, key: 'Y' } as KeyboardEvent
    sys.handleKeyDown(e)
    sys.handleKeyDown(e)
    expect((sys as any).visible).toBe(false)
  })
  it('Shift+Y 返回true', () => {
    const e = { shiftKey: true, key: 'Y' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(true)
  })
  it('不按Shift时返回false', () => {
    const e = { shiftKey: false, key: 'Y' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(false)
  })
  it('其他按键返回false', () => {
    const e = { shiftKey: true, key: 'X' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(false)
  })
  it('切换visible时scrollY重置为0', () => {
    ;(sys as any).scrollY = 200
    const e = { shiftKey: true, key: 'Y' } as KeyboardEvent
    sys.handleKeyDown(e)
    expect((sys as any).scrollY).toBe(0)
  })
  it('小写y也可触发切换（toUpperCase）', () => {
    const e = { shiftKey: true, key: 'y' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(true)
    expect((sys as any).visible).toBe(true)
  })
})

// ─── 内部状态与常量 ────────────────────────────────────────────────────────────

describe('MythologySystem - 内部状态初始值', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始visible为false', () => {
    expect((sys as any).visible).toBe(false)
  })
  it('初始selectedCivId为-1', () => {
    expect((sys as any).selectedCivId).toBe(-1)
  })
  it('初始myths为空Map', () => {
    expect((sys as any).myths.size).toBe(0)
  })
  it('初始scrollY为0', () => {
    expect((sys as any).scrollY).toBe(0)
  })
  it('初始tickCounter为0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })
  it('初始dragging为false', () => {
    expect((sys as any).dragging).toBe(false)
  })
})
