import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHolmiumSpringSystem } from '../systems/WorldHolmiumSpringSystem'
import type { HolmiumSpringZone } from '../systems/WorldHolmiumSpringSystem'

function makeSys(): WorldHolmiumSpringSystem { return new WorldHolmiumSpringSystem() }
let nextId = 1
function makeZone(): HolmiumSpringZone {
  return { id: nextId++, x: 20, y: 30, holmiumContent: 40, springFlow: 50, tick: 0 } as HolmiumSpringZone
}

describe('WorldHolmiumSpringSystem.getZones', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Holmium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Holmium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.holmiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
