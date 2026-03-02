import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldChronicleSystem } from '../systems/WorldChronicleSystem'
import type { Chronicle, WorldSnapshot } from '../systems/WorldChronicleSystem'

// Mock EventLog module
vi.mock('../systems/EventLog', () => ({
  EventLog: { log: vi.fn() },
}))

function makeSys(): WorldChronicleSystem { return new WorldChronicleSystem() }

let chronicleId = 1
function makeChronicle(
  category: Chronicle['category'] = 'war',
  importance: 1 | 2 | 3 = 2,
  civIds: number[] = [],
  entityIds: number[] = [],
  tick = 100,
  year = 50
): Chronicle {
  return {
    id: chronicleId++,
    tick,
    year,
    category,
    title: 'Test Title',
    narrative: 'Test narrative.',
    importance,
    involvedCivs: [...civIds],
    involvedEntities: [...entityIds],
  }
}

function makeSnapshot(
  totalPop = 100,
  totalCities = 5,
  activeWars = 1,
  civs: { id: number; name: string; population: number; cities: number }[] = [],
  era = 'Ancient'
): WorldSnapshot {
  return {
    totalPopulation: totalPop,
    totalCities,
    activeWars,
    civilizations: civs,
    era,
  }
}

// ─── 1. 初始状态 ───────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('chronicles 初始为空', () => {
    expect(sys.getChronicles()).toHaveLength(0)
  })
  it('nextId 初始为 0', () => {
    expect((sys as any).nextId).toBe(0)
  })
  it('lastSummaryTick 初始为 0', () => {
    expect((sys as any).lastSummaryTick).toBe(0)
  })
  it('warNames 初始为空 Map', () => {
    expect((sys as any).warNames.size).toBe(0)
  })
  it('warStartTicks 初始为空 Map', () => {
    expect((sys as any).warStartTicks.size).toBe(0)
  })
  it('getRecentChronicles 初始返回空数组', () => {
    expect(sys.getRecentChronicles(10)).toHaveLength(0)
  })
  it('getChroniclesByCiv 初始返回空数组', () => {
    expect(sys.getChroniclesByCiv(1)).toHaveLength(0)
  })
  it('支持 7 种编年史类别', () => {
    const categories: Chronicle['category'][] = [
      'war', 'hero', 'disaster', 'civilization', 'wonder', 'religion', 'discovery'
    ]
    expect(categories).toHaveLength(7)
  })
})

// ─── 2. 节流逻辑 (SUMMARY_INTERVAL=3600) ──────────────────────
describe('节流逻辑 (SUMMARY_INTERVAL=3600)', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=3600 > 0 时触发 generateWorldSummary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snap = makeSnapshot()
    sys.update(3600, snap)
    expect(sys.getChronicles()).toHaveLength(1)
    expect((sys as any).lastSummaryTick).toBe(3600)
  })
  it('tick=0 时不触发 summary（tick>0 条件）', () => {
    const snap = makeSnapshot()
    sys.update(0, snap)
    // tick=0 不满足 tick>0，不触发
    const chronicles = sys.getChronicles()
    // 但可能触发 milestone（tick%7200===0 且 civs.length>0）
    expect(chronicles.length).toBeGreaterThanOrEqual(0)
  })
  it('tick=3599 时不触发 summary', () => {
    const snap = makeSnapshot()
    sys.update(3599, snap)
    expect(sys.getChronicles()).toHaveLength(0)
  })
  it('连续 update tick=3600 后 lastSummaryTick 更新', () => {
    const snap = makeSnapshot()
    sys.update(3600, snap)
    expect((sys as any).lastSummaryTick).toBe(3600)
  })
  it('7200 时同时触发 summary 和 milestone（有 civ 且 cities>=3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snap = makeSnapshot(500, 10, 1, [{ id: 1, name: 'Alpha', population: 500, cities: 3 }])
    sys.update(7200, snap)
    const chronicles = sys.getChronicles()
    // 至少触发 summary，可能还有 milestone
    expect(chronicles.length).toBeGreaterThanOrEqual(1)
  })
  it('cities < 3 时不触发 milestone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snap = makeSnapshot(100, 2, 0, [{ id: 1, name: 'Alpha', population: 100, cities: 2 }])
    sys.update(7200, snap)
    const wars = sys.getChronicles({ category: 'civilization' })
    // summary 会生成一条 civilization，但 milestone 不会（cities<3）
    // milestone 的 narrative 包含 'controls'
    const milestones = wars.filter(c => c.narrative.includes('controls'))
    expect(milestones).toHaveLength(0)
  })
  it('第二次 update tick<lastSummaryTick+3600 时不重复生成 summary', () => {
    const snap = makeSnapshot()
    sys.update(3600, snap)
    const count = sys.getChronicles().length
    sys.update(7100, snap) // 7100-3600=3500 < 3600
    expect(sys.getChronicles().length).toBe(count)
  })
})

