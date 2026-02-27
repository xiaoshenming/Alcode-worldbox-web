import { describe, it, expect, beforeEach } from 'vitest'
import { WorldThermalSpringSystem } from '../systems/WorldThermalSpringSystem'
import type { ThermalSpring } from '../systems/WorldThermalSpringSystem'

function makeSys(): WorldThermalSpringSystem { return new WorldThermalSpringSystem() }
let nextId = 1
function makeSpring(): ThermalSpring {
  return { id: nextId++, x: 20, y: 30, waterTemp: 60, flowVolume: 50, dissolvedMinerals: 40, clarity: 70, tick: 0 }
}

describe('WorldThermalSpringSystem.getSprings', () => {
  let sys: WorldThermalSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无温泉', () => { expect(sys.getSprings()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).springs.push(makeSpring())
    expect(sys.getSprings()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSprings()).toBe((sys as any).springs)
  })
  it('温泉字段正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = sys.getSprings()[0]
    expect(s.waterTemp).toBe(60)
    expect(s.dissolvedMinerals).toBe(40)
    expect(s.clarity).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
