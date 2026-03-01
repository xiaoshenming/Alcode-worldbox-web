import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticLenitySystem } from '../systems/DiplomaticLenitySystem'
function makeSys() { return new DiplomaticLenitySystem() }
describe('DiplomaticLenitySystem', () => {
  let sys: DiplomaticLenitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPolicies为空', () => { expect((sys as any).policies).toHaveLength(0) })
  it('注入后getPolicies返回数据', () => {
    ;(sys as any).policies.push({ id: 1 })
    expect((sys as any).policies).toHaveLength(1)
  })
  it('getPolicies返回数组', () => { expect(Array.isArray((sys as any).policies)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