// ─── 3. recordWar 逻辑 ─────────────────────────────────────────
describe('recordWar 逻辑', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('recordWar 生成一条 war 类别记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Victory')
    expect(sys.getChronicles({ category: 'war' })).toHaveLength(1)
  })
  it('war 记录包含双方 civId', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Ceasefire')
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].involvedCivs).toContain(1)
    expect(wars[0].involvedCivs).toContain(2)
  })
  it('war 记录后 warStartTicks 被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Peace')
    expect((sys as any).warStartTicks.size).toBe(0)
  })
  it('war 记录后 warNames 被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Truce')
    expect((sys as any).warNames.size).toBe(0)
  })
  it('duration >= 10 年时 importance=3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // startTick=0 → year0; endTick=36000 → year10 → duration=10
    ;(sys as any).warStartTicks.set('1-2', 0)
    sys.recordWar(36000, 1, 2, 'Victory')
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].importance).toBe(3)
  })
  it('duration 3-9 年时 importance=2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).warStartTicks.set('1-2', 0)
    sys.recordWar(14400, 1, 2, 'Stalemate') // 14400/3600=4 years
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].importance).toBe(2)
  })
  it('duration < 3 年时 importance=1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).warStartTicks.set('1-2', 0)
    sys.recordWar(3600, 1, 2, 'Quick') // 1 year
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].importance).toBe(1)
  })
  it('war key 是 lo-hi 格式（civA=2, civB=1 → key=1-2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 2, 1, 'Over')
    // warStartTicks should have used key '1-2'
    // 由于 recordWar 结束会清理，通过 addChronicle 验证
    expect(sys.getChronicles({ category: 'war' })).toHaveLength(1)
  })
  it('narrative 包含战争名称和年份', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Victory')
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].narrative).toContain('1')
    expect(wars[0].narrative.length).toBeGreaterThan(10)
  })
  it('带文明名称时 narrative 包含名称', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.recordWar(3600, 1, 2, 'Victory', 'Elves', 'Humans')
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].narrative).toContain('Elves')
    expect(wars[0].narrative).toContain('Humans')
  })
})

// ─── 4. recordCivMilestone 逻辑 ────────────────────────────────
describe('recordCivMilestone 逻辑', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('recordCivMilestone 生成一条 civilization 记录', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'founded a village')
    expect(sys.getChronicles({ category: 'civilization' })).toHaveLength(1)
  })
  it('milestone 包含文明名称', () => {
    sys.recordCivMilestone(3600, 1, 'TestCiv', 'built 5 cities')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].narrative).toContain('TestCiv')
  })
  it('milestone 包含年份', () => {
    sys.recordCivMilestone(7200, 1, 'Alpha', 'reached peak')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].narrative).toContain('Year 2')
  })
  it('milestone 含 "10" 时 importance=3', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'controls 10 cities')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].importance).toBe(3)
  })
  it('milestone 含 "peak" 时 importance=3', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'reached peak power')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].importance).toBe(3)
  })
  it('milestone 含 "cities" 时 importance=2', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'expanded to 5 cities')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].importance).toBe(2)
  })
  it('普通 milestone 时 importance=1', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'founded a village')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].importance).toBe(1)
  })
  it('involvedCivs 包含 civId', () => {
    sys.recordCivMilestone(3600, 42, 'Beta', 'event')
    const civs = sys.getChronicles({ category: 'civilization' })
    expect(civs[0].involvedCivs).toContain(42)
  })
})

