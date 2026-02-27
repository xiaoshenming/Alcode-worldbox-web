import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDewFormationSystem } from '../systems/WorldDewFormationSystem'
import type { DewZone } from '../systems/WorldDewFormationSystem'

function makeSys(): WorldDewFormationSystem { return new WorldDewFormationSystem() }
let nextId = 1
function makeDewZone(): DewZone {
  return { id: nextId++, x: 20, y: 30, moisture: 60, temperature: 5, duration: 100, evaporated: false, tick: 0 }
}

describe('WorldDewFormationSystem.getDewZones', () => {
  let sys: WorldDewFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无露水区', () => { expect(sys.getDewZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    expect(sys.getDewZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDewZones()).toBe((sys as any).dewZones)
  })
  it('露水区字段正确', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    const d = sys.getDewZones()[0]
    expect(d.moisture).toBe(60)
    expect(d.temperature).toBe(5)
    expect(d.evaporated).toBe(false)
  })
  it('多个露水区全部返回', () => {
    ;(sys as any).dewZones.push(makeDewZone())
    ;(sys as any).dewZones.push(makeDewZone())
    expect(sys.getDewZones()).toHaveLength(2)
  })
})
