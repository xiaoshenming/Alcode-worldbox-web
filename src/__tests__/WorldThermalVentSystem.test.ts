import { describe, it, expect, beforeEach } from 'vitest'
import { WorldThermalVentSystem } from '../systems/WorldThermalVentSystem'
import type { ThermalVent } from '../systems/WorldThermalVentSystem'

function makeSys(): WorldThermalVentSystem { return new WorldThermalVentSystem() }
let nextId = 1
function makeVent(): ThermalVent {
  return { id: nextId++, x: 30, y: 40, heatOutput: 80, mineralPlume: 60, pressure: 70, biomeRadius: 10, tick: 0 }
}

describe('WorldThermalVentSystem.getVents', () => {
  let sys: WorldThermalVentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无热液喷口', () => { expect(sys.getVents()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vents.push(makeVent())
    expect(sys.getVents()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getVents()).toBe((sys as any).vents)
  })
  it('热液喷口字段正确', () => {
    ;(sys as any).vents.push(makeVent())
    const v = sys.getVents()[0]
    expect(v.heatOutput).toBe(80)
    expect(v.mineralPlume).toBe(60)
    expect(v.biomeRadius).toBe(10)
  })
})
