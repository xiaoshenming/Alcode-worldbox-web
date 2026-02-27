import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBeaconwardSystem } from '../systems/DiplomaticBeaconwardSystem'
function makeSys() { return new DiplomaticBeaconwardSystem() }
describe('DiplomaticBeaconwardSystem', () => {
  let sys: DiplomaticBeaconwardSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, enforcingCivId: 1, subjectCivId: 2, form: 'royal_beaconward', signalAuthority: 80, beaconMaintenance: 70, communicationReach: 60, warningEfficiency: 75 })
    expect(sys.getArrangements()).toHaveLength(1)
    expect(sys.getArrangements()[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray(sys.getArrangements())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
