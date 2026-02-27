import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitration2System } from '../systems/DiplomaticArbitration2System'
function makeSys() { return new DiplomaticArbitration2System() }
describe('DiplomaticArbitration2System', () => {
  let sys: DiplomaticArbitration2System
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect(sys.getCases()).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1 })
    expect(sys.getCases()).toHaveLength(1)
  })
})
