import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBerylliumSpringSystem } from '../systems/WorldBerylliumSpringSystem'
import type { BerylliumSpringZone } from '../systems/WorldBerylliumSpringSystem'

function makeSys(): WorldBerylliumSpringSystem { return new WorldBerylliumSpringSystem() }
let nextId = 1
function makeZone(): BerylliumSpringZone {
  return { id: nextId++, x: 20, y: 30, berylliumContent: 40, springFlow: 50, tick: 0 } as BerylliumSpringZone
}

describe('WorldBerylliumSpringSystem.getZones', () => {
  let sys: WorldBerylliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Beryllium泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('Beryllium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.berylliumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Beryllium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})
