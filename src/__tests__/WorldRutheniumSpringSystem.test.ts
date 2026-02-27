import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRutheniumSpringSystem } from '../systems/WorldRutheniumSpringSystem'
import type { RutheniumSpringZone } from '../systems/WorldRutheniumSpringSystem'

function makeSys(): WorldRutheniumSpringSystem { return new WorldRutheniumSpringSystem() }
let nextId = 1
function makeZone(): RutheniumSpringZone {
  return { id: nextId++, x: 20, y: 30, rutheniumContent: 40, springFlow: 50, tick: 0 } as RutheniumSpringZone
}

describe('WorldRutheniumSpringSystem.getZones', () => {
  let sys: WorldRutheniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Ruthenium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Ruthenium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.rutheniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
