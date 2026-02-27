import { describe, it, expect, beforeEach } from 'vitest'
import { WorldErbiumSpringSystem } from '../systems/WorldErbiumSpringSystem'
import type { ErbiumSpringZone } from '../systems/WorldErbiumSpringSystem'

function makeSys(): WorldErbiumSpringSystem { return new WorldErbiumSpringSystem() }
let nextId = 1
function makeZone(): ErbiumSpringZone {
  return { id: nextId++, x: 20, y: 30, erbiumContent: 40, springFlow: 50, tick: 0 } as ErbiumSpringZone
}

describe('WorldErbiumSpringSystem.getZones', () => {
  let sys: WorldErbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Erbium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Erbium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.erbiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
