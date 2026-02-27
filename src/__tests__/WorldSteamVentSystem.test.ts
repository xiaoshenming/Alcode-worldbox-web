import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSteamVentSystem } from '../systems/WorldSteamVentSystem'
import type { SteamVent } from '../systems/WorldSteamVentSystem'

function makeSys(): WorldSteamVentSystem { return new WorldSteamVentSystem() }
let nextId = 1
function makeVent(): SteamVent {
  return { id: nextId++, x: 25, y: 35, pressure: 70, steamVolume: 60, mineralContent: 40, eruptionCycle: 200, age: 2000, tick: 0 }
}

describe('WorldSteamVentSystem.getVents', () => {
  let sys: WorldSteamVentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蒸汽喷口', () => { expect(sys.getVents()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vents.push(makeVent())
    expect(sys.getVents()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getVents()).toBe((sys as any).vents)
  })
  it('蒸汽喷口字段正确', () => {
    ;(sys as any).vents.push(makeVent())
    const v = sys.getVents()[0]
    expect(v.pressure).toBe(70)
    expect(v.steamVolume).toBe(60)
    expect(v.eruptionCycle).toBe(200)
  })
  it('多个蒸汽喷口全部返回', () => {
    ;(sys as any).vents.push(makeVent())
    ;(sys as any).vents.push(makeVent())
    expect(sys.getVents()).toHaveLength(2)
  })
})
