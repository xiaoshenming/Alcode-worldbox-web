import { describe, it, expect, beforeEach } from 'vitest'
import { SiegeWarfareSystem } from '../systems/SiegeWarfareSystem'
function makeSys() { return new SiegeWarfareSystem() }
describe('SiegeWarfareSystem', () => {
  let sys: SiegeWarfareSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveSieges初始为空', () => { expect(sys.getActiveSieges()).toHaveLength(0) })
  it('getSiegeAt无围攻时返回undefined', () => { expect(sys.getSiegeAt(0, 0)).toBeUndefined() })
  it('startSiege 创建围攻记录', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    expect(siege).toBeDefined()
    expect(siege.attackerCivId).toBe(1)
    expect(siege.defenderCivId).toBe(2)
  })
  it('startSiege 后 getActiveSieges 增加', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    expect(sys.getActiveSieges()).toHaveLength(1)
  })
  it('getSiegeAt 找到对应坐标的围攻', () => {
    sys.startSiege(1, 2, 10, 10, 50)
    const siege = sys.getSiegeAt(10, 10)
    expect(siege).toBeDefined()
  })
  it('addSiegeWeapon 已有围攻时返回true', () => {
    const siege = sys.startSiege(1, 2, 10, 10, 50)
    const result = sys.addSiegeWeapon(siege.id, 'catapult')
    expect(result).toBe(true)
  })
})
