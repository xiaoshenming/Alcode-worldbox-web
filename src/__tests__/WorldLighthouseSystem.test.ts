import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLighthouseSystem } from '../systems/WorldLighthouseSystem'
import type { Lighthouse, LighthouseState } from '../systems/WorldLighthouseSystem'

function makeSys(): WorldLighthouseSystem { return new WorldLighthouseSystem() }
let nextId = 1
function makeLighthouse(state: LighthouseState = 'active'): Lighthouse {
  return { id: nextId++, x: 20, y: 30, state, beamRange: 20, beamAngle: 0, rotationSpeed: 0.02, durability: 100, tick: 0 }
}

describe('WorldLighthouseSystem.getLighthouses', () => {
  let sys: WorldLighthouseSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无灯塔', () => { expect((sys as any).lighthouses).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lighthouses.push(makeLighthouse())
    expect((sys as any).lighthouses).toHaveLength(1)
  })
  it('返回只读引用', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('damaged'))
    const lhs = (sys as any).lighthouses
    expect(lhs[0].state).toBe('damaged')
  })
  it('支持4种灯塔状态', () => {
    const states: LighthouseState[] = ['building', 'active', 'damaged', 'ruined']
    expect(states).toHaveLength(4)
  })
  it('多个灯塔全部返回', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active'))
    ;(sys as any).lighthouses.push(makeLighthouse('building'))
    ;(sys as any).lighthouses.push(makeLighthouse('ruined'))
    expect((sys as any).lighthouses).toHaveLength(3)
  })
})
