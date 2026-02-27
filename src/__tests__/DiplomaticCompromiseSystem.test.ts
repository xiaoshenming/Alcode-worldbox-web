import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCompromiseSystem } from '../systems/DiplomaticCompromiseSystem'
function makeSys() { return new DiplomaticCompromiseSystem() }
describe('DiplomaticCompromiseSystem', () => {
  let sys: DiplomaticCompromiseSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAgreements为空', () => { expect(sys.getAgreements()).toHaveLength(0) })
  it('注入后getAgreements返回数据', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect(sys.getAgreements()).toHaveLength(1)
  })
})
