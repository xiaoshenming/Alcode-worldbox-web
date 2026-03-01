import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCollectionSystem } from '../systems/CreatureCollectionSystem'
function makeSys(): CreatureCollectionSystem { return new CreatureCollectionSystem() }
describe('CreatureCollectionSystem', () => {
  let sys: CreatureCollectionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureCollectionSystem) })
})
