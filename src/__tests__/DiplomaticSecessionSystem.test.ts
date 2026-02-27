import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSecessionSystem } from '../systems/DiplomaticSecessionSystem'
function makeSys() { return new DiplomaticSecessionSystem() }
describe('DiplomaticSecessionSystem', () => {
  let sys: DiplomaticSecessionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMovements为空', () => { expect(sys.getMovements()).toHaveLength(0) })
  it('注入后getMovements返回数据', () => {
    ;(sys as any).movements.push({ id: 1 })
    expect(sys.getMovements()).toHaveLength(1)
  })
})
