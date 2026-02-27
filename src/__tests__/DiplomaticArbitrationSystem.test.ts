import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitrationSystem } from '../systems/DiplomaticArbitrationSystem'
function makeSys() { return new DiplomaticArbitrationSystem() }
describe('DiplomaticArbitrationSystem', () => {
  let sys: DiplomaticArbitrationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect(sys.getCases()).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1, civIdA: 1, civIdB: 2, arbitrationType: 'territorial', fairnessRating: 70, bindingStrength: 60, complianceRate: 80, disputeResolution: 50 })
    expect(sys.getCases()).toHaveLength(1)
    expect(sys.getCases()[0].id).toBe(1)
  })
  it('getCases返回数组', () => { expect(Array.isArray(sys.getCases())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
