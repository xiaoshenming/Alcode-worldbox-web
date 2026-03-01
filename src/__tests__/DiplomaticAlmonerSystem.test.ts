import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAlmonerSystem } from '../systems/DiplomaticAlmonerSystem'
function makeSys() { return new DiplomaticAlmonerSystem() }
describe('DiplomaticAlmonerSystem', () => {
  let sys: DiplomaticAlmonerSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, patronCivId: 1, almonerCivId: 2, form: 'royal_almoner', charityDistribution: 70, poorRelief: 60, hospitalManagement: 50, almsCollection: 40 })
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
