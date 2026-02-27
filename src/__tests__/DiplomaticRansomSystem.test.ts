import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRansomSystem } from '../systems/DiplomaticRansomSystem'
function makeSys() { return new DiplomaticRansomSystem() }
describe('DiplomaticRansomSystem', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getNegotiations为空', () => { expect(sys.getNegotiations()).toHaveLength(0) })
  it('注入后getNegotiations返回数据', () => {
    ;(sys as any).negotiations.push({ id: 1 })
    expect(sys.getNegotiations()).toHaveLength(1)
  })
})
