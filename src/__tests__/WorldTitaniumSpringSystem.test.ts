import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTitaniumSpringSystem } from '../systems/WorldTitaniumSpringSystem'
import type { TitaniumSpringZone } from '../systems/WorldTitaniumSpringSystem'

function makeSys(): WorldTitaniumSpringSystem { return new WorldTitaniumSpringSystem() }
let nextId = 1
function makeZone(): TitaniumSpringZone {
  return { id: nextId++, x: 20, y: 30, titaniumContent: 40, springFlow: 50, tick: 0 } as TitaniumSpringZone
}

describe('WorldTitaniumSpringSystem.getZones', () => {
  let sys: WorldTitaniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Titanium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Titanium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.titaniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
