import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRestitutionSystem } from '../systems/DiplomaticRestitutionSystem'
function makeSys() { return new DiplomaticRestitutionSystem() }
describe('DiplomaticRestitutionSystem', () => {
  let sys: DiplomaticRestitutionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('getAgreements返回数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
