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
})
