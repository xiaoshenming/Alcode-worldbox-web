import { describe, it, expect, beforeEach } from 'vitest'
import { WorldThalliumSpringSystem } from '../systems/WorldThalliumSpringSystem'
import type { ThalliumSpringZone } from '../systems/WorldThalliumSpringSystem'

function makeSys(): WorldThalliumSpringSystem { return new WorldThalliumSpringSystem() }
let nextId = 1
function makeZone(): ThalliumSpringZone {
  return { id: nextId++, x: 20, y: 30, thalliumContent: 40, springFlow: 50, tick: 0 } as ThalliumSpringZone
}

describe('WorldThalliumSpringSystem.getZones', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Thallium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Thallium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.thalliumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
