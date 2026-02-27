import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTinSpringSystem } from '../systems/WorldTinSpringSystem'
import type { TinSpringZone } from '../systems/WorldTinSpringSystem'

function makeSys(): WorldTinSpringSystem { return new WorldTinSpringSystem() }
let nextId = 1
function makeZone(): TinSpringZone {
  return { id: nextId++, x: 20, y: 30, tinContent: 40, springFlow: 50, tick: 0 } as TinSpringZone
}

describe('WorldTinSpringSystem.getZones', () => {
  let sys: WorldTinSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Tin泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Tin泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.tinContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
