import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGalliumSpringSystem } from '../systems/WorldGalliumSpringSystem'
import type { GalliumSpringZone } from '../systems/WorldGalliumSpringSystem'

function makeSys(): WorldGalliumSpringSystem { return new WorldGalliumSpringSystem() }
let nextId = 1
function makeZone(): GalliumSpringZone {
  return { id: nextId++, x: 20, y: 30, galliumContent: 40, springFlow: 50, tick: 0 } as GalliumSpringZone
}

describe('WorldGalliumSpringSystem.getZones', () => {
  let sys: WorldGalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Gallium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Gallium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.galliumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
