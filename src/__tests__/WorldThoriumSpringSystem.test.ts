import { describe, it, expect, beforeEach } from 'vitest'
import { WorldThoriumSpringSystem } from '../systems/WorldThoriumSpringSystem'
import type { ThoriumSpringZone } from '../systems/WorldThoriumSpringSystem'

function makeSys(): WorldThoriumSpringSystem { return new WorldThoriumSpringSystem() }
let nextId = 1
function makeZone(): ThoriumSpringZone {
  return { id: nextId++, x: 20, y: 30, thoriumContent: 40, springFlow: 50, tick: 0 } as ThoriumSpringZone
}

describe('WorldThoriumSpringSystem.getZones', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Thorium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Thorium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.thoriumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
