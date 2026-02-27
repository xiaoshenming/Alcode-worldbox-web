import { describe, it, expect, beforeEach } from 'vitest'
import { WorldOxygenSpringSystem } from '../systems/WorldOxygenSpringSystem'
import type { OxygenSpringZone } from '../systems/WorldOxygenSpringSystem'

function makeSys(): WorldOxygenSpringSystem { return new WorldOxygenSpringSystem() }
let nextId = 1
function makeZone(): OxygenSpringZone {
  return { id: nextId++, x: 20, y: 30, oxygenContent: 40, springFlow: 50, tick: 0 } as OxygenSpringZone
}

describe('WorldOxygenSpringSystem.getZones', () => {
  let sys: WorldOxygenSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Oxygen泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Oxygen泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.oxygenContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
