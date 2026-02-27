import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPlatinumSpringSystem } from '../systems/WorldPlatinumSpringSystem'
import type { PlatinumSpringZone } from '../systems/WorldPlatinumSpringSystem'

function makeSys(): WorldPlatinumSpringSystem { return new WorldPlatinumSpringSystem() }
let nextId = 1
function makeZone(): PlatinumSpringZone {
  return { id: nextId++, x: 20, y: 30, platinumContent: 40, springFlow: 50, tick: 0 } as PlatinumSpringZone
}

describe('WorldPlatinumSpringSystem.getZones', () => {
  let sys: WorldPlatinumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Platinum泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Platinum泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.platinumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
