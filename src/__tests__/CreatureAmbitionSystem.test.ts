import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'
function makeSys(): CreatureAmbitionSystem { return new CreatureAmbitionSystem() }
describe('CreatureAmbitionSystem', () => {
  let sys: CreatureAmbitionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始ambitions为空', () => {
    expect((sys as any).ambitions.size).toBe(0)
  })
  it('初始fulfilledCount为0', () => {
    expect((sys as any).fulfilledCount).toBe(0)
  })
  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    expect(() => sys.update(1, mockEM as any, 0)).not.toThrow()
  })
  it('ambitions是Map类型', () => {
    expect((sys as any).ambitions).toBeInstanceOf(Map)
  })
  it('fulfilledCount是数字', () => {
    expect(typeof (sys as any).fulfilledCount).toBe('number')
  })
})
