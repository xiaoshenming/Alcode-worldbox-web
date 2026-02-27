import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCouncilSystem } from '../systems/DiplomaticCouncilSystem'
function makeSys() { return new DiplomaticCouncilSystem() }
describe('DiplomaticCouncilSystem', () => {
  let sys: DiplomaticCouncilSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCouncils为空', () => { expect(sys.getCouncils()).toHaveLength(0) })
  it('注入后getCouncils返回数据', () => {
    ;(sys as any).councils.push({ id: 1 })
    expect(sys.getCouncils()).toHaveLength(1)
  })
  it('getCouncils返回数组', () => { expect(Array.isArray(sys.getCouncils())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
