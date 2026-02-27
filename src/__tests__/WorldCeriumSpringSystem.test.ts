import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCeriumSpringSystem } from '../systems/WorldCeriumSpringSystem'
import type { CeriumSpringZone } from '../systems/WorldCeriumSpringSystem'

function makeSys(): WorldCeriumSpringSystem { return new WorldCeriumSpringSystem() }
let nextId = 1
function makeZone(): CeriumSpringZone {
  return { id: nextId++, x: 20, y: 30, ceriumContent: 40, springFlow: 50, tick: 0 } as CeriumSpringZone
}

describe('WorldCeriumSpringSystem.getZones', () => {
  let sys: WorldCeriumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Cerium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Cerium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.ceriumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
