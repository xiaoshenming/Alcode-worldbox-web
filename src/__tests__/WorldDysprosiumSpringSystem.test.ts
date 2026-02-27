import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDysprosiumSpringSystem } from '../systems/WorldDysprosiumSpringSystem'
import type { DysprosiumSpringZone } from '../systems/WorldDysprosiumSpringSystem'

function makeSys(): WorldDysprosiumSpringSystem { return new WorldDysprosiumSpringSystem() }
let nextId = 1
function makeZone(): DysprosiumSpringZone {
  return { id: nextId++, x: 20, y: 30, dysprosiumContent: 40, springFlow: 50, tick: 0 } as DysprosiumSpringZone
}

describe('WorldDysprosiumSpringSystem.getZones', () => {
  let sys: WorldDysprosiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Dysprosium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Dysprosium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.dysprosiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
