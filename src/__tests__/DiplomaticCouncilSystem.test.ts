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
})
