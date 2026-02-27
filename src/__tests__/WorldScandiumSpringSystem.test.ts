import { describe, it, expect, beforeEach } from 'vitest'
import { WorldScandiumSpringSystem } from '../systems/WorldScandiumSpringSystem'
import type { ScandiumSpringZone } from '../systems/WorldScandiumSpringSystem'

function makeSys(): WorldScandiumSpringSystem { return new WorldScandiumSpringSystem() }
let nextId = 1
function makeZone(): ScandiumSpringZone {
  return { id: nextId++, x: 20, y: 30, scandiumContent: 40, springFlow: 50, tick: 0 } as ScandiumSpringZone
}

describe('WorldScandiumSpringSystem.getZones', () => {
  let sys: WorldScandiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Scandium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Scandium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.scandiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
