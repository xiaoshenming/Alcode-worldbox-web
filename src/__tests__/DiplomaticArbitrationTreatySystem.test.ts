import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitrationTreatySystem } from '../systems/DiplomaticArbitrationTreatySystem'
function makeSys() { return new DiplomaticArbitrationTreatySystem() }
describe('DiplomaticArbitrationTreatySystem', () => {
  let sys: DiplomaticArbitrationTreatySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect((sys as any).treaties).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1, signatory1CivId: 1, signatory2CivId: 2, scope: 'trade', bindingStrength: 80, disputesResolved: 5, compliance: 70, duration: 100 })
    expect((sys as any).treaties).toHaveLength(1)
    expect((sys as any).treaties[0].id).toBe(1)
  })
  it('getTreaties返回数组', () => { expect(Array.isArray((sys as any).treaties)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
