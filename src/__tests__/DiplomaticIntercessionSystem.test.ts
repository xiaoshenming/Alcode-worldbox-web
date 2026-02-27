import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticIntercessionSystem } from '../systems/DiplomaticIntercessionSystem'
function makeSys() { return new DiplomaticIntercessionSystem() }
describe('DiplomaticIntercessionSystem', () => {
  let sys: DiplomaticIntercessionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActions为空', () => { expect(sys.getActions()).toHaveLength(0) })
  it('注入后getActions返回数据', () => {
    ;(sys as any).actions.push({ id: 1 })
    expect(sys.getActions()).toHaveLength(1)
  })
  it('getActions返回数组', () => { expect(Array.isArray(sys.getActions())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
