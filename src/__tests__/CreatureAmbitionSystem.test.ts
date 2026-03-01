import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'
function makeSys(): CreatureAmbitionSystem { return new CreatureAmbitionSystem() }
describe('CreatureAmbitionSystem', () => {
  let sys: CreatureAmbitionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部ambitions初始为空', () => { expect((sys as any).ambitions.size).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureAmbitionSystem) })
})
