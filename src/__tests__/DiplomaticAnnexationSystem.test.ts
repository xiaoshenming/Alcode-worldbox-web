import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAnnexationSystem } from '../systems/DiplomaticAnnexationSystem'
function makeSys() { return new DiplomaticAnnexationSystem() }
describe('DiplomaticAnnexationSystem', () => {
  let sys: DiplomaticAnnexationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect(sys.getTreaties()).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1, annexerCivId: 1, targetCivId: 2, annexationType: 'peaceful', territorySize: 100, territoryTransferred: 50, legitimacy: 70, resistance: 20 })
    expect(sys.getTreaties()).toHaveLength(1)
    expect(sys.getTreaties()[0].id).toBe(1)
  })
  it('getTreaties返回数组', () => { expect(Array.isArray(sys.getTreaties())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
