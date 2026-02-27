import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCulturalExchangeSystem } from '../systems/DiplomaticCulturalExchangeSystem'
function makeSys() { return new DiplomaticCulturalExchangeSystem() }
describe('DiplomaticCulturalExchangeSystem', () => {
  let sys: DiplomaticCulturalExchangeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getExchanges为空', () => { expect(sys.getExchanges()).toHaveLength(0) })
  it('注入后getExchanges返回数据', () => {
    ;(sys as any).exchanges.push({ id: 1 })
    expect(sys.getExchanges()).toHaveLength(1)
  })
})
