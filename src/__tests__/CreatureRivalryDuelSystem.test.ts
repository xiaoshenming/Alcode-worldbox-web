import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivalryDuelSystem } from '../systems/CreatureRivalryDuelSystem'
function makeSys(): CreatureRivalryDuelSystem { return new CreatureRivalryDuelSystem() }
describe('CreatureRivalryDuelSystem', () => {
  let sys: CreatureRivalryDuelSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部activeDuels初始为空', () => { expect((sys as any).activeDuels.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureRivalryDuelSystem) })
})
