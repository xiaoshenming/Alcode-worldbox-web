import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIridiumSpringSystem } from '../systems/WorldIridiumSpringSystem'
import type { IridiumSpringZone } from '../systems/WorldIridiumSpringSystem'

function makeSys(): WorldIridiumSpringSystem { return new WorldIridiumSpringSystem() }
let nextId = 1
function makeZone(): IridiumSpringZone {
  return { id: nextId++, x: 20, y: 30, iridiumContent: 40, springFlow: 50, tick: 0 } as IridiumSpringZone
}

describe('WorldIridiumSpringSystem.getZones', () => {
  let sys: WorldIridiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Iridium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Iridium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.iridiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
