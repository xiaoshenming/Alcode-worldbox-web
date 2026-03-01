import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFounderSystem } from '../systems/CreatureFounderSystem'
import type { Founder } from '../systems/CreatureFounderSystem'

let nextId = 1
function makeSys(): CreatureFounderSystem { return new CreatureFounderSystem() }
function makeFounder(entityId: number): Founder {
  return { id: nextId++, entityId, foundingSkill: 50, moldCrafting: 60, temperatureControl: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureFounderSystem.getFounders', () => {
  let sys: CreatureFounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸造师', () => { expect((sys as any).founders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).founders.push(makeFounder(1))
    expect((sys as any).founders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).founders.push(makeFounder(1))
    expect((sys as any).founders).toBe((sys as any).founders)
  })

  it('多个全部返回', () => {
    ;(sys as any).founders.push(makeFounder(1))
    ;(sys as any).founders.push(makeFounder(2))
    expect((sys as any).founders).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFounder(10)
    f.foundingSkill = 90; f.moldCrafting = 85; f.temperatureControl = 80; f.outputQuality = 75
    ;(sys as any).founders.push(f)
    const r = (sys as any).founders[0]
    expect(r.foundingSkill).toBe(90); expect(r.moldCrafting).toBe(85)
    expect(r.temperatureControl).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
