import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLanguageSystem } from '../systems/CreatureLanguageSystem'
function makeSys(): CreatureLanguageSystem { return new CreatureLanguageSystem() }
describe('CreatureLanguageSystem', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部languages初始为空', () => { expect((sys as any).languages.size).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureLanguageSystem) })
})
