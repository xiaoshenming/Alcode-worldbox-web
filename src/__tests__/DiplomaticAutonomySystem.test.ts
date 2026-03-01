import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAutonomySystem } from '../systems/DiplomaticAutonomySystem'
function makeSys() { return new DiplomaticAutonomySystem() }
describe('DiplomaticAutonomySystem', () => {
  let sys: DiplomaticAutonomySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1, grantorCivId: 1, autonomousCivId: 2, form: 'administrative_autonomy', selfGovLevel: 70, complianceRate: 80, freedomIndex: 60, stabilityFactor: 75 })
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(1)
  })
  it('getAgreements返回数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
