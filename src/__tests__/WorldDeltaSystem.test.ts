import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDeltaSystem } from '../systems/WorldDeltaSystem'
import type { Delta } from '../systems/WorldDeltaSystem'

function makeSys(): WorldDeltaSystem { return new WorldDeltaSystem() }
let nextId = 1
function makeDelta(): Delta {
  return { id: nextId++, x: 25, y: 35, area: 100, channelCount: 5, sedimentDeposit: 60, fertility: 80, floodRisk: 30, spectacle: 70, tick: 0 }
}

describe('WorldDeltaSystem.getDeltas', () => {
  let sys: WorldDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无河口三角洲', () => { expect(sys.getDeltas()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deltas.push(makeDelta())
    expect(sys.getDeltas()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDeltas()).toBe((sys as any).deltas)
  })
  it('三角洲字段正确', () => {
    ;(sys as any).deltas.push(makeDelta())
    const d = sys.getDeltas()[0]
    expect(d.channelCount).toBe(5)
    expect(d.fertility).toBe(80)
    expect(d.floodRisk).toBe(30)
  })
  it('多个三角洲全部返回', () => {
    ;(sys as any).deltas.push(makeDelta())
    ;(sys as any).deltas.push(makeDelta())
    expect(sys.getDeltas()).toHaveLength(2)
  })
})
