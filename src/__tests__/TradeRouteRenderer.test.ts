import { describe, it, expect, beforeEach } from 'vitest'
import { TradeRouteRenderer } from '../systems/TradeRouteRenderer'

function makeSys() { return new TradeRouteRenderer() }

describe('TradeRouteRenderer', () => {
  let sys: TradeRouteRenderer
  beforeEach(() => { sys = makeSys() })

  it('初始routes为空', () => { expect((sys as any).routes).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
  it('isVisible()初始返回true', () => { expect(sys.isVisible()).toBe(true) })
  it('toggle()后isVisible()变为false', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })
  it('toggle()两次后isVisible()恢复为true', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
  it('setRoutes后routes长度更新', () => {
    sys.setRoutes([{ from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, active: true } as any])
    expect((sys as any).routes).toHaveLength(1)
  })
  it('setRoutes空数组后routes为空', () => {
    sys.setRoutes([{ from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, active: true } as any])
    sys.setRoutes([])
    expect((sys as any).routes).toHaveLength(0)
  })
})
