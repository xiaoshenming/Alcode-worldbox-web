import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDreamSystem } from '../systems/CreatureDreamSystem'
function makeSys(): CreatureDreamSystem { return new CreatureDreamSystem() }
describe('CreatureDreamSystem', () => {
  let sys: CreatureDreamSystem
  beforeEach(() => { sys = makeSys() })
  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部dreamLog初始为空', () => { expect((sys as any).dreamLog.length).toBe(0) })
  it('是对象实例', () => { expect(sys).toBeInstanceOf(CreatureDreamSystem) })
})
