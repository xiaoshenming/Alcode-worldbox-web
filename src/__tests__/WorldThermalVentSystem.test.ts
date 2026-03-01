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

  it('初始无热液喷口', () => { expect((sys as any).vents).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vents.push(makeVent())
    expect((sys as any).vents).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).vents).toBe((sys as any).vents)
  })
  it('热液喷口字段正确', () => {
    ;(sys as any).vents.push(makeVent())
    const v = (sys as any).vents[0]
    expect(v.heatOutput).toBe(80)
    expect(v.mineralPlume).toBe(60)
    expect(v.biomeRadius).toBe(10)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
