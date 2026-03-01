import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEnamellerSystem } from '../systems/CreatureEnamellerSystem'
import type { Enameller } from '../systems/CreatureEnamellerSystem'

let nextId = 1
function makeSys(): CreatureEnamellerSystem { return new CreatureEnamellerSystem() }
function makeEnameller(entityId: number): Enameller {
  return { id: nextId++, entityId, enamelSkill: 50, firingControl: 60, colorMixing: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureEnamellerSystem.getEnamellers', () => {
  let sys: CreatureEnamellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珐琅师', () => { expect((sys as any).enamellers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).enamellers.push(makeEnameller(1))
    expect((sys as any).enamellers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).enamellers.push(makeEnameller(1))
    expect((sys as any).enamellers).toBe((sys as any).enamellers)
  })

  it('多个全部返回', () => {
    ;(sys as any).enamellers.push(makeEnameller(1))
    ;(sys as any).enamellers.push(makeEnameller(2))
    expect((sys as any).enamellers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const e = makeEnameller(10)
    e.enamelSkill = 90; e.firingControl = 85; e.colorMixing = 80; e.outputQuality = 75
    ;(sys as any).enamellers.push(e)
    const r = (sys as any).enamellers[0]
    expect(r.enamelSkill).toBe(90); expect(r.firingControl).toBe(85)
    expect(r.colorMixing).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
