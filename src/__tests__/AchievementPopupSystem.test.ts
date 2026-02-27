import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementPopupSystem } from '../systems/AchievementPopupSystem'
function makeSys() { return new AchievementPopupSystem() }
describe('AchievementPopupSystem', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  it('getUnlockedCount初始为0', () => { expect(sys.getUnlockedCount()).toBe(0) })
  it('getTotalCount初始为0', () => { expect(sys.getTotalCount()).toBe(0) })
})
