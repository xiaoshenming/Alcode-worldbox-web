import { describe, it, expect, beforeEach } from 'vitest'
import { WorldYtterbiumSpringSystem } from '../systems/WorldYtterbiumSpringSystem'
import type { YtterbiumSpringZone } from '../systems/WorldYtterbiumSpringSystem'

function makeSys(): WorldYtterbiumSpringSystem { return new WorldYtterbiumSpringSystem() }
let nextId = 1
function makeZone(): YtterbiumSpringZone {
  return { id: nextId++, x: 20, y: 30, ytterbiumContent: 40, springFlow: 50, tick: 0 } as YtterbiumSpringZone
}

describe('WorldYtterbiumSpringSystem.getZones', () => {
  let sys: WorldYtterbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Ytterbium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Ytterbium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.ytterbiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
