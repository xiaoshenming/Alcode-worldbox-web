import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureIntuitionSystem } from '../systems/CreatureIntuitionSystem'
function makeSys(): CreatureIntuitionSystem { return new CreatureIntuitionSystem() }
describe('CreatureIntuitionSystem', () => {
  let sys: CreatureIntuitionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部intuitions初始为空', () => { expect((sys as any).intuitions.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureIntuitionSystem) })
})
