import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDivinationSystem } from '../systems/CreatureDivinationSystem'
function makeSys(): CreatureDivinationSystem { return new CreatureDivinationSystem() }
describe('CreatureDivinationSystem', () => {
  let sys: CreatureDivinationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部divinations初始为空', () => { expect((sys as any).divinations.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureDivinationSystem) })
})
