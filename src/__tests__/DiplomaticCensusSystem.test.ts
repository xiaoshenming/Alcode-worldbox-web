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
})