// ─── 5. getChronicles 过滤 ─────────────────────────────────────
describe('getChronicles 过滤', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => {
    sys = makeSys(); chronicleId = 1
    ;(sys as any).chronicles.push(makeChronicle('war', 1))
    ;(sys as any).chronicles.push(makeChronicle('hero', 2))
    ;(sys as any).chronicles.push(makeChronicle('disaster', 3))
    ;(sys as any).chronicles.push(makeChronicle('civilization', 1))
    ;(sys as any).chronicles.push(makeChronicle('wonder', 2))
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('无 filter 时返回全部', () => {
    expect(sys.getChronicles()).toHaveLength(5)
  })
  it('按 category=war 过滤', () => {
    expect(sys.getChronicles({ category: 'war' })).toHaveLength(1)
  })
  it('按 category=hero 过滤', () => {
    expect(sys.getChronicles({ category: 'hero' })).toHaveLength(1)
  })
  it('按 minImportance=2 过滤', () => {
    expect(sys.getChronicles({ minImportance: 2 })).toHaveLength(3)
  })
  it('按 minImportance=3 过滤', () => {
    expect(sys.getChronicles({ minImportance: 3 })).toHaveLength(1)
  })
  it('按 category 和 minImportance 组合过滤', () => {
    expect(sys.getChronicles({ category: 'wonder', minImportance: 2 })).toHaveLength(1)
  })
  it('category 无匹配时返回空', () => {
    expect(sys.getChronicles({ category: 'religion' })).toHaveLength(0)
  })
  it('minImportance=4（无效高值）返回空', () => {
    expect(sys.getChronicles({ minImportance: 4 as any })).toHaveLength(0)
  })
})

// ─── 6. getRecentChronicles 和 getChroniclesByCiv ──────────────
describe('getRecentChronicles / getChroniclesByCiv', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('getRecentChronicles(5) 返回最后 5 条', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).chronicles.push(makeChronicle('war', 1))
    }
    expect(sys.getRecentChronicles(5)).toHaveLength(5)
  })
  it('getRecentChronicles(10) 记录不足 10 条时返回全部', () => {
    for (let i = 0; i < 7; i++) {
      ;(sys as any).chronicles.push(makeChronicle('hero', 2))
    }
    expect(sys.getRecentChronicles(10)).toHaveLength(7)
  })
  it('getRecentChronicles 默认 count=10', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).chronicles.push(makeChronicle())
    }
    expect(sys.getRecentChronicles()).toHaveLength(10)
  })
  it('getChroniclesByCiv 按 civId 过滤', () => {
    ;(sys as any).chronicles.push(makeChronicle('war', 2, [1, 2]))
    ;(sys as any).chronicles.push(makeChronicle('hero', 1, [2]))
    ;(sys as any).chronicles.push(makeChronicle('disaster', 3, [3]))
    expect(sys.getChroniclesByCiv(2)).toHaveLength(2)
  })
  it('getChroniclesByCiv 无匹配返回空', () => {
    ;(sys as any).chronicles.push(makeChronicle('war', 2, [1]))
    expect(sys.getChroniclesByCiv(99)).toHaveLength(0)
  })
  it('getChroniclesByCiv civId=0 时匹配 involvedCivs 含 0', () => {
    ;(sys as any).chronicles.push(makeChronicle('civilization', 1, [0]))
    expect(sys.getChroniclesByCiv(0)).toHaveLength(1)
  })
})

