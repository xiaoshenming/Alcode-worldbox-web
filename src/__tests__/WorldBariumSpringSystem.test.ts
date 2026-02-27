import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBariumSpringSystem } from '../systems/WorldBariumSpringSystem'
import type { BariumSpringZone } from '../systems/WorldBariumSpringSystem'

function makeSys(): WorldBariumSpringSystem { return new WorldBariumSpringSystem() }
let nextId = 1
function makeZone(): BariumSpringZone {
  return { id: nextId++, x: 20, y: 30, bariumContent: 40, springFlow: 50, tick: 0 } as BariumSpringZone
}

describe('WorldBariumSpringSystem.getZones', () => {
  let sys: WorldBariumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Barium泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Barium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.bariumContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Barium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
