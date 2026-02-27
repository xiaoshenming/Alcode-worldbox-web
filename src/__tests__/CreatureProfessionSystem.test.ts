import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureProfessionSystem } from '../systems/CreatureProfessionSystem'
function makeSys() { return new CreatureProfessionSystem() }
describe('CreatureProfessionSystem', () => {
  let sys: CreatureProfessionSystem
  beforeEach(() => { sys = makeSys() })
  it('getProfession未知实体返回undefined', () => { expect(sys.getProfession(999)).toBeUndefined() })
  it('注入后getProfession返回数据', () => {
    ;(sys as any).professions.set(1, { entityId: 1, type: 'farmer', level: 1, xp: 0 })
    expect(sys.getProfession(1)).toBeDefined()
  })
  it('getBonus 未知实体返回0', () => {
    const bonus = sys.getBonus(999)
    expect(typeof bonus).toBe('object')
  })
  it('setSelectedEntity 不崩溃', () => {
    expect(() => sys.setSelectedEntity(1)).not.toThrow()
  })
})
