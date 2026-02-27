import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBoronSpringSystem } from '../systems/WorldBoronSpringSystem'
import type { BoronSpringZone } from '../systems/WorldBoronSpringSystem'

function makeSys(): WorldBoronSpringSystem { return new WorldBoronSpringSystem() }
let nextId = 1
function makeZone(): BoronSpringZone {
  return { id: nextId++, x: 20, y: 30, boronContent: 40, springFlow: 50, tick: 0 } as BoronSpringZone
}

describe('WorldBoronSpringSystem.getZones', () => {
  let sys: WorldBoronSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Boron泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Boron泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.boronContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Boron泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
