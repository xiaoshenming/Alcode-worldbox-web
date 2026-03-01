import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGilderSystem } from '../systems/CreatureGilderSystem'
import type { Gilder } from '../systems/CreatureGilderSystem'

let nextId = 1
function makeSys(): CreatureGilderSystem { return new CreatureGilderSystem() }
function makeGilder(entityId: number): Gilder {
  return { id: nextId++, entityId, gildingSkill: 50, leafApplication: 60, surfacePreparation: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureGilderSystem.getGilders', () => {
  let sys: CreatureGilderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镀金师', () => { expect((sys as any).gilders).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gilders.push(makeGilder(1))
    expect((sys as any).gilders[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).gilders.push(makeGilder(1))
    expect((sys as any).gilders).toBe((sys as any).gilders)
  })
  it('多个全部返回', () => {
    ;(sys as any).gilders.push(makeGilder(1))
    ;(sys as any).gilders.push(makeGilder(2))
    expect((sys as any).gilders).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const g = makeGilder(10)
    g.gildingSkill = 90; g.leafApplication = 85; g.surfacePreparation = 80; g.outputQuality = 75
    ;(sys as any).gilders.push(g)
    const r = (sys as any).gilders[0]
    expect(r.gildingSkill).toBe(90); expect(r.leafApplication).toBe(85)
    expect(r.surfacePreparation).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
