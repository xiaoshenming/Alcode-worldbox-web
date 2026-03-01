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
    // TradeRoute 接口字段: routeId, fromX, fromY, toX, toY, civIdA, civIdB, colorA, colorB
    ;(sys as any).routes.set(1, { routeId: 1, fromX: 0, fromY: 0, toX: 10, toY: 10, civIdA: 1, civIdB: 2, colorA: '#f00', colorB: '#0f0' })
    ;(sys as any).routes.set(2, { routeId: 2, fromX: 0, fromY: 0, toX: 20, toY: 20, civIdA: 1, civIdB: 3, colorA: '#f00', colorB: '#00f' })
    expect(sys.getActiveRoutes()).toBe(2)
  })
  it('注入船只后getShipCount增加', () => {
    ;(sys as any).ships.push({ routeId: 1, progress: 0, direction: 1, color: '#ff0' })
    expect(sys.getShipCount()).toBe(1)
  })
  it('设置贸易量后可查询', () => {
    // tradeVolume 是私有字段，通过 as any 设置
    ;(sys as any).tradeVolume = 500
    expect(sys.getTradeVolume()).toBe(500)
  })
})
