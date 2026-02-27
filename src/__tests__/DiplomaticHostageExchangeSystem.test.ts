import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticHostageExchangeSystem } from '../systems/DiplomaticHostageExchangeSystem'
function makeSys() { return new DiplomaticHostageExchangeSystem() }
describe('DiplomaticHostageExchangeSystem', () => {
  let sys: DiplomaticHostageExchangeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getExchanges为空', () => { expect(sys.getExchanges()).toHaveLength(0) })
  it('注入后getExchanges返回数据', () => {
    ;(sys as any).exchanges.push({ id: 1 })
    expect(sys.getExchanges()).toHaveLength(1)
  })
})
