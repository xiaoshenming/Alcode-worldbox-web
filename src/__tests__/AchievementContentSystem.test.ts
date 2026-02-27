import { describe, it, expect, beforeEach } from 'vitest'
import { AchievementContentSystem } from '../systems/AchievementContentSystem'
function makeSys() { return new AchievementContentSystem() }
describe('AchievementContentSystem', () => {
  let sys: AchievementContentSystem
  beforeEach(() => { sys = makeSys() })
  it('getAll返回所有成就', () => { expect(sys.getAll()).toBeInstanceOf(Array) })
  it('getUnlocked初始为空', () => { expect(sys.getUnlocked()).toHaveLength(0) })
  it('getById未知id返回undefined', () => { expect(sys.getById('nonexistent')).toBeUndefined() })
  it('getProgress未知id返回unlocked=false', () => { expect(sys.getProgress('no_such_id').unlocked).toBe(false) })
  it('getAll返回非空数组（定义了成就）', () => { expect(sys.getAll().length).toBeGreaterThan(0) })
})
