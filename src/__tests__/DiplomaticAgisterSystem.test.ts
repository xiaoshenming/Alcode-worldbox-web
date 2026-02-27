import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAgisterSystem } from '../systems/DiplomaticAgisterSystem'
function makeSys() { return new DiplomaticAgisterSystem() }
describe('DiplomaticAgisterSystem', () => {
  let sys: DiplomaticAgisterSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
