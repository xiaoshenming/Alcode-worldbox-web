import { describe, it, expect, beforeEach } from 'vitest'
import { PowerFavoriteSystem } from '../systems/PowerFavoriteSystem'
function makeSys() { return new PowerFavoriteSystem() }
describe('PowerFavoriteSystem', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  it('getSelectedPower初始为null', () => { expect(sys.getSelectedPower()).toBeNull() })
  it('addFavorite 后 getSelectedPower 仍为null（未选中）', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    expect(sys.getSelectedPower()).toBeNull()
  })
  it('removeFavorite 不存在的槽位不崩溃', () => {
    expect(() => sys.removeFavorite(0)).not.toThrow()
  })
  it('addFavorite 超出范围的槽位不崩溃', () => {
    expect(() => sys.addFavorite(99, 'fire', 'Fire', '#ff0000')).not.toThrow()
  })
  it('selectedIndex初始为-1', () => { expect((sys as any).selectedIndex).toBe(-1) })
})
