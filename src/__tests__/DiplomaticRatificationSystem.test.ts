import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRatificationSystem } from '../systems/DiplomaticRatificationSystem'
function makeSys() { return new DiplomaticRatificationSystem() }
describe('DiplomaticRatificationSystem', () => {
  let sys: DiplomaticRatificationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRatifications为空', () => { expect(sys.getRatifications()).toHaveLength(0) })
  it('注入后getRatifications返回数据', () => {
    ;(sys as any).ratifications.push({ id: 1 })
    expect(sys.getRatifications()).toHaveLength(1)
  })
  it('getRatifications返回数组', () => { expect(Array.isArray(sys.getRatifications())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
