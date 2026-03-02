import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEngraverSystem } from '../systems/CreatureEngraverSystem'
import type { Engraver } from '../systems/CreatureEngraverSystem'

let nextId = 1
function makeSys(): CreatureEngraverSystem { return new CreatureEngraverSystem() }
function makeEngraver(entityId: number, engravingSkill = 50): Engraver {
  return { id: nextId++, entityId, engravingSkill, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 }
}

const mockEm = {} as any

describe('CreatureEngraverSystem', () => {
  let sys: CreatureEngraverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雕刻师', () => {
    expect((sys as any).engravers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    expect((sys as any).engravers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    ;(sys as any).engravers.push(makeEngraver(2))
    expect((sys as any).engravers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const e = makeEngraver(10)
    e.engravingSkill = 90; e.burinControl = 85; e.lineDepth = 80; e.detailPrecision = 75
    ;(sys as any).engravers.push(e)
    const r = (sys as any).engravers[0]
    expect(r.engravingSkill).toBe(90)
    expect(r.burinControl).toBe(85)
    expect(r.lineDepth).toBe(80)
    expect(r.detailPrecision).toBe(75)
  })

  it('tick差值<3300时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, mockEm, 4299) // 4299-1000=3299 < 3300
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=3300时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    // mock em to avoid errors
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(16, em, 4300) // 4300-1000=3300 >= 3300
    expect((sys as any).lastCheck).toBe(4300)
  })

  it('update后engravingSkill+0.02', () => {
    ;(sys as any).engravers.push(makeEngraver(1, 50))
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(16, em, 3300)
    expect((sys as any).engravers[0].engravingSkill).toBeCloseTo(50.02)
  })

  it('update后burinControl+0.015', () => {
    ;(sys as any).engravers.push({ ...makeEngraver(1, 50), burinControl: 60 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 3300)
    expect((sys as any).engravers[0].burinControl).toBeCloseTo(60.015)
  })

  it('engravingSkill上限100', () => {
    ;(sys as any).engravers.push(makeEngraver(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 3300)
    expect((sys as any).engravers[0].engravingSkill).toBe(100)
  })

  it('detailPrecision+0.01', () => {
    const e = makeEngraver(1, 50)
    e.detailPrecision = 80
    ;(sys as any).engravers.push(e)
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 3300)
    expect((sys as any).engravers[0].detailPrecision).toBeCloseTo(80.01)
  })

  it('cleanup: engravingSkill<=4时删除', () => {
    // entityId=1 engravingSkill=3.98，+0.02=4.00 -> <=4 -> 删除
    ;(sys as any).engravers.push({ id: 1, entityId: 1, engravingSkill: 3.98, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
    // entityId=2 engravingSkill=10 -> 保留
    ;(sys as any).engravers.push({ id: 2, entityId: 2, engravingSkill: 10, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(16, mockEm, 3300)
    const engravers = (sys as any).engravers
    expect(engravers.some((e: Engraver) => e.entityId === 1)).toBe(false)
    expect(engravers.some((e: Engraver) => e.entityId === 2)).toBe(true)
  })

  it('engraver id字段正确', () => {
    const e = makeEngraver(5)
    ;(sys as any).engravers.push(e)
    expect((sys as any).engravers[0].id).toBe(e.id)
  })
})
