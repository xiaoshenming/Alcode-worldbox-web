import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSkillSystem } from '../systems/CreatureSkillSystem'
function makeSys() { return new CreatureSkillSystem() }
describe('CreatureSkillSystem', () => {
  let sys: CreatureSkillSystem
  beforeEach(() => { sys = makeSys() })
  it('getLevel未知实体返回0', () => { expect(sys.getLevel(999)).toBe(0) })
  it('getSkillData未知实体返回undefined', () => { expect(sys.getSkillData(999)).toBeUndefined() })
})
