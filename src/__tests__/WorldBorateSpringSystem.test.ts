import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBorateSpringSystem } from '../systems/WorldBorateSpringSystem'
import type { BorateSpringZone } from '../systems/WorldBorateSpringSystem'

function makeSys(): WorldBorateSpringSystem { return new WorldBorateSpringSystem() }
let nextId = 1
function makeZone(): BorateSpringZone {
  return { id: nextId++, x: 20, y: 30, borateContent: 40, springFlow: 50, tick: 0 } as BorateSpringZone
}

describe('WorldBorateSpringSystem.getZones', () => {
  let sys: WorldBorateSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Borate泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Borate泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.borateContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Borate泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
