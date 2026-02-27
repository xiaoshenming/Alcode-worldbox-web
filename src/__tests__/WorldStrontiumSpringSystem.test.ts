import { describe, it, expect, beforeEach } from 'vitest'
import { WorldStrontiumSpringSystem } from '../systems/WorldStrontiumSpringSystem'
import type { StrontiumSpringZone } from '../systems/WorldStrontiumSpringSystem'

function makeSys(): WorldStrontiumSpringSystem { return new WorldStrontiumSpringSystem() }
let nextId = 1
function makeZone(): StrontiumSpringZone {
  return { id: nextId++, x: 20, y: 30, strontiumContent: 40, springFlow: 50, tick: 0 } as StrontiumSpringZone
}

describe('WorldStrontiumSpringSystem.getZones', () => {
  let sys: WorldStrontiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Strontium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Strontium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.strontiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
