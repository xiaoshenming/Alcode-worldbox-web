import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementPopupSystem } from '../systems/AchievementPopupSystem'
import type { AchievementDef } from '../systems/AchievementPopupSystem'

function makeSys() { return new AchievementPopupSystem() }
function makeAch(id = 'test_ach'): AchievementDef {
  return { id, name: 'Test', description: 'test', icon: '⭐', rarity: 'common', category: 'explore', maxProgress: 1 }
}

describe('AchievementPopupSystem', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  it('getUnlockedCount初始为0', () => { expect(sys.getUnlockedCount()).toBe(0) })
  it('getTotalCount初始为0（未注册任何成就）', () => { expect((sys as any).achievements.size).toBe(0) })
  it('registerAchievement 后 getTotalCount 增加', () => {
    sys.registerAchievement(makeAch())
    expect((sys as any).achievements.size).toBe(1)
  })
  it('isUnlocked 未解锁成就返回false', () => {
    sys.registerAchievement(makeAch())
    expect(sys.isUnlocked('test_ach')).toBe(false)
  })
  it('unlock 后 isUnlocked 返回true', () => {
    sys.registerAchievement(makeAch())
    sys.unlock('test_ach', 1)
    expect(sys.isUnlocked('test_ach')).toBe(true)
  })
  it('unlock 后 getUnlockedCount 增加', () => {
    sys.registerAchievement(makeAch())
    sys.unlock('test_ach', 1)
    expect(sys.getUnlockedCount()).toBe(1)
  })
  it('重复unlock同一成就不会重复计数', () => {
    sys.registerAchievement(makeAch())
    sys.unlock('test_ach', 1)
    sys.unlock('test_ach', 2)
    expect(sys.getUnlockedCount()).toBe(1)
  })
})
