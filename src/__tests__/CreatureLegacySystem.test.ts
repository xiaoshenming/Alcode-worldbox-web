import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLegacySystem } from '../systems/CreatureLegacySystem'
function makeSys(): CreatureLegacySystem { return new CreatureLegacySystem() }
describe('CreatureLegacySystem', () => {
  let sys: CreatureLegacySystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部legacies初始为空', () => { expect((sys as any).legacies.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureLegacySystem) })
})
