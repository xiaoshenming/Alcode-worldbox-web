import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFullingMakersSystem } from '../systems/CreatureFullingMakersSystem'
import type { FullingMaker } from '../systems/CreatureFullingMakersSystem'

let nextId = 1
function makeSys(): CreatureFullingMakersSystem { return new CreatureFullingMakersSystem() }
function makeMaker(entityId: number): FullingMaker {
  return { id: nextId++, entityId, poundingForce: 50, clothDensity: 60, shrinkageControl: 70, finishQuality: 80, tick: 0 }
}

describe('CreatureFullingMakersSystem.getMakers', () => {
  let sys: CreatureFullingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缩绒工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10)
    m.poundingForce = 90; m.clothDensity = 85; m.shrinkageControl = 80; m.finishQuality = 75
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.poundingForce).toBe(90); expect(r.clothDensity).toBe(85)
    expect(r.shrinkageControl).toBe(80); expect(r.finishQuality).toBe(75)
  })
})
