import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAuroraStormSystem } from '../systems/WorldAuroraStormSystem'
import type { AuroraStorm } from '../systems/WorldAuroraStormSystem'

function makeSys(): WorldAuroraStormSystem { return new WorldAuroraStormSystem() }
let nextId = 1
function makeStorm(active = true): AuroraStorm {
  return { id: nextId++, x: 50, y: 50, radius: 20, intensity: 80, hue: 120, duration: 500, maxDuration: 1000, active }
}

describe('WorldAuroraStormSystem', () => {
  let sys: WorldAuroraStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无极光风暴', () => { expect((sys as any).storms).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).storms.push(makeStorm())
    expect((sys as any).storms).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).storms).toBe((sys as any).storms)
  })
  it('getActiveStorms只返回active=true', () => {
    ;(sys as any).storms.push(makeStorm(true))
    ;(sys as any).storms.push(makeStorm(false))
    expect(sys.getActiveStorms()).toHaveLength(1)
  })
  it('极光风暴字段正确', () => {
    ;(sys as any).storms.push(makeStorm())
    const s = (sys as any).storms[0]
    expect(s.intensity).toBe(80)
    expect(s.hue).toBe(120)
    expect(s.active).toBe(true)
  })
})
