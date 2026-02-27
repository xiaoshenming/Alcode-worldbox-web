import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAgisterSystem } from '../systems/DiplomaticAgisterSystem'
function makeSys() { return new DiplomaticAgisterSystem() }
describe('DiplomaticAgisterSystem', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, pastureCivId: 1, agisterCivId: 2, form: 'crown_agistment', pastureAllocation: 60, livestockCapacity: 50, rentalRevenue: 40, grazingQuality: 70 })
    expect(sys.getArrangements()).toHaveLength(1)
    expect(sys.getArrangements()[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray(sys.getArrangements())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
