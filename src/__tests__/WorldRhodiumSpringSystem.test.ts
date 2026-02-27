import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRhodiumSpringSystem } from '../systems/WorldRhodiumSpringSystem'
import type { RhodiumSpringZone } from '../systems/WorldRhodiumSpringSystem'

function makeSys(): WorldRhodiumSpringSystem { return new WorldRhodiumSpringSystem() }
let nextId = 1
function makeZone(): RhodiumSpringZone {
  return { id: nextId++, x: 20, y: 30, rhodiumContent: 40, springFlow: 50, tick: 0 } as RhodiumSpringZone
}

describe('WorldRhodiumSpringSystem.getZones', () => {
  let sys: WorldRhodiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Rhodium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Rhodium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.rhodiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
