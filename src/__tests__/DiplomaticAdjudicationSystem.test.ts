import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAdjudicationSystem } from '../systems/DiplomaticAdjudicationSystem'
function makeSys() { return new DiplomaticAdjudicationSystem() }
describe('DiplomaticAdjudicationSystem', () => {
  let sys: DiplomaticAdjudicationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect(sys.getCases()).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1, plaintiffCivId: 1, defendantCivId: 2, verdict: 'pending', evidenceStrength: 60, legalPrecedent: 50, publicOpinion: 55, hearingProgress: 0 })
    expect(sys.getCases()).toHaveLength(1)
    expect(sys.getCases()[0].id).toBe(1)
  })
  it('getCases返回数组', () => { expect(Array.isArray(sys.getCases())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
