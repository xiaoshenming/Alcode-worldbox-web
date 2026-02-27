import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticNonAggressionSystem } from '../systems/DiplomaticNonAggressionSystem'
function makeSys() { return new DiplomaticNonAggressionSystem() }
describe('DiplomaticNonAggressionSystem', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPacts为空', () => { expect(sys.getPacts()).toHaveLength(0) })
  it('注入后getPacts返回数据', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect(sys.getPacts()).toHaveLength(1)
  })
  it('getPacts返回数组', () => { expect(Array.isArray(sys.getPacts())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
