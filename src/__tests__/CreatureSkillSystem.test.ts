import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSkillSystem } from '../systems/CreatureSkillSystem'
function makeSys() { return new CreatureSkillSystem() }
describe('CreatureSkillSystem', () => {
  let sys: CreatureSkillSystem
  beforeEach(() => { sys = makeSys() })
  it('getLevel未知实体返回0', () => { expect(sys.getLevel(999)).toBe(0) })
  it('getSkillData未知实体返回undefined', () => { expect(sys.getSkillData(999)).toBeUndefined() })
  it('addXP 后 getLevel 增加', () => {
    sys.addXP(1, 1000, 'combat' as any)
    expect(sys.getLevel(1)).toBeGreaterThan(0)
  })
  it('addXP 后 getSkillData 返回数据', () => {
    sys.addXP(1, 10, 'combat' as any)
    expect(sys.getSkillData(1)).toBeDefined()
  })
  it('hasSkill 未解锁技能返回false', () => {
    expect(sys.hasSkill(999, 'some_skill')).toBe(false)
  })
})
