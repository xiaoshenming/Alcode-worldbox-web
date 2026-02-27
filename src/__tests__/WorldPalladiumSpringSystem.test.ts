import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPalladiumSpringSystem } from '../systems/WorldPalladiumSpringSystem'
import type { PalladiumSpringZone } from '../systems/WorldPalladiumSpringSystem'

function makeSys(): WorldPalladiumSpringSystem { return new WorldPalladiumSpringSystem() }
let nextId = 1
function makeZone(): PalladiumSpringZone {
  return { id: nextId++, x: 20, y: 30, palladiumContent: 40, springFlow: 50, tick: 0 } as PalladiumSpringZone
}

describe('WorldPalladiumSpringSystem.getZones', () => {
  let sys: WorldPalladiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Palladium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Palladium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.palladiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
