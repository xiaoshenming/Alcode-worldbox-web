import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureApprenticeSystem } from '../systems/CreatureApprenticeSystem'
function makeSys(): CreatureApprenticeSystem { return new CreatureApprenticeSystem() }
describe('CreatureApprenticeSystem', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部apprenticeships初始为空', () => { expect((sys as any).apprenticeships.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureApprenticeSystem) })
})
