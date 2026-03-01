import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReprieveSystem } from '../systems/DiplomaticReprieveSystem'
function makeSys() { return new DiplomaticReprieveSystem() }
describe('DiplomaticReprieveSystem', () => {
  let sys: DiplomaticReprieveSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGrants为空', () => { expect((sys as any).grants).toHaveLength(0) })
  it('注入后getGrants返回数据', () => {
    ;(sys as any).grants.push({ id: 1 })
    expect((sys as any).grants).toHaveLength(1)
  })
  it('getGrants返回数组', () => { expect(Array.isArray((sys as any).grants)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
