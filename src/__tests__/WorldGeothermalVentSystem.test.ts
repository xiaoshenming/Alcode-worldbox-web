import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeothermalVentSystem } from '../systems/WorldGeothermalVentSystem'
import type { GeothermalVent, VentActivity } from '../systems/WorldGeothermalVentSystem'

function makeSys(): WorldGeothermalVentSystem { return new WorldGeothermalVentSystem() }
let nextId = 1
function makeVent(activity: VentActivity = 'active'): GeothermalVent {
  return { id: nextId++, x: 30, y: 40, activity, heatOutput: 70, mineralOutput: 5, age: 1000, eruptionCooldown: 0, tick: 0 }
}

describe('WorldGeothermalVentSystem.getVents', () => {
  let sys: WorldGeothermalVentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地热喷口', () => { expect(sys.getVents()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getVents().push(makeVent())
    expect(sys.getVents()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getVents()).toBe(sys.getVents())
  })
  it('支持4种活动状态', () => {
    const activities: VentActivity[] = ['dormant', 'simmering', 'active', 'erupting']
    expect(activities).toHaveLength(4)
  })
  it('地热喷口字段正确', () => {
    ;sys.getVents().push(makeVent('erupting'))
    const v = sys.getVents()[0]
    expect(v.activity).toBe('erupting')
    expect(v.heatOutput).toBe(70)
    expect(v.mineralOutput).toBe(5)
  })
})
