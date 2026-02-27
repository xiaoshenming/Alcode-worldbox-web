import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPoloniumSpringSystem } from '../systems/WorldPoloniumSpringSystem'
import type { PoloniumSpringZone } from '../systems/WorldPoloniumSpringSystem'

function makeSys(): WorldPoloniumSpringSystem { return new WorldPoloniumSpringSystem() }
let nextId = 1
function makeZone(): PoloniumSpringZone {
  return { id: nextId++, x: 20, y: 30, poloniumContent: 40, springFlow: 50, tick: 0 } as PoloniumSpringZone
}

describe('WorldPoloniumSpringSystem.getZones', () => {
  let sys: WorldPoloniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Polonium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Polonium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.poloniumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
