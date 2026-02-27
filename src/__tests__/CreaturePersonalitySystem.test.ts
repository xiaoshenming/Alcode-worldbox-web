import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePersonalitySystem } from '../systems/CreaturePersonalitySystem'
function makeSys() { return new CreaturePersonalitySystem() }
describe('CreaturePersonalitySystem', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })
  it('getTrait未知实体返回0', () => { expect(sys.getTrait(999, 'bravery')).toBe(0) })
  it('getDecisionBias未知实体返回0', () => { expect(sys.getDecisionBias(999, 'fight')).toBe(0) })
})
