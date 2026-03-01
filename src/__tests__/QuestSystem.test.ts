import { describe, it, expect, beforeEach } from 'vitest'
import { QuestSystem } from '../systems/QuestSystem'
import type { Quest } from '../systems/QuestSystem'

// QuestSystem 的 getActiveQuests/getLegends 只访问内部 quests/legends，
// 无需 EntityManager/World/CivManager 依赖。
// 通过直接操作私有字段（利用 as any）注入测试数据。

function makeQS(): QuestSystem {
  return new QuestSystem()
}

// 构造最小 Quest 对象
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

// ── getActiveQuests ───────────────────────────────────────────────────────────

describe('QuestSystem.getActiveQuests', () => {
  let qs: QuestSystem

  beforeEach(() => {
    qs = makeQS()
  })

  it('初始状态下返回空数组', () => {
    expect(qs.getActiveQuests()).toHaveLength(0)
  })

  it('只返回未完成且未失败的任务', () => {
    const q1 = makeQuest(1)                                      // active
    const q2 = makeQuest(2, { completed: true })                  // done
    const q3 = makeQuest(3, { failed: true })                     // failed
    const q4 = makeQuest(4, { completed: false, failed: false })  // active

    ;(qs as any).quests = [q1, q2, q3, q4]

    const active = qs.getActiveQuests()
    expect(active).toHaveLength(2)
    expect(active.map((q: any) => q.id)).toContain(1)
    expect(active.map((q: any) => q.id)).toContain(4)
    expect(active.map((q: any) => q.id)).not.toContain(2)
    expect(active.map((q: any) => q.id)).not.toContain(3)
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
})

// ── getLegends ────────────────────────────────────────────────────────────────

describe('QuestSystem.getLegends', () => {
  let qs: QuestSystem

  beforeEach(() => {
    qs = makeQS()
  })

  it('初始状态下返回空数组', () => {
    expect(qs.getLegends()).toHaveLength(0)
  })

  it('插入 legend 后可查询到', () => {
    const legend = {
      heroId: 42,
      heroName: 'Arthas',
      deeds: ['slew dragon', 'saved village'],
      fame: 250,
      ballads: 3,
      civId: 1,
    }
    // getLegends() 返回 Legend[]（数组），需通过私有 legends Map 注入数据
    ;(qs as any).legends.set(42, legend)
    const legends = qs.getLegends()
    expect(legends).toHaveLength(1)
    expect(legends[0].heroName).toBe('Arthas')
    expect(legends[0].fame).toBe(250)
  })

  it('多个 legend 都能查询到', () => {
    ;(qs as any).legends.set(1, { heroId: 1, heroName: 'Hero1', deeds: [], fame: 10, ballads: 0, civId: 1 })
    ;(qs as any).legends.set(2, { heroId: 2, heroName: 'Hero2', deeds: [], fame: 20, ballads: 1, civId: 2 })
    expect(qs.getLegends()).toHaveLength(2)
  })

  it('getLegends 返回的是数组类型', () => {
    expect(Array.isArray(qs.getLegends())).toBe(true)
  })
})
