import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTradeSkillSystem } from '../systems/CreatureTradeSkillSystem'
function makeSys(): CreatureTradeSkillSystem { return new CreatureTradeSkillSystem() }
describe('CreatureTradeSkillSystem', () => {
  let sys: CreatureTradeSkillSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部traders初始为空', () => { expect((sys as any).traders.size).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureTradeSkillSystem) })
})
