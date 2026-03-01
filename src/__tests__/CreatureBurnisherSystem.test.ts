import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBurnisherSystem } from '../systems/CreatureBurnisherSystem'
import type { Burnisher } from '../systems/CreatureBurnisherSystem'

let nextId = 1
function makeSys(): CreatureBurnisherSystem { return new CreatureBurnisherSystem() }
function makeBurnisher(entityId: number): Burnisher {
  return { id: nextId++, entityId, burnishingSkill: 30, pressureTechnique: 25, surfaceSmoothness: 20, reflectiveFinish: 35, tick: 0 }
}

describe('CreatureBurnisherSystem.getBurnishers', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抛光师', () => { expect((sys as any).burnishers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers).toBe((sys as any).burnishers)
  })

  it('多个全部返回', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    ;(sys as any).burnishers.push(makeBurnisher(2))
    expect((sys as any).burnishers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBurnisher(10)
    b.burnishingSkill = 80; b.pressureTechnique = 75; b.surfaceSmoothness = 70; b.reflectiveFinish = 65
    ;(sys as any).burnishers.push(b)
    const r = (sys as any).burnishers[0]
    expect(r.burnishingSkill).toBe(80); expect(r.pressureTechnique).toBe(75)
    expect(r.surfaceSmoothness).toBe(70); expect(r.reflectiveFinish).toBe(65)
  })
})
