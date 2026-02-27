import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNeodymiumSpringSystem } from '../systems/WorldNeodymiumSpringSystem'
import type { NeodymiumSpringZone } from '../systems/WorldNeodymiumSpringSystem'

function makeSys(): WorldNeodymiumSpringSystem { return new WorldNeodymiumSpringSystem() }
let nextId = 1
function makeZone(): NeodymiumSpringZone {
  return { id: nextId++, x: 20, y: 30, neodymiumContent: 40, springFlow: 50, tick: 0 } as NeodymiumSpringZone
}

describe('WorldNeodymiumSpringSystem.getZones', () => {
  let sys: WorldNeodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Neodymium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Neodymium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.neodymiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
