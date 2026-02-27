import { describe, it, expect, beforeEach } from 'vitest'
import { WorldZincSpringSystem } from '../systems/WorldZincSpringSystem'
import type { ZincSpringZone } from '../systems/WorldZincSpringSystem'

function makeSys(): WorldZincSpringSystem { return new WorldZincSpringSystem() }
let nextId = 1
function makeZone(): ZincSpringZone {
  return { id: nextId++, x: 20, y: 30, zincContent: 40, springFlow: 50, tick: 0 } as ZincSpringZone
}

describe('WorldZincSpringSystem.getZones', () => {
  let sys: WorldZincSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Zinc泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Zinc泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.zincContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
