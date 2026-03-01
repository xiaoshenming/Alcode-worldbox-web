import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwagingSystem } from '../systems/CreatureSwagingSystem'
function makeSys(): CreatureSwagingSystem { return new CreatureSwagingSystem() }
describe('CreatureSwagingSystem', () => {
  let sys: CreatureSwagingSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部workers初始为空', () => { expect((sys as any).workers.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureSwagingSystem) })
})
