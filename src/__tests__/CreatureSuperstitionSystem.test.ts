import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSuperstitionSystem } from '../systems/CreatureSuperstitionSystem'
function makeSys(): CreatureSuperstitionSystem { return new CreatureSuperstitionSystem() }
describe('CreatureSuperstitionSystem', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部superstitions初始为空', () => { expect((sys as any).superstitions.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureSuperstitionSystem) })
})
