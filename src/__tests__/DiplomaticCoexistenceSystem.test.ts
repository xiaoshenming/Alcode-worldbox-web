import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCoexistenceSystem } from '../systems/DiplomaticCoexistenceSystem'
function makeSys() { return new DiplomaticCoexistenceSystem() }
describe('DiplomaticCoexistenceSystem', () => {
  let sys: DiplomaticCoexistenceSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
