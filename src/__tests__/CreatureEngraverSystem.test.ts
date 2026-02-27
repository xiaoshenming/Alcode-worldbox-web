import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEngraverSystem } from '../systems/CreatureEngraverSystem'
import type { Engraver } from '../systems/CreatureEngraverSystem'

let nextId = 1
function makeSys(): CreatureEngraverSystem { return new CreatureEngraverSystem() }
function makeEngraver(entityId: number): Engraver {
  return { id: nextId++, entityId, engravingSkill: 50, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 }
}

describe('CreatureEngraverSystem.getEngravers', () => {
  let sys: CreatureEngraverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雕刻师', () => { expect(sys.getEngravers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    expect(sys.getEngravers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    expect(sys.getEngravers()).toBe((sys as any).engravers)
  })

  it('多个全部返回', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    ;(sys as any).engravers.push(makeEngraver(2))
    expect(sys.getEngravers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const e = makeEngraver(10)
    e.engravingSkill = 90; e.burinControl = 85; e.lineDepth = 80; e.detailPrecision = 75
    ;(sys as any).engravers.push(e)
    const r = sys.getEngravers()[0]
    expect(r.engravingSkill).toBe(90); expect(r.burinControl).toBe(85)
    expect(r.lineDepth).toBe(80); expect(r.detailPrecision).toBe(75)
  })
})
