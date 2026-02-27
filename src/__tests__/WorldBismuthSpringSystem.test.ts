import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBismuthSpringSystem } from '../systems/WorldBismuthSpringSystem'
import type { BismuthSpringZone } from '../systems/WorldBismuthSpringSystem'

function makeSys(): WorldBismuthSpringSystem { return new WorldBismuthSpringSystem() }
let nextId = 1
function makeZone(): BismuthSpringZone {
  return { id: nextId++, x: 20, y: 30, bismuthContent: 40, springFlow: 50, tick: 0 } as BismuthSpringZone
}

describe('WorldBismuthSpringSystem.getZones', () => {
  let sys: WorldBismuthSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Bismuth泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Bismuth泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.bismuthContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Bismuth泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
