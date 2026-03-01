import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePetSystem } from '../systems/CreaturePetSystem'
function makeSys(): CreaturePetSystem { return new CreaturePetSystem() }
describe('CreaturePetSystem', () => {
  let sys: CreaturePetSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部pets初始为空', () => { expect((sys as any).pets.size).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreaturePetSystem) })
})
