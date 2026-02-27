import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticClemencySystem } from '../systems/DiplomaticClemencySystem'
function makeSys() { return new DiplomaticClemencySystem() }
describe('DiplomaticClemencySystem', () => {
  let sys: DiplomaticClemencySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActs为空', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后getActs返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect(sys.getActs()).toHaveLength(1)
  })
  it('getActs返回数组', () => { expect(Array.isArray(sys.getActs())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
