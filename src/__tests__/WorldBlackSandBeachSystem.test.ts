import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBlackSandBeachSystem } from '../systems/WorldBlackSandBeachSystem'
import type { BlackSandBeachZone } from '../systems/WorldBlackSandBeachSystem'

function makeSys(): WorldBlackSandBeachSystem { return new WorldBlackSandBeachSystem() }
let nextId = 1
function makeZone(): BlackSandBeachZone {
  return { id: nextId++, x: 10, y: 20, magnetiteContent: 75, waveEnergy: 60, sandDepth: 3, volcanism: 80, tick: 0 }
}

describe('WorldBlackSandBeachSystem.getZones', () => {
  let sys: WorldBlackSandBeachSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无黑沙滩', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('黑沙滩字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.magnetiteContent).toBe(75)
    expect(z.volcanism).toBe(80)
    expect(z.sandDepth).toBe(3)
  })
  it('多个黑沙滩全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
