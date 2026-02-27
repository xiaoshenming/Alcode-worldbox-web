import { describe, it, expect, beforeEach } from 'vitest'
import { WorldOsmiumSpringSystem } from '../systems/WorldOsmiumSpringSystem'
import type { OsmiumSpringZone } from '../systems/WorldOsmiumSpringSystem'

function makeSys(): WorldOsmiumSpringSystem { return new WorldOsmiumSpringSystem() }
let nextId = 1
function makeZone(): OsmiumSpringZone {
  return { id: nextId++, x: 20, y: 30, osmiumContent: 40, springFlow: 50, tick: 0 } as OsmiumSpringZone
}

describe('WorldOsmiumSpringSystem.getZones', () => {
  let sys: WorldOsmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Osmium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Osmium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.osmiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
