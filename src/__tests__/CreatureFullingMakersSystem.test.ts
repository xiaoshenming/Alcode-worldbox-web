import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFullingMakersSystem } from '../systems/CreatureFullingMakersSystem'
import type { FullingMaker } from '../systems/CreatureFullingMakersSystem'

let nextId = 1
function makeSys(): CreatureFullingMakersSystem { return new CreatureFullingMakersSystem() }
function makeMaker(entityId: number, poundingForce = 50): FullingMaker {
  return { id: nextId++, entityId, poundingForce, clothDensity: 60, shrinkageControl: 70, finishQuality: 80, tick: 0 }
}

describe('CreatureFullingMakersSystem', () => {
  let sys: CreatureFullingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缩绒工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10)
    m.poundingForce = 90; m.clothDensity = 85; m.shrinkageControl = 80; m.finishQuality = 75
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.poundingForce).toBe(90)
    expect(r.clothDensity).toBe(85)
    expect(r.shrinkageControl).toBe(80)
    expect(r.finishQuality).toBe(75)
  })

  it('tick差值<2530不触发更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3529)  // 3529 - 1000 = 2529 < 2530
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2530更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3530)  // 3530 - 1000 = 2530 >= 2530
    expect((sys as any).lastCheck).toBe(3530)
  })

  it('update后poundingForce+0.02', () => {
    const m = makeMaker(1, 50)
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2530)
    expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.02, 5)
  })

  it('update后clothDensity+0.015', () => {
    const m = makeMaker(1, 50)
    m.clothDensity = 60
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2530)
    expect((sys as any).makers[0].clothDensity).toBeCloseTo(60.015, 5)
  })

  it('update后finishQuality+0.01', () => {
    const m = makeMaker(1, 50)
    m.finishQuality = 80
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2530)
    expect((sys as any).makers[0].finishQuality).toBeCloseTo(80.01, 5)
  })

  it('poundingForce上限100', () => {
    const m = makeMaker(1, 99.99)
    ;(sys as any).makers.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2530)
    expect((sys as any).makers[0].poundingForce).toBe(100)
  })

  it('cleanup: poundingForce<=4时删除，>4时保留', () => {
    // entityId=1: poundingForce=3.98, after +0.02 => 4.00 <= 4 => 删除
    const m1 = makeMaker(1, 3.98)
    // entityId=2: poundingForce=4.01, after +0.02 => 4.03 > 4 => 保留
    const m2 = makeMaker(2, 4.01)
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2530)
    const remaining = (sys as any).makers
    expect(remaining.some((m: FullingMaker) => m.entityId === 1)).toBe(false)
    expect(remaining.some((m: FullingMaker) => m.entityId === 2)).toBe(true)
  })
})
