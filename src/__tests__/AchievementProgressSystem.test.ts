import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AchievementProgressSystem } from '../systems/AchievementProgressSystem'

function makeAPS(): AchievementProgressSystem { return new AchievementProgressSystem() }

describe('AchievementProgressSystem.updateProgress + isCompleted', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始状态所有成就未完成', () => {
    expect(aps.isCompleted('first_civ')).toBe(false)
    expect(aps.isCompleted('first_kill')).toBe(false)
  })
  it('未知 id 时 isCompleted 返回 false', () => {
    expect(aps.isCompleted('nonexistent_id')).toBe(false)
  })
  it('更新进度到目标值时成就完成', () => {
    aps.updateProgress('first_civ', 1)
    expect(aps.isCompleted('first_civ')).toBe(true)
  })
  it('进度未达目标时不完成', () => {
    aps.updateProgress('pop_100', 99)
    expect(aps.isCompleted('pop_100')).toBe(false)
  })
  it('超过目标值时成就完成', () => {
    aps.updateProgress('first_kill', 999)
    expect(aps.isCompleted('first_kill')).toBe(true)
  })
  it('成就完成后再次更新进度不崩溃', () => {
    aps.updateProgress('first_civ', 1)
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
  it('pop_500 需要进度 500', () => {
    aps.updateProgress('pop_500', 499)
    expect(aps.isCompleted('pop_500')).toBe(false)
    aps.updateProgress('pop_500', 500)
    expect(aps.isCompleted('pop_500')).toBe(true)
  })
  it('kills_50 需要进度 50', () => {
    aps.updateProgress('kills_50', 49)
    expect(aps.isCompleted('kills_50')).toBe(false)
    aps.updateProgress('kills_50', 50)
    expect(aps.isCompleted('kills_50')).toBe(true)
  })
  it('play_10k 需要进度 10000', () => {
    aps.updateProgress('play_10k', 9999)
    expect(aps.isCompleted('play_10k')).toBe(false)
    aps.updateProgress('play_10k', 10000)
    expect(aps.isCompleted('play_10k')).toBe(true)
  })
  it('成就完成后 completed 字段为 true', () => {
    aps.updateProgress('first_civ', 1)
    const a = (aps as any)._byId.get('first_civ')
    expect(a.completed).toBe(true)
  })
  it('成就完成后 completedAt 被设置', () => {
    aps.updateProgress('first_civ', 1)
    const a = (aps as any)._byId.get('first_civ')
    expect(a.completedAt).toBeGreaterThan(0)
  })
})

describe('AchievementProgressSystem.getProgress', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始进度为 0', () => { expect(aps.getProgress('pop_100')).toBe(0) })
  it('未知 id 返回 0', () => { expect(aps.getProgress('ghost_id')).toBe(0) })
  it('部分完成时返回 0~1 之间的比例', () => {
    aps.updateProgress('pop_100', 50)
    expect(aps.getProgress('pop_100')).toBeCloseTo(0.5)
  })
  it('完全完成时返回 1', () => {
    aps.updateProgress('pop_100', 100)
    expect(aps.getProgress('pop_100')).toBe(1)
  })
  it('超过目标时返回不超过 1', () => {
    aps.updateProgress('first_civ', 100)
    expect(aps.getProgress('first_civ')).toBeLessThanOrEqual(1)
  })
  it('10000 tick 成就进度可以精确计算', () => {
    aps.updateProgress('play_10k', 2500)
    expect(aps.getProgress('play_10k')).toBeCloseTo(0.25)
  })
  it('getProgress 返回值在 0~1 范围内', () => {
    aps.updateProgress('pop_100', 50)
    const p = aps.getProgress('pop_100')
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
  it('进度 0 时 getProgress 返回 0', () => {
    expect(aps.getProgress('wars_3')).toBe(0)
  })
})

describe('AchievementProgressSystem.getByCategory', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('exploration 分类有预定义成就', () => {
    const result = aps.getByCategory('exploration')
    expect(result.length).toBeGreaterThan(0)
    result.forEach((a: any) => expect(a.category).toBe('exploration'))
  })
  it('civilization 分类有预定义成就', () => {
    const result = aps.getByCategory('civilization')
    expect(result.length).toBeGreaterThan(0)
  })
  it('combat 分类有预定义成就', () => {
    expect(aps.getByCategory('combat').length).toBeGreaterThan(0)
  })
  it('nature 分类有预定义成就', () => {
    expect(aps.getByCategory('nature').length).toBeGreaterThan(0)
  })
  it('special 分类有预定义成就', () => {
    expect(aps.getByCategory('special').length).toBeGreaterThan(0)
  })
  it('未知分类返回空数组', () => {
    expect(aps.getByCategory('nonexistent')).toHaveLength(0)
  })
  it('civilization 分类包含 first_civ', () => {
    const civAch = aps.getByCategory('civilization')
    expect(civAch.some((a: any) => a.id === 'first_civ')).toBe(true)
  })
  it('combat 分类包含 first_kill', () => {
    const combatAch = aps.getByCategory('combat')
    expect(combatAch.some((a: any) => a.id === 'first_kill')).toBe(true)
  })
  it('nature 分类包含 disaster_1', () => {
    const natureAch = aps.getByCategory('nature')
    expect(natureAch.some((a: any) => a.id === 'disaster_1')).toBe(true)
  })
  it('special 分类包含 play_10k', () => {
    const specialAch = aps.getByCategory('special')
    expect(specialAch.some((a: any) => a.id === 'play_10k')).toBe(true)
  })
})

