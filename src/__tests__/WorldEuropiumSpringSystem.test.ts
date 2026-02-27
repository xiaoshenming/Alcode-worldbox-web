import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEuropiumSpringSystem } from '../systems/WorldEuropiumSpringSystem'
import type { EuropiumSpringZone } from '../systems/WorldEuropiumSpringSystem'

function makeSys(): WorldEuropiumSpringSystem { return new WorldEuropiumSpringSystem() }
let nextId = 1
function makeZone(): EuropiumSpringZone {
  return { id: nextId++, x: 20, y: 30, europiumContent: 40, springFlow: 50, tick: 0 } as EuropiumSpringZone
}

describe('WorldEuropiumSpringSystem.getZones', () => {
  let sys: WorldEuropiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Europium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Europium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.europiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
