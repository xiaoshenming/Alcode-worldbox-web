import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
function makeSys(): CreatureVisionSystem { return new CreatureVisionSystem() }
describe('CreatureVisionSystem', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureVisionSystem) })
})
