import { describe, it, expect, beforeEach } from 'vitest'
import { TradeRouteRenderer } from '../systems/TradeRouteRenderer'
function makeSys() { return new TradeRouteRenderer() }
describe('TradeRouteRenderer', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })
  it('初始routes为空', () => { expect((sys as any).routes).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
})
