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
  it('getNegotiations返回数组', () => { expect(Array.isArray(sys.getNegotiations())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
