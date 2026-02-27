import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDeflationHollowSystem } from '../systems/WorldDeflationHollowSystem'
import type { DeflationHollow } from '../systems/WorldDeflationHollowSystem'

function makeSys(): WorldDeflationHollowSystem { return new WorldDeflationHollowSystem() }
let nextId = 1
function makeHollow(): DeflationHollow {
  return { id: nextId++, x: 20, y: 30, depth: 5, diameter: 15, windExposure: 80, sedimentLoss: 60, lagDeposit: 40, spectacle: 50, tick: 0 }
}

describe('WorldDeflationHollowSystem.getHollows', () => {
  let sys: WorldDeflationHollowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无风蚀洼地', () => { expect(sys.getHollows()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hollows.push(makeHollow())
    expect(sys.getHollows()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getHollows()).toBe((sys as any).hollows)
  })
  it('风蚀洼地字段正确', () => {
    ;(sys as any).hollows.push(makeHollow())
    const h = sys.getHollows()[0]
    expect(h.windExposure).toBe(80)
    expect(h.sedimentLoss).toBe(60)
    expect(h.lagDeposit).toBe(40)
  })
  it('多个风蚀洼地全部返回', () => {
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    expect(sys.getHollows()).toHaveLength(2)
  })
})
