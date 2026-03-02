import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGirdlerSystem } from '../systems/CreatureGirdlerSystem'
import type { Girdler } from '../systems/CreatureGirdlerSystem'

let nextId = 1
function makeSys(): CreatureGirdlerSystem { return new CreatureGirdlerSystem() }
function makeGirdler(entityId: number, overrides: Partial<Girdler> = {}): Girdler {
  return {
    id: nextId++,
    entityId,
    leatherCutting: 50,
    buckleMaking: 60,
    stitchWork: 70,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureGirdlerSystem', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无腰带匠', () => {
    expect((sys as any).girdlers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).girdlers.push(makeGirdler(42))
    expect((sys as any).girdlers[0].entityId).toBe(42)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    ;(sys as any).girdlers.push(makeGirdler(2))
    ;(sys as any).girdlers.push(makeGirdler(3))
    expect((sys as any).girdlers).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整（leatherCutting/stitchWork/buckleMaking/outputQuality）', () => {
    const g = makeGirdler(10, { leatherCutting: 90, buckleMaking: 85, stitchWork: 80, outputQuality: 75 })
    ;(sys as any).girdlers.push(g)
    const r = (sys as any).girdlers[0]
    expect(r.leatherCutting).toBe(90)
    expect(r.buckleMaking).toBe(85)
    expect(r.stitchWork).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  // 5. tick差值<2610不更新lastCheck
  it('tick差值<2610不调用update逻辑（lastCheck不变）', () => {
    ;(sys as any).lastCheck = 5000
    const em = {} as any
    sys.update(0, em, 5000 + 2609)
    expect((sys as any).lastCheck).toBe(5000)
  })

  // 6. tick差值>=2610更新lastCheck
  it('tick差值>=2610时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    const em = {} as any
    sys.update(0, em, 1000 + 2610)
    expect((sys as any).lastCheck).toBe(3610)
  })

  // 7. update后leatherCutting+0.02
  it('update后leatherCutting增加0.02', () => {
    const g = makeGirdler(1, { leatherCutting: 50 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.02)
  })

  // 8. update后stitchWork+0.015
  it('update后stitchWork增加0.015', () => {
    const g = makeGirdler(1, { stitchWork: 60 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].stitchWork).toBeCloseTo(60.015)
  })

  // 9. leatherCutting上限100
  it('leatherCutting不超过100（上限钳制）', () => {
    const g = makeGirdler(1, { leatherCutting: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBe(100)
  })

  // 10. outputQuality上限100
  it('outputQuality不超过100（上限钳制）', () => {
    const g = makeGirdler(1, { outputQuality: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].outputQuality).toBe(100)
  })

  // 11. cleanup: leatherCutting<=4时删除（先递增后cleanup）
  // 3.98+0.02=4.00, <=4 → 被删除
  it('cleanup: leatherCutting 3.98+0.02=4.00 恰好<=4被删除', () => {
    const g = makeGirdler(1, { leatherCutting: 3.98 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    // 3.98 + 0.02 = 4.00, <=4 → deleted
    expect((sys as any).girdlers).toHaveLength(0)
  })

  // 12. cleanup: leatherCutting>4时保留（entityId=2保留）
  it('cleanup: leatherCutting 4.02+0.02=4.04 >4保留', () => {
    const g1 = makeGirdler(1, { leatherCutting: 3.98 }) // 3.98+0.02=4.00 → deleted
    const g2 = makeGirdler(2, { leatherCutting: 4.02 }) // 4.02+0.02=4.04 → kept
    ;(sys as any).girdlers.push(g1, g2)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
    expect((sys as any).girdlers[0].entityId).toBe(2)
  })

  // 13. nextId初始值为1
  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // 14. stitchWork上限100
  it('stitchWork不超过100（上限钳制）', () => {
    const g = makeGirdler(1, { stitchWork: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].stitchWork).toBe(100)
  })

  // 15. 批量update：多个girdler同时更新
  it('多个腰带匠的技能同时增长', () => {
    ;(sys as any).girdlers.push(makeGirdler(1, { leatherCutting: 50, stitchWork: 60 }))
    ;(sys as any).girdlers.push(makeGirdler(2, { leatherCutting: 70, stitchWork: 80 }))
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.02)
    expect((sys as any).girdlers[1].leatherCutting).toBeCloseTo(70.02)
  })
})
