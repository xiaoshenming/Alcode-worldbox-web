import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAluminumSpringSystem } from '../systems/WorldAluminumSpringSystem'
import type { AluminumSpringZone } from '../systems/WorldAluminumSpringSystem'

function makeSys(): WorldAluminumSpringSystem { return new WorldAluminumSpringSystem() }
let nextId = 1
function makeZone(): AluminumSpringZone {
  return { id: nextId++, x: 20, y: 30, aluminumContent: 30, springFlow: 50, bauxiteWeathering: 40, dissolvedAluminate: 20, tick: 0 }
}

describe('WorldAluminumSpringSystem.getZones', () => {
  let sys: WorldAluminumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铝泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('铝泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.aluminumContent).toBe(30)
    expect(z.bauxiteWeathering).toBe(40)
    expect(z.springFlow).toBe(50)
  })
})
