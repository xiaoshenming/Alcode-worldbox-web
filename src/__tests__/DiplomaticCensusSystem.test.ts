import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCensusSystem } from '../systems/DiplomaticCensusSystem'
function makeSys() { return new DiplomaticCensusSystem() }
describe('DiplomaticCensusSystem', () => {
  let sys: DiplomaticCensusSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRecords为空', () => { expect(sys.getRecords()).toHaveLength(0) })
  it('注入后getRecords返回数据', () => {
    ;(sys as any).records.push({ id: 1 })
    expect(sys.getRecords()).toHaveLength(1)
  })
  it('getRecords返回数组', () => { expect(Array.isArray(sys.getRecords())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
