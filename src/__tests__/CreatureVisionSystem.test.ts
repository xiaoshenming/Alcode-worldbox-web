import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
function makeSys(): CreatureVisionSystem { return new CreatureVisionSystem() }
describe('CreatureVisionSystem', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部_allVisionBuf初始为空', () => { expect((sys as any)._allVisionBuf.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureVisionSystem) })
})
