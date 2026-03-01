import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitration2System } from '../systems/DiplomaticArbitration2System'
function makeSys() { return new DiplomaticArbitration2System() }
describe('DiplomaticArbitration2System', () => {
  let sys: DiplomaticArbitration2System
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect((sys as any).cases).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1, civIdA: 1, civIdB: 2, form: 'binding_arbitration', evidenceStrength: 80, arbitratorImpartiality: 70, complianceRate: 60, rulingFairness: 75 })
    expect((sys as any).cases).toHaveLength(1)
    expect((sys as any).cases[0].id).toBe(1)
  })
  it('getCases返回数组', () => { expect(Array.isArray((sys as any).cases)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
