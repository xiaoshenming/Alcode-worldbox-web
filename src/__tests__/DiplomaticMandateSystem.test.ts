import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMandateSystem } from '../systems/DiplomaticMandateSystem'
function makeSys() { return new DiplomaticMandateSystem() }
describe('DiplomaticMandateSystem', () => {
  let sys: DiplomaticMandateSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
