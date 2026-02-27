import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticDispensationSystem } from '../systems/DiplomaticDispensationSystem'
function makeSys() { return new DiplomaticDispensationSystem() }
describe('DiplomaticDispensationSystem', () => {
  let sys: DiplomaticDispensationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGrants为空', () => { expect(sys.getGrants()).toHaveLength(0) })
  it('注入后getGrants返回数据', () => {
    ;(sys as any).grants.push({ id: 1 })
    expect(sys.getGrants()).toHaveLength(1)
  })
})
