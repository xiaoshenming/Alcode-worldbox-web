import { describe, it, expect, beforeEach } from 'vitest'
import { TradeFleetSystem } from '../systems/TradeFleetSystem'

function makeSys(): TradeFleetSystem { return new TradeFleetSystem() }

describe('TradeFleetSystem getters', () => {
  let sys: TradeFleetSystem
  beforeEach(() => { sys = makeSys() })

  it('初始活跃路线数为0', () => { expect(sys.getActiveRoutes()).toBe(0) })
  it('初始船只数为0', () => { expect(sys.getShipCount()).toBe(0) })
  it('初始贸易量为0', () => { expect(sys.getTradeVolume()).toBe(0) })
  it('注入路线后getActiveRoutes增加', () => {
    ;(sys as any).routes.set(1, { civA: 1, civB: 2, x1: 0, y1: 0, x2: 10, y2: 10, active: true })
    ;(sys as any).routes.set(2, { civA: 1, civB: 3, x1: 0, y1: 0, x2: 20, y2: 20, active: true })
    expect(sys.getActiveRoutes()).toBe(2)
  })
  it('注入船只后getShipCount增加', () => {
    ;(sys as any).ships.push({ x: 5, y: 5, routeId: 1, speed: 0.02, progress: 0, cargo: 'gold', color: '#ff0' })
    expect(sys.getShipCount()).toBe(1)
  })
  it('设置贸易量后可查询', () => {
    ;(sys as any).tradeVolume = 500
    expect(sys.getTradeVolume()).toBe(500)
  })
})
