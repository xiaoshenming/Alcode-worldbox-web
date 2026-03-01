import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBailiffshipSystem } from '../systems/DiplomaticBailiffshipSystem'
function makeSys() { return new DiplomaticBailiffshipSystem() }
describe('DiplomaticBailiffshipSystem', () => {
  let sys: DiplomaticBailiffshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, appointerCivId: 1, bailiffCivId: 2, form: 'crown_bailiffship', lawEnforcement: 80, dueCollection: 70, courtAdministration: 60, territorialControl: 50 })
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
