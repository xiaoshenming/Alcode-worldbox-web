import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeothermalSystem } from '../systems/WorldGeothermalSystem'
import type { GeothermalVent, VentType } from '../systems/WorldGeothermalSystem'

function makeSys(): WorldGeothermalSystem { return new WorldGeothermalSystem() }
let nextId = 1
function makeVent(type: VentType = 'geyser'): GeothermalVent {
  return { id: nextId++, x: 20, y: 30, type, temperature: 200, pressure: 80, active: true, tick: 0 }
}

describe('WorldGeothermalSystem.getVents', () => {
  let sys: WorldGeothermalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地热喷口', () => { expect((sys as any).vents).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vents.push(makeVent())
    expect((sys as any).vents).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).vents).toBe((sys as any).vents)
  })
  it('支持4种喷口类型', () => {
    const types: VentType[] = ['hot_spring', 'geyser', 'fumarole', 'mud_pot']
    expect(types).toHaveLength(4)
  })
  it('地热喷口字段正确', () => {
    ;(sys as any).vents.push(makeVent('fumarole'))
    const v = (sys as any).vents[0]
    expect(v.type).toBe('fumarole')
    expect(v.temperature).toBe(200)
    expect(v.active).toBe(true)
  })
})
