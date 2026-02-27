import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPedimentSystem } from '../systems/WorldPedimentSystem'
import type { Pediment } from '../systems/WorldPedimentSystem'

function makeSys(): WorldPedimentSystem { return new WorldPedimentSystem() }
let nextId = 1
function makePediment(): Pediment {
  return { id: nextId++, x: 20, y: 30, area: 50, slope: 5, erosionAge: 10000, sedimentThickness: 3, drainagePattern: 2, spectacle: 55, tick: 0 }
}

describe('WorldPedimentSystem.getPediments', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无山麓斜面', () => { expect(sys.getPediments()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pediments.push(makePediment())
    expect(sys.getPediments()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPediments()).toBe((sys as any).pediments)
  })
  it('山麓斜面字段正确', () => {
    ;(sys as any).pediments.push(makePediment())
    const p = sys.getPediments()[0]
    expect(p.slope).toBe(5)
    expect(p.erosionAge).toBe(10000)
    expect(p.spectacle).toBe(55)
  })
  it('多个山麓斜面全部返回', () => {
    ;(sys as any).pediments.push(makePediment())
    ;(sys as any).pediments.push(makePediment())
    expect(sys.getPediments()).toHaveLength(2)
  })
})
