import { describe, it, expect, beforeEach } from 'vitest'
import { LegendaryBattleSystem } from '../systems/LegendaryBattleSystem'
function makeSys() { return new LegendaryBattleSystem() }
describe('LegendaryBattleSystem', () => {
  let sys: LegendaryBattleSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveBattles初始为空', () => { expect(sys.getActiveBattles()).toHaveLength(0) })
  it('getBattleAt无战斗时返回null', () => { expect(sys.getBattleAt(0, 0, 5)).toBeNull() })
})
