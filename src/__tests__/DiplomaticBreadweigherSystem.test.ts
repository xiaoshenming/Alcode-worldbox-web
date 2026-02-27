import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBreadweigherSystem } from '../systems/DiplomaticBreadweigherSystem'
function makeSys() { return new DiplomaticBreadweigherSystem() }
describe('DiplomaticBreadweigherSystem', () => {
  let sys: DiplomaticBreadweigherSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
