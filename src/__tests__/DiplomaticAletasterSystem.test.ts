import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAletasterSystem } from '../systems/DiplomaticAletasterSystem'
function makeSys() { return new DiplomaticAletasterSystem() }
describe('DiplomaticAletasterSystem', () => {
  let sys: DiplomaticAletasterSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
