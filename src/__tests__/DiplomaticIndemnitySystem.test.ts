import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticIndemnitySystem } from '../systems/DiplomaticIndemnitySystem'
function makeSys() { return new DiplomaticIndemnitySystem() }
describe('DiplomaticIndemnitySystem', () => {
  let sys: DiplomaticIndemnitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
