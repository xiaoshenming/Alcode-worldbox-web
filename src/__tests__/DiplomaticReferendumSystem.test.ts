import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReferendumSystem } from '../systems/DiplomaticReferendumSystem'
function makeSys() { return new DiplomaticReferendumSystem() }
describe('DiplomaticReferendumSystem', () => {
  let sys: DiplomaticReferendumSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getReferendums为空', () => { expect(sys.getReferendums()).toHaveLength(0) })
  it('注入后getReferendums返回数据', () => {
    ;(sys as any).referendums.push({ id: 1 })
    expect(sys.getReferendums()).toHaveLength(1)
  })
})
