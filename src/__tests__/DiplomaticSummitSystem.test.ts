import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSummitSystem } from '../systems/DiplomaticSummitSystem'
function makeSys() { return new DiplomaticSummitSystem() }
describe('DiplomaticSummitSystem', () => {
  let sys: DiplomaticSummitSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActiveSummit为null', () => { expect(sys.getActiveSummit()).toBeNull() })
  it('初始getSummitHistory为空', () => { expect(sys.getSummitHistory()).toHaveLength(0) })
  it('注入activeSummit后getActiveSummit返回数据', () => {
    ;(sys as any).activeSummit = { id: 1 }
    expect(sys.getActiveSummit()).not.toBeNull()
  })
})
