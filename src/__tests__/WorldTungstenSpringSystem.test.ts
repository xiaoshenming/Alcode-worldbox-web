import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTungstenSpringSystem } from '../systems/WorldTungstenSpringSystem'
import type { TungstenSpringZone } from '../systems/WorldTungstenSpringSystem'

function makeSys(): WorldTungstenSpringSystem { return new WorldTungstenSpringSystem() }
let nextId = 1
function makeZone(): TungstenSpringZone {
  return { id: nextId++, x: 20, y: 30, tungstenContent: 40, springFlow: 50, tick: 0 } as TungstenSpringZone
}

describe('WorldTungstenSpringSystem.getZones', () => {
  let sys: WorldTungstenSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Tungsten泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Tungsten泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.tungstenContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
