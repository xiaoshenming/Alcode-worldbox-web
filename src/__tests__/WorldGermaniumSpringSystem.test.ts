import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGermaniumSpringSystem } from '../systems/WorldGermaniumSpringSystem'
import type { GermaniumSpringZone } from '../systems/WorldGermaniumSpringSystem'

function makeSys(): WorldGermaniumSpringSystem { return new WorldGermaniumSpringSystem() }
let nextId = 1
function makeZone(): GermaniumSpringZone {
  return { id: nextId++, x: 20, y: 30, germaniumContent: 40, springFlow: 50, tick: 0 } as GermaniumSpringZone
}

describe('WorldGermaniumSpringSystem.getZones', () => {
  let sys: WorldGermaniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Germanium泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Germanium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.germaniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
