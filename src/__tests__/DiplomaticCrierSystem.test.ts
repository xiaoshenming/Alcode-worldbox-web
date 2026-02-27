import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCrierSystem } from '../systems/DiplomaticCrierSystem'
function makeSys() { return new DiplomaticCrierSystem() }
describe('DiplomaticCrierSystem', () => {
  let sys: DiplomaticCrierSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
