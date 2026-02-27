import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTelluriumSpringSystem } from '../systems/WorldTelluriumSpringSystem'
import type { TelluriumSpringZone } from '../systems/WorldTelluriumSpringSystem'

function makeSys(): WorldTelluriumSpringSystem { return new WorldTelluriumSpringSystem() }
let nextId = 1
function makeZone(): TelluriumSpringZone {
  return { id: nextId++, x: 20, y: 30, telluriumContent: 40, springFlow: 50, tick: 0 } as TelluriumSpringZone
}

describe('WorldTelluriumSpringSystem.getZones', () => {
  let sys: WorldTelluriumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Tellurium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Tellurium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.telluriumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
