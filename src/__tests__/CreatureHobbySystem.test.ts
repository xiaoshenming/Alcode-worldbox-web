import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHobbySystem } from '../systems/CreatureHobbySystem'
function makeSys(): CreatureHobbySystem { return new CreatureHobbySystem() }
describe('CreatureHobbySystem', () => {
  let sys: CreatureHobbySystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部hobbies初始为空', () => { expect((sys as any).hobbies.size).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureHobbySystem) })
})
