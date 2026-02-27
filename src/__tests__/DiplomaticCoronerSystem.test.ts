import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCoronerSystem } from '../systems/DiplomaticCoronerSystem'
function makeSys() { return new DiplomaticCoronerSystem() }
describe('DiplomaticCoronerSystem', () => {
  let sys: DiplomaticCoronerSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
