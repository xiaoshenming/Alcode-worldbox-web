import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCaesiumSpringSystem } from '../systems/WorldCaesiumSpringSystem'
import type { CaesiumSpringZone } from '../systems/WorldCaesiumSpringSystem'

function makeSys(): WorldCaesiumSpringSystem { return new WorldCaesiumSpringSystem() }
let nextId = 1
function makeZone(): CaesiumSpringZone {
  return { id: nextId++, x: 20, y: 30, caesiumContent: 40, springFlow: 50, tick: 0 } as CaesiumSpringZone
}

describe('WorldCaesiumSpringSystem.getZones', () => {
  let sys: WorldCaesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Caesium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Caesium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.caesiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Caesium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
