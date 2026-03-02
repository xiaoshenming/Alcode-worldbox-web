import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QuestSystem } from '../systems/QuestSystem'
import type { Quest, Legend } from '../systems/QuestSystem'

afterEach(() => vi.restoreAllMocks())

function makeQS(): QuestSystem {
  return new QuestSystem()
}

/** 构造最小 Quest 对象 */
function makeQuest(id: number, overrides: Partial<Quest> = {}): Quest {
  return {
    id,
    type: 'slay_dragon',
    heroId: 1,
    civId: 1,
    targetX: 10,
    targetY: 10,
    progress: 0,
    reward: { xp: 100, gold: 50, fame: 10 },
    description: 'Test quest',
    startTick: 0,
    timeLimit: 1000,
    completed: false,
    failed: false,
    ...overrides,
  }
}

/** 构造最小 Legend 对象 */
function makeLegend(heroId: number, overrides: Partial<Legend> = {}): Legend {
  return {
    heroId,
    heroName: `Hero_${heroId}`,
    deeds: [],
    fame: 0,
    ballads: 0,
    civId: 1,
    ...overrides,
  }
}

// ── getActiveQuests 基础行为 ───────────────────────────────────────────────
describe('QuestSystem.getActiveQuests 基础行为', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('初始状态下返回空数组', () => {
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('只返回未完成且未失败的任务', () => {
    const q1 = makeQuest(1)
    const q2 = makeQuest(2, { completed: true })
    const q3 = makeQuest(3, { failed: true })
    const q4 = makeQuest(4, { completed: false, failed: false })
    ;(qs as any).quests = [q1, q2, q3, q4]
    const active = qs.getActiveQuests()
    expect(active).toHaveLength(2)
    expect(active.map((q: Quest) => q.id)).toContain(1)
    expect(active.map((q: Quest) => q.id)).toContain(4)
    expect(active.map((q: Quest) => q.id)).not.toContain(2)
    expect(active.map((q: Quest) => q.id)).not.toContain(3)
  })

  it('全部完成时返回空数组', () => {
    ;(qs as any).quests = [
      makeQuest(1, { completed: true }),
      makeQuest(2, { completed: true }),
    ]
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('全部失败时返回空数组', () => {
    ;(qs as any).quests = [
      makeQuest(1, { failed: true }),
      makeQuest(2, { failed: true }),
    ]
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('返回的任务包含正确的 id 和 type', () => {
    ;(qs as any).quests = [makeQuest(7, { type: 'holy_pilgrimage' })]
    const active = qs.getActiveQuests()
    expect(active[0].id).toBe(7)
    expect(active[0].type).toBe('holy_pilgrimage')
  })

  it('completed=true 且 failed=true 同时时也排除', () => {
    ;(qs as any).quests = [makeQuest(1, { completed: true, failed: true })]
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('混合状态下只返回 active 任务', () => {
    ;(qs as any).quests = [
      makeQuest(1),
      makeQuest(2, { completed: true }),
      makeQuest(3, { failed: true }),
      makeQuest(4),
      makeQuest(5, { completed: true }),
    ]
    expect(qs.getActiveQuests()).toHaveLength(2)
  })

  it('progress=100 但未标记 completed=true 仍视为 active', () => {
    ;(qs as any).quests = [makeQuest(1, { progress: 100, completed: false, failed: false })]
    expect(qs.getActiveQuests()).toHaveLength(1)
  })

  it('返回数组类型', () => {
    expect(Array.isArray(qs.getActiveQuests())).toBe(true)
  })

  it('返回内部 buffer 引用（多次调用同一对象）', () => {
    const r1 = qs.getActiveQuests()
    const r2 = qs.getActiveQuests()
    expect(r1).toBe(r2)
  })
})

// ── getActiveQuests 任务类型覆盖 ──────────────────────────────────────────
describe('QuestSystem.getActiveQuests 任务类型覆盖', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('slay_dragon 类型 active 任务可返回', () => {
    ;(qs as any).quests = [makeQuest(1, { type: 'slay_dragon' })]
    expect(qs.getActiveQuests()[0].type).toBe('slay_dragon')
  })

  it('explore_ruins 类型 active 任务可返回', () => {
    ;(qs as any).quests = [makeQuest(1, { type: 'explore_ruins' })]
    expect(qs.getActiveQuests()[0].type).toBe('explore_ruins')
  })

  it('defend_village 类型 active 任务可返回', () => {
    ;(qs as any).quests = [makeQuest(1, { type: 'defend_village' })]
    expect(qs.getActiveQuests()[0].type).toBe('defend_village')
  })

  it('find_artifact 类型 active 任务可返回', () => {
    ;(qs as any).quests = [makeQuest(1, { type: 'find_artifact' })]
    expect(qs.getActiveQuests()[0].type).toBe('find_artifact')
  })

  it('escort_caravan 类型 active 任务可返回', () => {
    ;(qs as any).quests = [makeQuest(1, { type: 'escort_caravan' })]
    expect(qs.getActiveQuests()[0].type).toBe('escort_caravan')
  })

  it('6种任务类型都 active 时返回6个', () => {
    const types = ['slay_dragon', 'explore_ruins', 'defend_village', 'find_artifact', 'escort_caravan', 'holy_pilgrimage'] as const
    ;(qs as any).quests = types.map((t, i) => makeQuest(i + 1, { type: t }))
    expect(qs.getActiveQuests()).toHaveLength(6)
  })
})

// ── getActiveQuests Quest 字段完整性 ──────────────────────────────────────
describe('QuestSystem.getActiveQuests 任务字段完整性', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('返回任务包含 reward 对象', () => {
    ;(qs as any).quests = [makeQuest(1, { reward: { xp: 200, gold: 100, fame: 50 } })]
    const active = qs.getActiveQuests()
    expect(active[0].reward.xp).toBe(200)
    expect(active[0].reward.gold).toBe(100)
    expect(active[0].reward.fame).toBe(50)
  })

  it('返回任务包含 heroId 和 civId', () => {
    ;(qs as any).quests = [makeQuest(1, { heroId: 42, civId: 7 })]
    const active = qs.getActiveQuests()
    expect(active[0].heroId).toBe(42)
    expect(active[0].civId).toBe(7)
  })

  it('返回任务包含 targetX 和 targetY', () => {
    ;(qs as any).quests = [makeQuest(1, { targetX: 55, targetY: 77 })]
    const active = qs.getActiveQuests()
    expect(active[0].targetX).toBe(55)
    expect(active[0].targetY).toBe(77)
  })

  it('返回任务包含 progress 字段', () => {
    ;(qs as any).quests = [makeQuest(1, { progress: 50 })]
    const active = qs.getActiveQuests()
    expect(active[0].progress).toBe(50)
  })

  it('返回任务包含 startTick 和 timeLimit', () => {
    ;(qs as any).quests = [makeQuest(1, { startTick: 500, timeLimit: 2000 })]
    const active = qs.getActiveQuests()
    expect(active[0].startTick).toBe(500)
    expect(active[0].timeLimit).toBe(2000)
  })

  it('返回任务包含 description 字符串', () => {
    ;(qs as any).quests = [makeQuest(1, { description: 'Custom description' })]
    const active = qs.getActiveQuests()
    expect(active[0].description).toBe('Custom description')
  })

  it('返回任务中 completed 和 failed 都为 false', () => {
    ;(qs as any).quests = [makeQuest(1)]
    const active = qs.getActiveQuests()
    expect(active[0].completed).toBe(false)
    expect(active[0].failed).toBe(false)
  })
})

// ── getActiveQuests buffer 重置 ────────────────────────────────────────────
describe('QuestSystem.getActiveQuests buffer 重置行为', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('多次调用后不累积旧数据', () => {
    ;(qs as any).quests = [makeQuest(1), makeQuest(2)]
    qs.getActiveQuests()
    ;(qs as any).quests = [makeQuest(3)]
    expect(qs.getActiveQuests()).toHaveLength(1)
    expect(qs.getActiveQuests()[0].id).toBe(3)
  })

  it('任务被标记 completed 后下次调用不再包含', () => {
    const q = makeQuest(1)
    ;(qs as any).quests = [q]
    expect(qs.getActiveQuests()).toHaveLength(1)
    q.completed = true
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('任务被标记 failed 后下次调用不再包含', () => {
    const q = makeQuest(1)
    ;(qs as any).quests = [q]
    expect(qs.getActiveQuests()).toHaveLength(1)
    q.failed = true
    expect(qs.getActiveQuests()).toHaveLength(0)
  })
})

// ── getLegends 基础行为 ────────────────────────────────────────────────────
describe('QuestSystem.getLegends 基础行为', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('初始状态下返回空数组', () => {
    expect(qs.getLegends()).toHaveLength(0)
  })

  it('插入 legend 后可查询到', () => {
    const legend = makeLegend(42, {
      heroName: 'Arthas',
      deeds: ['slew dragon', 'saved village'],
      fame: 250,
      ballads: 3,
      civId: 1,
    })
    ;(qs as any).legends.set(42, legend)
    const legends = qs.getLegends()
    expect(legends).toHaveLength(1)
    expect(legends[0].heroName).toBe('Arthas')
    expect(legends[0].fame).toBe(250)
  })

  it('多个 legend 都能查询到', () => {
    ;(qs as any).legends.set(1, makeLegend(1, { heroName: 'Hero1', fame: 10 }))
    ;(qs as any).legends.set(2, makeLegend(2, { heroName: 'Hero2', fame: 20, ballads: 1, civId: 2 }))
    expect(qs.getLegends()).toHaveLength(2)
  })

  it('getLegends 返回的是数组类型', () => {
    expect(Array.isArray(qs.getLegends())).toBe(true)
  })

  it('返回内部 buffer 引用（多次调用同一对象）', () => {
    const r1 = qs.getLegends()
    const r2 = qs.getLegends()
    expect(r1).toBe(r2)
  })

  it('删除 legend 后 getLegends 减少', () => {
    ;(qs as any).legends.set(1, makeLegend(1))
    ;(qs as any).legends.set(2, makeLegend(2))
    expect(qs.getLegends()).toHaveLength(2)
    ;(qs as any).legends.delete(1)
    expect(qs.getLegends()).toHaveLength(1)
  })
})

// ── getLegends 字段完整性 ──────────────────────────────────────────────────
describe('QuestSystem.getLegends 字段完整性', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('legend 包含 heroId 字段', () => {
    ;(qs as any).legends.set(5, makeLegend(5))
    expect(qs.getLegends()[0].heroId).toBe(5)
  })

  it('legend 包含 heroName 字段', () => {
    ;(qs as any).legends.set(5, makeLegend(5, { heroName: 'Gandalf' }))
    expect(qs.getLegends()[0].heroName).toBe('Gandalf')
  })

  it('legend 包含 deeds 数组', () => {
    ;(qs as any).legends.set(5, makeLegend(5, { deeds: ['deed1', 'deed2'] }))
    expect(qs.getLegends()[0].deeds).toHaveLength(2)
  })

  it('legend 包含 fame 数值', () => {
    ;(qs as any).legends.set(5, makeLegend(5, { fame: 999 }))
    expect(qs.getLegends()[0].fame).toBe(999)
  })

  it('legend 包含 ballads 数值', () => {
    ;(qs as any).legends.set(5, makeLegend(5, { ballads: 7 }))
    expect(qs.getLegends()[0].ballads).toBe(7)
  })

  it('legend 包含 civId 字段', () => {
    ;(qs as any).legends.set(5, makeLegend(5, { civId: 3 }))
    expect(qs.getLegends()[0].civId).toBe(3)
  })

  it('legend 初始 deeds 为空数组', () => {
    ;(qs as any).legends.set(5, makeLegend(5))
    expect(qs.getLegends()[0].deeds).toHaveLength(0)
  })

  it('legend 初始 ballads 为0', () => {
    ;(qs as any).legends.set(5, makeLegend(5))
    expect(qs.getLegends()[0].ballads).toBe(0)
  })

  it('legend 初始 fame 为0', () => {
    ;(qs as any).legends.set(5, makeLegend(5))
    expect(qs.getLegends()[0].fame).toBe(0)
  })
})

// ── getLegends buffer 重置 ─────────────────────────────────────────────────
describe('QuestSystem.getLegends buffer 重置行为', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('多次调用后不累积旧数据', () => {
    ;(qs as any).legends.set(1, makeLegend(1))
    ;(qs as any).legends.set(2, makeLegend(2))
    qs.getLegends()
    ;(qs as any).legends.delete(2)
    expect(qs.getLegends()).toHaveLength(1)
  })

  it('清空 legends 后 getLegends 返回空数组', () => {
    ;(qs as any).legends.set(1, makeLegend(1))
    ;(qs as any).legends.clear()
    expect(qs.getLegends()).toHaveLength(0)
  })
})

// ── 私有字段初始状态 ───────────────────────────────────────────────────────
describe('QuestSystem 私有字段初始状态', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('quests 初始为空数组', () => {
    expect((qs as any).quests).toHaveLength(0)
  })

  it('legends 初始为空 Map', () => {
    expect((qs as any).legends.size).toBe(0)
  })

  it('nextQuestId 初始为1', () => {
    expect((qs as any).nextQuestId).toBe(1)
  })

  it('lastGenerateTick 初始为0', () => {
    expect((qs as any).lastGenerateTick).toBe(0)
  })

  it('_activeQuestsBuf 初始为空数组', () => {
    expect((qs as any)._activeQuestsBuf).toHaveLength(0)
  })

  it('_legendsBuf 初始为空数组', () => {
    expect((qs as any)._legendsBuf).toHaveLength(0)
  })

  it('_candidatesBuf 初始为空数组', () => {
    expect((qs as any)._candidatesBuf).toHaveLength(0)
  })

  it('_targetBuf 初始 x=0, y=0', () => {
    expect((qs as any)._targetBuf.x).toBe(0)
    expect((qs as any)._targetBuf.y).toBe(0)
  })

  it('_nearestBuf 初始 dist=Infinity', () => {
    expect((qs as any)._nearestBuf.dist).toBe(Infinity)
  })
})

// ── 边界条件与异常情况 ────────────────────────────────────────────────────
describe('QuestSystem 边界条件', () => {
  let qs: QuestSystem
  beforeEach(() => { qs = makeQS() })

  it('quests 为空时 getActiveQuests 返回空', () => {
    ;(qs as any).quests = []
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('legends 为空时 getLegends 返回空', () => {
    ;(qs as any).legends = new Map()
    expect(qs.getLegends()).toHaveLength(0)
  })

  it('大量 active quests（100个）都能正确返回', () => {
    ;(qs as any).quests = Array.from({ length: 100 }, (_, i) => makeQuest(i + 1))
    expect(qs.getActiveQuests()).toHaveLength(100)
  })

  it('大量 legends（50个）都能正确返回', () => {
    for (let i = 1; i <= 50; i++) {
      ;(qs as any).legends.set(i, makeLegend(i))
    }
    expect(qs.getLegends()).toHaveLength(50)
  })

  it('progress=0 的任务仍视为 active', () => {
    ;(qs as any).quests = [makeQuest(1, { progress: 0 })]
    expect(qs.getActiveQuests()).toHaveLength(1)
  })

  it('timeLimit=0 的任务仍可在 active quests 中存在（直到 update 处理）', () => {
    ;(qs as any).quests = [makeQuest(1, { timeLimit: 0, completed: false, failed: false })]
    expect(qs.getActiveQuests()).toHaveLength(1)
  })

  it('fame=0 的 legend 可正常查询', () => {
    ;(qs as any).legends.set(1, makeLegend(1, { fame: 0 }))
    expect(qs.getLegends()[0].fame).toBe(0)
  })

  it('deeds 超过19条的 legend 可正常查询', () => {
    const manyDeeds = Array.from({ length: 25 }, (_, i) => `deed_${i}`)
    ;(qs as any).legends.set(1, makeLegend(1, { deeds: manyDeeds }))
    expect(qs.getLegends()[0].deeds).toHaveLength(25)
  })

  it('不同 heroId 的 legend 各自独立', () => {
    ;(qs as any).legends.set(1, makeLegend(1, { fame: 100 }))
    ;(qs as any).legends.set(2, makeLegend(2, { fame: 200 }))
    const legends = qs.getLegends()
    const fames = legends.map((l: Legend) => l.fame).sort((a: number, b: number) => a - b)
    expect(fames).toEqual([100, 200])
  })

  it('quest 的 reward.xp 为0时仍正常返回', () => {
    ;(qs as any).quests = [makeQuest(1, { reward: { xp: 0, gold: 0, fame: 0 } })]
    expect(qs.getActiveQuests()[0].reward.xp).toBe(0)
  })
})