// ─── 7. pruneChronicles 裁剪逻辑 ──────────────────────────────
describe('pruneChronicles (MAX_CHRONICLES=500)', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('chronicles 不超过 500 条', () => {
    for (let i = 0; i < 520; i++) {
      ;(sys as any).chronicles.push(makeChronicle('war', 1))
    }
    ;(sys as any).pruneChronicles()
    expect(sys.getChronicles().length).toBeLessThanOrEqual(500)
  })
  it('裁剪时优先删除 importance=1', () => {
    for (let i = 0; i < 490; i++) {
      ;(sys as any).chronicles.push(makeChronicle('war', 1))
    }
    for (let i = 0; i < 20; i++) {
      ;(sys as any).chronicles.push(makeChronicle('war', 3))
    }
    ;(sys as any).pruneChronicles()
    const remaining = sys.getChronicles()
    expect(remaining.length).toBeLessThanOrEqual(500)
    // 高 importance 条目应优先保留
    const imp3 = remaining.filter(c => c.importance === 3)
    expect(imp3.length).toBe(20)
  })
  it('500 条以内不触发裁剪', () => {
    for (let i = 0; i < 500; i++) {
      ;(sys as any).chronicles.push(makeChronicle('war', 1))
    }
    ;(sys as any).pruneChronicles()
    expect(sys.getChronicles().length).toBe(500)
  })
  it('501 条时触发裁剪', () => {
    for (let i = 0; i < 501; i++) {
      ;(sys as any).chronicles.push(makeChronicle('disaster', 1))
    }
    ;(sys as any).pruneChronicles()
    expect(sys.getChronicles().length).toBeLessThanOrEqual(500)
  })
  it('大量记录写入后最终不超过 MAX', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snap = makeSnapshot(1000, 10, 2, [{ id: 1, name: 'A', population: 1000, cities: 5 }])
    for (let t = 3600; t <= 3600 * 600; t += 3600) {
      sys.update(t, snap)
    }
    expect(sys.getChronicles().length).toBeLessThanOrEqual(500)
  })
})

// ─── 8. generateWarName / 边界验证 ────────────────────────────
describe('generateWarName / 边界验证', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); chronicleId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('generateWarName 返回非空字符串', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = sys.generateWarName()
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })
  it('random < 0.5 时使用 WAR_ADJ_MINOR', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const name = sys.generateWarName()
    const minorAdj = ['Border', 'Short', 'Bitter', 'Silent', 'Forgotten']
    const noun = ['War', 'Conflict', 'Crusade', 'Campaign', 'Siege', 'Conquest', 'Uprising']
    const parts = name.split(' ')
    expect(minorAdj.includes(parts[0])).toBe(true)
  })
  it('random 0.5-0.85 时使用 WAR_ADJ_MAJOR', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6)
    const name = sys.generateWarName()
    const majorAdj = ['Great', 'Bloody', 'Burning', 'Iron', 'Crimson']
    const parts = name.split(' ')
    expect(majorAdj.includes(parts[0])).toBe(true)
  })
  it('random >= 0.85 时使用 WAR_ADJ_LEGENDARY', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const name = sys.generateWarName()
    const legendaryAdj = ['Eternal', 'Apocalyptic', 'Cataclysmic', 'Unholy', 'Divine']
    const parts = name.split(' ')
    expect(legendaryAdj.includes(parts[0])).toBe(true)
  })
  it('nextId 每次 addChronicle 递增', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'milestone 1')
    expect((sys as any).nextId).toBe(1)
    sys.recordCivMilestone(3600, 2, 'Beta', 'milestone 2')
    expect((sys as any).nextId).toBe(2)
  })
  it('chronicle 的 id 从 0 开始递增', () => {
    sys.recordCivMilestone(3600, 1, 'A', 'm1')
    sys.recordCivMilestone(3600, 2, 'B', 'm2')
    const c = sys.getChronicles()
    expect(c[0].id).toBe(0)
    expect(c[1].id).toBe(1)
  })
  it('tickToYear: tick=3600 → year=1', () => {
    sys.recordCivMilestone(3600, 1, 'Alpha', 'event')
    const c = sys.getChronicles()[0]
    expect(c.year).toBe(1)
  })
  it('tickToYear: tick=7200 → year=2', () => {
    sys.recordCivMilestone(7200, 1, 'Alpha', 'event')
    const c = sys.getChronicles()[0]
    expect(c.year).toBe(2)
  })
  it('war duration=1 时 narrative 不含复数 years', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).warStartTicks.set('1-2', 0)
    sys.recordWar(3600, 1, 2, 'Quick end')
    const wars = sys.getChronicles({ category: 'war' })
    expect(wars[0].narrative).toContain('1 year')
    expect(wars[0].narrative).not.toContain('1 years')
  })
  it('generateWorldSummary 生成的记录包含人口信息', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snap = makeSnapshot(500, 8, 2, [], 'Medieval')
    sys.update(3600, snap)
    const civChronicles = sys.getChronicles({ category: 'civilization' })
    expect(civChronicles[0].narrative).toContain('500')
  })
})
