import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRestitutionSystem } from '../systems/DiplomaticRestitutionSystem'
function makeSys() { return new DiplomaticRestitutionSystem() }
describe('DiplomaticRestitutionSystem', () => {
  let sys: DiplomaticRestitutionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
