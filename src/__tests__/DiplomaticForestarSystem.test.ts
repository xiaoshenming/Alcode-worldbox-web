import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticForestarSystem } from '../systems/DiplomaticForestarSystem'
function makeSys() { return new DiplomaticForestarSystem() }
describe('DiplomaticForestarSystem', () => {
  let sys: DiplomaticForestarSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
