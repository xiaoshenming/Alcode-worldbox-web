import { describe, it, expect, beforeEach } from 'vitest'
import { WorldThuliumSpringSystem } from '../systems/WorldThuliumSpringSystem'
import type { ThuliumSpringZone } from '../systems/WorldThuliumSpringSystem'

function makeSys(): WorldThuliumSpringSystem { return new WorldThuliumSpringSystem() }
let nextId = 1
function makeZone(): ThuliumSpringZone {
  return { id: nextId++, x: 20, y: 30, thuliumContent: 40, springFlow: 50, tick: 0 } as ThuliumSpringZone
}

describe('WorldThuliumSpringSystem.getZones', () => {
  let sys: WorldThuliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Thulium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Thulium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.thuliumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
