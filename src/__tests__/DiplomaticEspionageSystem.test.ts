import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEspionageSystem } from '../systems/DiplomaticEspionageSystem'
function makeSys(): DiplomaticEspionageSystem { return new DiplomaticEspionageSystem() }
describe('DiplomaticEspionageSystem', () => {
  let sys: DiplomaticEspionageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始spies为空', () => { expect((sys as any).spies).toHaveLength(0) })
  it('注入后spies包含数据', () => {
    ;(sys as any).spies.push({ entityId: 1, fromCivId: 1, targetCivId: 2, discovered: false, missionTick: 0, mission: 'steal_tech' })
    expect((sys as any).spies).toHaveLength(1)
  })
  it('spies是数组', () => { expect(Array.isArray((sys as any).spies)).toBe(true) })
  it('reports是数组', () => { expect(Array.isArray((sys as any).reports)).toBe(true) })
  it('初始reports为空', () => { expect((sys as any).reports).toHaveLength(0) })
})
