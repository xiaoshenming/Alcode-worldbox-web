import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAcquittalSystem } from '../systems/DiplomaticAcquittalSystem'
function makeSys() { return new DiplomaticAcquittalSystem() }
describe('DiplomaticAcquittalSystem', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getVerdicts为空', () => { expect(sys.getVerdicts()).toHaveLength(0) })
  it('注入后getVerdicts返回数据', () => {
    ;(sys as any).verdicts.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_crime_clearing', evidenceStrength: 80, legitimacy: 70, relationRepair: 50, precedentValue: 40 })
    expect(sys.getVerdicts()).toHaveLength(1)
    expect(sys.getVerdicts()[0].id).toBe(1)
  })
  it('getVerdicts返回数组', () => { expect(Array.isArray(sys.getVerdicts())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
