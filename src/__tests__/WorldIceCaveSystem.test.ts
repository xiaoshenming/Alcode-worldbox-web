import { describe, it, expect, beforeEach } from 'vitest'
import { WorldIceCaveSystem } from '../systems/WorldIceCaveSystem'
import type { IceCaveZone } from '../systems/WorldIceCaveSystem'

function makeSys(): WorldIceCaveSystem { return new WorldIceCaveSystem() }
let nextId = 1
function makeZone(): IceCaveZone {
  return { id: nextId++, x: 5, y: 10, temperature: -15, iceThickness: 20, crystalFormation: 50, stability: 75, tick: 0 }
}

describe('WorldIceCaveSystem.getZones', () => {
  let sys: WorldIceCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰洞', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('冰洞字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.temperature).toBe(-15)
    expect(z.iceThickness).toBe(20)
    expect(z.stability).toBe(75)
  })
  it('多个冰洞全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
