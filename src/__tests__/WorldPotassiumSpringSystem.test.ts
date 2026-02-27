import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPotassiumSpringSystem } from '../systems/WorldPotassiumSpringSystem'
import type { PotassiumSpringZone } from '../systems/WorldPotassiumSpringSystem'

function makeSys(): WorldPotassiumSpringSystem { return new WorldPotassiumSpringSystem() }
let nextId = 1
function makeZone(): PotassiumSpringZone {
  return { id: nextId++, x: 20, y: 30, potassiumContent: 40, springFlow: 50, tick: 0 } as PotassiumSpringZone
}

describe('WorldPotassiumSpringSystem.getZones', () => {
  let sys: WorldPotassiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Potassium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Potassium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.potassiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
