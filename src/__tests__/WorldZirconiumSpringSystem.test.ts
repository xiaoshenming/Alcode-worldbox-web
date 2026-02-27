import { describe, it, expect, beforeEach } from 'vitest'
import { WorldZirconiumSpringSystem } from '../systems/WorldZirconiumSpringSystem'
import type { ZirconiumSpringZone } from '../systems/WorldZirconiumSpringSystem'

function makeSys(): WorldZirconiumSpringSystem { return new WorldZirconiumSpringSystem() }
let nextId = 1
function makeZone(): ZirconiumSpringZone {
  return { id: nextId++, x: 20, y: 30, zirconiumContent: 40, springFlow: 50, tick: 0 } as ZirconiumSpringZone
}

describe('WorldZirconiumSpringSystem.getZones', () => {
  let sys: WorldZirconiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Zirconium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Zirconium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.zirconiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
