import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFlangingSystem } from '../systems/CreatureFlangingSystem'
function makeSys(): CreatureFlangingSystem { return new CreatureFlangingSystem() }
describe('CreatureFlangingSystem', () => {
  let sys: CreatureFlangingSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部workers初始为空', () => { expect((sys as any).workers.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureFlangingSystem) })
})
