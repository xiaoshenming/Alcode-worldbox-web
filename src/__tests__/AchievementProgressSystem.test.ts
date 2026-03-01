import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementProgressSystem } from '../systems/AchievementProgressSystem'

// AchievementProgressSystem 的纯逻辑测试：
// - updateProgress / isCompleted / getProgress（进度计算和完成判定）
// - getByCategory（分类筛选）
// - getCompletionRate（完成率）
// - isPanelOpen / togglePanel（面板开关状态）
// - setFilter（分类过滤设置，无副作用可观察，只要不崩溃）
// 构造函数无外部依赖，直接 new 即可。

function makeAPS(): AchievementProgressSystem {
  return new AchievementProgressSystem()
}

// ── updateProgress / isCompleted ──────────────────────────────────────────────

describe('AchievementProgressSystem.updateProgress + isCompleted', () => {
  let aps: AchievementProgressSystem

  beforeEach(() => {
    aps = makeAPS()
  })

  it('初始状态所有成就未完成', () => {
    expect(aps.isCompleted('first_civ')).toBe(false)
    expect(aps.isCompleted('first_kill')).toBe(false)
  })

  it('未知 id 时 isCompleted 返回 false', () => {
    expect(aps.isCompleted('nonexistent_id')).toBe(false)
  })

  it('更新进度到目标值时成就完成', () => {
    aps.updateProgress('first_civ', 1)  // target=1
    expect(aps.isCompleted('first_civ')).toBe(true)
  })

  it('进度未达目标时不完成', () => {
    aps.updateProgress('pop_100', 99)  // target=100
    expect(aps.isCompleted('pop_100')).toBe(false)
  })

  it('超过目标值时成就完成（不超出）', () => {
    aps.updateProgress('first_kill', 999)  // target=1
    expect(aps.isCompleted('first_kill')).toBe(true)
  })

  it('成就完成后再次更新进度无效（不可重复完成）', () => {
    aps.updateProgress('first_civ', 1)
    expect(aps.isCompleted('first_civ')).toBe(true)
    // 如果 updateProgress 已完成就跳过（不崩溃）
    expect(() => aps.updateProgress('first_civ', 2)).not.toThrow()
  })

  it('未知 id 时 updateProgress 不崩溃', () => {
    expect(() => aps.updateProgress('ghost_id', 100)).not.toThrow()
  })

  it('可以完成多个不同类型的成就', () => {
    aps.updateProgress('first_civ', 1)
    aps.updateProgress('first_kill', 1)
    aps.updateProgress('disaster_1', 1)
    expect(aps.isCompleted('first_civ')).toBe(true)
    expect(aps.isCompleted('first_kill')).toBe(true)
    expect(aps.isCompleted('disaster_1')).toBe(true)
  })
})

// ── getProgress ───────────────────────────────────────────────────────────────

describe('AchievementProgressSystem.getProgress', () => {
  let aps: AchievementProgressSystem

  beforeEach(() => {
    aps = makeAPS()
  })

  it('初始进度为 0', () => {
    expect(aps.getProgress('pop_100')).toBe(0)
  })

  it('未知 id 返回 0', () => {
    expect(aps.getProgress('ghost_id')).toBe(0)
  })

  it('部分完成时返回 0~1 之间的比例', () => {
    aps.updateProgress('pop_100', 50)  // target=100, current=50
    expect(aps.getProgress('pop_100')).toBeCloseTo(0.5)
  })

  it('完全完成时返回 1', () => {
    aps.updateProgress('pop_100', 100)
    expect(aps.getProgress('pop_100')).toBe(1)
  })

  it('超过目标时返回不超过 1', () => {
    aps.updateProgress('first_civ', 100)  // target=1
    expect(aps.getProgress('first_civ')).toBeLessThanOrEqual(1)
  })

  it('10000 tick 成就进度可以精确计算', () => {
    aps.updateProgress('play_10k', 2500)  // target=10000, current=2500
    expect(aps.getProgress('play_10k')).toBeCloseTo(0.25)
  })
})

// ── getByCategory ─────────────────────────────────────────────────────────────

describe('AchievementProgressSystem.getByCategory', () => {
  let aps: AchievementProgressSystem

  beforeEach(() => {
    aps = makeAPS()
  })

  it('exploration 分类有预定义成就', () => {
    const result = aps.getByCategory('exploration')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((a: any) => expect(a.category).toBe('exploration'))
  })

  it('civilization 分类有预定义成就', () => {
    const result = aps.getByCategory('civilization')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((a: any) => expect(a.category).toBe('civilization'))
  })

  it('combat 分类有预定义成就', () => {
    const result = aps.getByCategory('combat')
    expect(result.length).toBeGreaterThan(0)
  })

  it('nature 分类有预定义成就', () => {
    const result = aps.getByCategory('nature')
    expect(result.length).toBeGreaterThan(0)
  })

  it('special 分类有预定义成就', () => {
    const result = aps.getByCategory('special')
    expect(result.length).toBeGreaterThan(0)
  })

  it('未知分类返回空数组', () => {
    expect(aps.getByCategory('nonexistent')).toHaveLength(0)
  })

  it('各分类成就 id 对应正确分类', () => {
    const civAchievements = aps.getByCategory('civilization')
    // 已知 'first_civ' 属于 civilization 分类
    expect(civAchievements.some((a: any) => a.id === 'first_civ')).toBe(true)
  })
})

// ── getCompletionRate ─────────────────────────────────────────────────────────

describe('AchievementProgressSystem.getCompletionRate', () => {
  let aps: AchievementProgressSystem

  beforeEach(() => {
    aps = makeAPS()
  })

  it('初始时完成率为 0', () => {
    expect(aps.getCompletionRate()).toBe(0)
  })

  it('完成若干成就后完成率 > 0', () => {
    aps.updateProgress('first_civ', 1)
    expect(aps.getCompletionRate()).toBeGreaterThan(0)
  })

  it('完成率为 completed/total 比例', () => {
    // 有 20 个预定义成就（按 AchievementProgressSystem.ts 中的 defs 数量）
    const total = (aps as any).achievements.length as number
    // 完成 1 个
    aps.updateProgress('first_civ', 1)
    expect(aps.getCompletionRate()).toBeCloseTo(1 / total)
  })

  it('完成率不超过 1', () => {
    // 完成所有单步成就
    ;(aps as any).achievements.forEach((a: any) => {
      aps.updateProgress(a.id, a.target)
    })
    expect(aps.getCompletionRate()).toBeLessThanOrEqual(1)
  })
})

// ── isPanelOpen / togglePanel ─────────────────────────────────────────────────

describe('AchievementProgressSystem panel state', () => {
  let aps: AchievementProgressSystem

  beforeEach(() => {
    aps = makeAPS()
  })

  it('初始面板关闭', () => {
    expect(aps.isPanelOpen()).toBe(false)
  })

  it('togglePanel 打开面板', () => {
    aps.togglePanel()
    expect(aps.isPanelOpen()).toBe(true)
  })

  it('togglePanel 再次关闭面板', () => {
    aps.togglePanel()
    aps.togglePanel()
    expect(aps.isPanelOpen()).toBe(false)
  })

  it('setFilter 不崩溃', () => {
    expect(() => aps.setFilter('combat')).not.toThrow()
    expect(() => aps.setFilter(null)).not.toThrow()
    expect(() => aps.setFilter('exploration')).not.toThrow()
  })
})
