import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAsylumSystem } from '../systems/DiplomaticAsylumSystem'
function makeSys() { return new DiplomaticAsylumSystem() }
describe('DiplomaticAsylumSystem', () => {
  let sys: DiplomaticAsylumSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRequests为空', () => { expect(sys.getRequests()).toHaveLength(0) })
  it('注入后getRequests返回数据', () => {
    ;(sys as any).requests.push({ id: 1, seekerCivId: 1, hostCivId: 2, refugeeCount: 50, reason: 'persecution', approval: 70, diplomaticImpact: 30, tick: 0 })
    expect(sys.getRequests()).toHaveLength(1)
    expect(sys.getRequests()[0].id).toBe(1)
  })
  it('getRequests返回数组', () => { expect(Array.isArray(sys.getRequests())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
