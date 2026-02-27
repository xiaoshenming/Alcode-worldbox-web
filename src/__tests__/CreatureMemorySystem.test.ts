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
})
