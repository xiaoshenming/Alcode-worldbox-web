import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticFederationSystem } from '../systems/DiplomaticFederationSystem'
function makeSys() { return new DiplomaticFederationSystem() }
describe('DiplomaticFederationSystem', () => {
  let sys: DiplomaticFederationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
