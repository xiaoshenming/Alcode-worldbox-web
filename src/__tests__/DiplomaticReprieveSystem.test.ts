import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReprieveSystem } from '../systems/DiplomaticReprieveSystem'
function makeSys() { return new DiplomaticReprieveSystem() }
describe('DiplomaticReprieveSystem', () => {
  let sys: DiplomaticReprieveSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGrants为空', () => { expect(sys.getGrants()).toHaveLength(0) })
  it('注入后getGrants返回数据', () => {
    ;(sys as any).grants.push({ id: 1 })
    expect(sys.getGrants()).toHaveLength(1)
  })
})
