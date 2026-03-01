import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureShipwrightSystem } from '../systems/CreatureShipwrightSystem'
import type { Shipwright, VesselType } from '../systems/CreatureShipwrightSystem'

let nextId = 1
function makeSys(): CreatureShipwrightSystem { return new CreatureShipwrightSystem() }
function makeShipwright(entityId: number, type: VesselType = 'canoe'): Shipwright {
  return { id: nextId++, entityId, skill: 70, vesselsBuilt: 5, vesselType: type, seaworthiness: 75, repairsDone: 10, tick: 0 }
}

describe('CreatureShipwrightSystem.getShipwrights', () => {
  let sys: CreatureShipwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无造船工', () => { expect((sys as any).shipwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1, 'galley'))
    expect((sys as any).shipwrights[0].vesselType).toBe('galley')
  })
  it('返回内部引用', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1))
    expect((sys as any).shipwrights).toBe((sys as any).shipwrights)
  })
  it('支持所有4种船只类型', () => {
    const types: VesselType[] = ['canoe', 'galley', 'caravel', 'warship']
    types.forEach((t, i) => { ;(sys as any).shipwrights.push(makeShipwright(i + 1, t)) })
    const all = (sys as any).shipwrights
    types.forEach((t, i) => { expect(all[i].vesselType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1))
    ;(sys as any).shipwrights.push(makeShipwright(2))
    expect((sys as any).shipwrights).toHaveLength(2)
  })
})
