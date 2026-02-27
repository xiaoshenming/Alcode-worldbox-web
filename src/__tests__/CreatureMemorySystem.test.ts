import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMemorySystem } from '../systems/CreatureMemorySystem'
function makeSys() { return new CreatureMemorySystem() }
describe('CreatureMemorySystem', () => {
  let sys: CreatureMemorySystem
  beforeEach(() => { sys = makeSys() })
  it('getMemories未知实体返回空数组', () => { expect(sys.getMemories(999)).toHaveLength(0) })
  it('注入后getMemories返回数据', () => {
    ;(sys as any).banks.set(1, { entityId: 1, memories: [{ type: 'combat', tick: 0, data: {} }] })
    expect(sys.getMemories(1)).toHaveLength(1)
  })
  it('addLocationMemory 后 getMemories 返回记忆', () => {
    sys.addLocationMemory(1, 'food' as any, 10, 20, 0, 'food spot')
    expect(sys.getMemories(1).length).toBeGreaterThan(0)
  })
  it('addEventMemory 后 getMemories 返回记忆', () => {
    sys.addEventMemory(1, 'danger' as any, 10, 20, 0, 'saw danger')
    expect(sys.getMemories(1).length).toBeGreaterThan(0)
  })
  it('recallCreature 未认识的生物返回null', () => {
    expect(sys.recallCreature(1, 999)).toBeNull()
  })
})
