import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNightWatchSystem } from '../systems/CreatureNightWatchSystem'
function makeSys(): CreatureNightWatchSystem { return new CreatureNightWatchSystem() }
describe('CreatureNightWatchSystem', () => {
  let sys: CreatureNightWatchSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部watches初始为空', () => { expect((sys as any).watches.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureNightWatchSystem) })
})
