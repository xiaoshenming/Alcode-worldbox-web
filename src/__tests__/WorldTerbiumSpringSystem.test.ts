import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTerbiumSpringSystem } from '../systems/WorldTerbiumSpringSystem'
import type { TerbiumSpringZone } from '../systems/WorldTerbiumSpringSystem'

function makeSys(): WorldTerbiumSpringSystem { return new WorldTerbiumSpringSystem() }
let nextId = 1
function makeZone(): TerbiumSpringZone {
  return { id: nextId++, x: 20, y: 30, terbiumContent: 40, springFlow: 50, tick: 0 } as TerbiumSpringZone
}

describe('WorldTerbiumSpringSystem.getZones', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Terbium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Terbium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.terbiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
