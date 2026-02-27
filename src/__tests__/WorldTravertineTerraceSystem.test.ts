import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTravertineTerraceSystem } from '../systems/WorldTravertineTerraceSystem'
import type { TravertineTerraceZone } from '../systems/WorldTravertineTerraceSystem'

function makeSys(): WorldTravertineTerraceSystem { return new WorldTravertineTerraceSystem() }
let nextId = 1
function makeZone(): TravertineTerraceZone {
  return { id: nextId++, x: 20, y: 30, mineralContent: 70, poolDepth: 3, flowRate: 40, calcification: 60, tick: 0 }
}

describe('WorldTravertineTerraceSystem.getZones', () => {
  let sys: WorldTravertineTerraceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石灰华梯田', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('石灰华梯田字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.mineralContent).toBe(70)
    expect(z.calcification).toBe(60)
    expect(z.flowRate).toBe(40)
  })
})
