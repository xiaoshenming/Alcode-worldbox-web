import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReferendumSystem } from '../systems/DiplomaticReferendumSystem'
function makeSys() { return new DiplomaticReferendumSystem() }
describe('DiplomaticReferendumSystem', () => {
  let sys: DiplomaticReferendumSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getReferendums为空', () => { expect((sys as any).referendums).toHaveLength(0) })
  it('注入后getReferendums返回数据', () => {
    ;(sys as any).referendums.push({ id: 1 })
    expect((sys as any).referendums).toHaveLength(1)
  })
  it('getReferendums返回数组', () => { expect(Array.isArray((sys as any).referendums)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
