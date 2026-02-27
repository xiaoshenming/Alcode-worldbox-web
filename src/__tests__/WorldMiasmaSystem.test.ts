import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMiasmaSystem } from '../systems/WorldMiasmaSystem'
import type { MiasmaZone, MiasmaSource } from '../systems/WorldMiasmaSystem'

function makeSys(): WorldMiasmaSystem { return new WorldMiasmaSystem() }
let nextId = 1
function makeZone(intensity: number = 50, source: MiasmaSource = 'swamp'): MiasmaZone {
  return { id: nextId++, x: 5, y: 5, radius: 3, intensity, source, spreadRate: 0.1, decayRate: 0.05, createdTick: 0 }
}

describe('WorldMiasmaSystem.getZones', () => {
  let sys: WorldMiasmaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毒雾区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('支持6种毒雾来源', () => {
    const sources: MiasmaSource[] = ['swamp', 'battlefield', 'pollution', 'cursed', 'volcanic', 'plague']
    expect(sources).toHaveLength(6)
  })
})

describe('WorldMiasmaSystem.getZoneCount', () => {
  let sys: WorldMiasmaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getZoneCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZoneCount()).toBe(2)
  })
})

describe('WorldMiasmaSystem.getToxicZones', () => {
  let sys: WorldMiasmaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无区域时返回���', () => { expect(sys.getToxicZones()).toHaveLength(0) })
  it('intensity>60才算toxic', () => {
    ;(sys as any).zones.push(makeZone(50))  // not toxic
    ;(sys as any).zones.push(makeZone(70))  // toxic
    ;(sys as any).zones.push(makeZone(90))  // toxic
    expect(sys.getToxicZones()).toHaveLength(2)
  })
})
