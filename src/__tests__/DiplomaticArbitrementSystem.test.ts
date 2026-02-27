import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitrementSystem } from '../systems/DiplomaticArbitrementSystem'
function makeSys() { return new DiplomaticArbitrementSystem() }
describe('DiplomaticArbitrementSystem', () => {
  let sys: DiplomaticArbitrementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect(sys.getCases()).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1 })
    expect(sys.getCases()).toHaveLength(1)
  })
})
