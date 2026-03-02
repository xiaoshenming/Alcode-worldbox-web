import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCardingMakersSystem } from '../systems/CreatureCardingMakersSystem'
import type { CardingMaker } from '../systems/CreatureCardingMakersSystem'

let nextId = 1
function makeSys(): CreatureCardingMakersSystem { return new CreatureCardingMakersSystem() }
function makeMaker(entityId: number, combingSkill = 30, fiberAlignment = 25, batchSize = 20, qualityGrade = 35, tick = 0): CardingMaker {
  return { id: nextId++, entityId, combingSkill, fiberAlignment, batchSize, qualityGrade, tick }
}

const fakeEm = {} as any

describe('CreatureCardingMakersSystem', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无梳棉师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const m = makeMaker(10, 80, 75, 70, 65)
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0] as CardingMaker
    expect(r.combingSkill).toBe(80)
    expect(r.fiberAlignment).toBe(75)
    expect(r.batchSize).toBe(70)
    expect(r.qualityGrade).toBe(65)
  })

  // 5. tick 差值 < 2490 时不更新 lastCheck
  it('tick差值<2490时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2489)
    expect((sys as any).lastCheck).toBe(5000)
  })

  // 6. tick 差值 >= 2490 时更新 lastCheck
  it('tick差值>=2490时更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2490)
    expect((sys as any).lastCheck).toBe(7490)
  })

  // 7. update 后 combingSkill+0.02
  it('update后combingSkill增加0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.02)
  })

  // 8. update 后 fiberAlignment+0.015
  it('update后fiberAlignment增加0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].fiberAlignment).toBeCloseTo(40.015)
  })

  // 9. combingSkill 上限为 100
  it('combingSkill上限100：初始99.99→100', () => {
    ;(sys as any).makers.push(makeMaker(1, 99.99, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(100)
  })

  // 10. cleanup: combingSkill<=4时删除（3.98+0.02=4.00，边界被删；entityId=2保留）
  it('cleanup: combingSkill<=4的记录被删除，>4的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98, 40, 20, 35)) // 3.98+0.02=4.00 <=4 → 删除
    ;(sys as any).makers.push(makeMaker(2, 4.01, 40, 20, 35)) // 4.01+0.02=4.03 >4 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})
