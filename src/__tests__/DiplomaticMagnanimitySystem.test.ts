import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMagnanimitySystem } from '../systems/DiplomaticMagnanimitySystem'
function makeSys() { return new DiplomaticMagnanimitySystem() }
describe('DiplomaticMagnanimitySystem', () => {
  let sys: DiplomaticMagnanimitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getGestures为空', () => { expect(sys.getGestures()).toHaveLength(0) })
  it('注入后getGestures返回数据', () => {
    ;(sys as any).gestures.push({ id: 1 })
    expect(sys.getGestures()).toHaveLength(1)
  })
  it('getGestures返回数组', () => { expect(Array.isArray(sys.getGestures())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
