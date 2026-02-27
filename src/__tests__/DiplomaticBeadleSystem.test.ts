import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBeadleSystem } from '../systems/DiplomaticBeadleSystem'
function makeSys() { return new DiplomaticBeadleSystem() }
describe('DiplomaticBeadleSystem', () => {
  let sys: DiplomaticBeadleSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, parishCivId: 1, wardenCivId: 2, form: 'royal_beadle', parishAuthority: 70, orderKeeping: 80, almsDistribution: 60, ceremonialRole: 50 })
    expect(sys.getArrangements()).toHaveLength(1)
    expect(sys.getArrangements()[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray(sys.getArrangements())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
