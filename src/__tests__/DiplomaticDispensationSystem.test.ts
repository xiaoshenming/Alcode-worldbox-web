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
  it('getGrants返回数组', () => { expect(Array.isArray(sys.getGrants())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
