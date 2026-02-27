import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePersonalitySystem } from '../systems/CreaturePersonalitySystem'
function makeSys() { return new CreaturePersonalitySystem() }
describe('CreaturePersonalitySystem', () => {
  let sys: CreaturePersonalitySystem
  beforeEach(() => { sys = makeSys() })
  it('getTrait未知实体返回0', () => { expect(sys.getTrait(999, 'bravery')).toBe(0) })
  it('getDecisionBias未知实体返回0', () => { expect(sys.getDecisionBias(999, 'fight')).toBe(0) })
  it('注入personality后getTrait返回值', () => {
    ;(sys as any).personalities.set(1, {
      entityId: 1,
      traits: { bravery: 0.8, kindness: 0.5, diligence: 0.5, curiosity: 0.5, loyalty: 0.5 }
    })
    expect(sys.getTrait(1, 'bravery')).toBe(0.8)
  })
  it('setSelectedEntity 不崩溃', () => {
    expect(() => sys.setSelectedEntity(1)).not.toThrow()
  })
  it('visible初始为false', () => { expect((sys as any).visible).toBe(false) })
})
