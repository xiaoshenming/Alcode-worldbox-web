import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePremonitionSystem } from '../systems/CreaturePremonitionSystem'
function makeSys(): CreaturePremonitionSystem { return new CreaturePremonitionSystem() }
describe('CreaturePremonitionSystem', () => {
  let sys: CreaturePremonitionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部visions初始为空', () => { expect((sys as any).visions.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreaturePremonitionSystem) })
})