describe('AchievementProgressSystem.getCompletionRate', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始时完成率为 0', () => { expect(aps.getCompletionRate()).toBe(0) })
  it('完成若干成就后完成率 > 0', () => {
    aps.updateProgress('first_civ', 1)
    expect(aps.getCompletionRate()).toBeGreaterThan(0)
  })
  it('完成率为 completed/total 比例', () => {
    const total = (aps as any).achievements.length as number
    aps.updateProgress('first_civ', 1)
    expect(aps.getCompletionRate()).toBeCloseTo(1 / total)
  })
  it('完成率不超过 1', () => {
    ;(aps as any).achievements.forEach((a: any) => { aps.updateProgress(a.id, a.target) })
    expect(aps.getCompletionRate()).toBeLessThanOrEqual(1)
  })
  it('完成所有成就时完成率为 1', () => {
    ;(aps as any).achievements.forEach((a: any) => { aps.updateProgress(a.id, a.target) })
    expect(aps.getCompletionRate()).toBe(1)
  })
  it('完成 2 个成就后完成率增加', () => {
    aps.updateProgress('first_civ', 1)
    const r1 = aps.getCompletionRate()
    aps.updateProgress('first_kill', 1)
    expect(aps.getCompletionRate()).toBeGreaterThan(r1)
  })
})

describe('AchievementProgressSystem panel state', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始面板关闭', () => { expect(aps.isPanelOpen()).toBe(false) })
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
  })
  it('setFilter exploration 不崩溃', () => {
    expect(() => aps.setFilter('exploration')).not.toThrow()
  })
  it('setFilter civilization 不崩溃', () => {
    expect(() => aps.setFilter('civilization')).not.toThrow()
  })
  it('setFilter special 不崩溃', () => {
    expect(() => aps.setFilter('special')).not.toThrow()
  })
  it('三次 togglePanel 最终为 true', () => {
    aps.togglePanel()
    aps.togglePanel()
    aps.togglePanel()
    expect(aps.isPanelOpen()).toBe(true)
  })
})

describe('AchievementProgressSystem - progressStr/progressInfoStr', () => {
  let aps: AchievementProgressSystem
  beforeEach(() => { aps = makeAPS(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('更新进度后 progressStr 正确', () => {
    aps.updateProgress('pop_100', 50)
    const a = (aps as any)._byId.get('pop_100')
    expect(a.progressStr).toBe('50')
  })
  it('更新进度后 progressInfoStr 正确', () => {
    aps.updateProgress('pop_100', 50)
    const a = (aps as any)._byId.get('pop_100')
    expect(a.progressInfoStr).toBe('50/100 (50%)')
  })
  it('初始 progressStr 为 0', () => {
    const a = (aps as any)._byId.get('pop_100')
    expect(a.progressStr).toBe('0')
  })
  it('初始 progressInfoStr 包含 target', () => {
    const a = (aps as any)._byId.get('pop_100')
    expect(a.progressInfoStr).toContain('100')
  })
  it('_byId 包含所有预定义成就', () => {
    const ids = ['explore_10', 'first_civ', 'first_kill', 'disaster_1', 'play_10k']
    ids.forEach(id => expect((aps as any)._byId.has(id)).toBe(true))
  })
  it('总成就数大于 0', () => {
    expect((aps as any).achievements.length).toBeGreaterThan(0)
  })
  it('_completionRate 初始为 0', () => {
    expect((aps as any)._completionRate).toBe(0)
  })
})
