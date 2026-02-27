import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFluorineSpringSystem } from '../systems/WorldFluorineSpringSystem'
import type { FluorineSpringZone } from '../systems/WorldFluorineSpringSystem'

function makeSys(): WorldFluorineSpringSystem { return new WorldFluorineSpringSystem() }
let nextId = 1
function makeZone(): FluorineSpringZone {
  return { id: nextId++, x: 20, y: 30, fluorineContent: 40, springFlow: 50, tick: 0 } as FluorineSpringZone
}

describe('WorldFluorineSpringSystem.getZones', () => {
  let sys: WorldFluorineSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Fluorine泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Fluorine泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.fluorineContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
