import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPetrificationSystem } from '../systems/WorldPetrificationSystem'
import type { PetrificationZone, PetrifiedCreature } from '../systems/WorldPetrificationSystem'

function makeSys(): WorldPetrificationSystem { return new WorldPetrificationSystem() }
let nextId = 1
function makeZone(): PetrificationZone {
  return { id: nextId++, x: 30, y: 40, radius: 10, maxRadius: 20, spreadRate: 0.5, intensity: 70, age: 500, expanding: true, petrifiedCount: 3 }
}
function makePetrified(): PetrifiedCreature {
  return { creatureId: nextId++, zoneId: 1, originalX: 30, originalY: 40, tick: 0, duration: 1000 }
}

describe('WorldPetrificationSystem', () => {
  let sys: WorldPetrificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石化区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('getPetrified返回石化生物', () => {
    ;(sys as any).petrified.push(makePetrified())
    expect(sys.getPetrified()).toHaveLength(1)
  })
  it('石化区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.intensity).toBe(70)
    expect(z.expanding).toBe(true)
    expect(z.petrifiedCount).toBe(3)
  })
})
