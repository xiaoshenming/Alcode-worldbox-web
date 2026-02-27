import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSamariumSpringSystem } from '../systems/WorldSamariumSpringSystem'
import type { SamariumSpringZone } from '../systems/WorldSamariumSpringSystem'

function makeSys(): WorldSamariumSpringSystem { return new WorldSamariumSpringSystem() }
let nextId = 1
function makeZone(): SamariumSpringZone {
  return { id: nextId++, x: 20, y: 30, samariumContent: 40, springFlow: 50, tick: 0 } as SamariumSpringZone
}

describe('WorldSamariumSpringSystem.getZones', () => {
  let sys: WorldSamariumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Samarium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Samarium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.samariumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
