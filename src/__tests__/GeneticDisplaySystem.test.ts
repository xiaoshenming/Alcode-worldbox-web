import { describe, it, expect, beforeEach } from 'vitest'
import { GeneticDisplaySystem } from '../systems/GeneticDisplaySystem'
function makeSys() { return new GeneticDisplaySystem() }
describe('GeneticDisplaySystem', () => {
  let sys: GeneticDisplaySystem
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
})
