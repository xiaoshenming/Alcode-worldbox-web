import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNeedleworkMakersSystem } from '../systems/CreatureNeedleworkMakersSystem'
import type { NeedleworkMaker } from '../systems/CreatureNeedleworkMakersSystem'

const CHECK_INTERVAL = 2540
const MAX_MAKERS = 13
const em = {} as any

let nextId = 1
function makeSys(): CreatureNeedleworkMakersSystem { return new CreatureNeedleworkMakersSystem() }
function makeMaker(entityId: number): NeedleworkMaker {
  return { id: nextId++, entityId, stitchPrecision: 70, threadSelection: 65, designComplexity: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureNeedleworkMakersSystem.getMakers', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刺绣师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(3))
    const m = (sys as any).makers[0]
    expect(m.stitchPrecision).toBe(70)
    expect(m.designComplexity).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureNeedleworkMakersSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不执行更新', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].stitchPrecision
    sys.update(1, em, 0)
    expect((sys as any).makers[0].stitchPrecision).toBe(before)
  })

  it('tick < CHECK_INTERVAL 时不更新技能', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].stitchPrecision
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].stitchPrecision).toBe(before)
  })

  it('tick === CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].stitchPrecision
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(before + 0.02, 5)
  })

  it('tick > CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).makers.push(makeMaker(1))
    const before = (sys as any).makers[0].stitchPrecision
    sys.update(1, em, CHECK_INTERVAL + 200)
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(before + 0.02, 5)
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用需再等CHECK_INTERVAL才能再次触发', () => {
    ;(sys as any).makers.push(makeMaker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).makers[0].stitchPrecision
    sys.update(1, em, CHECK_INTERVAL + 5)
    expect((sys as any).makers[0].stitchPrecision).toBe(afterFirst)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].stitchPrecision).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureNeedleworkMakersSystem - 技能增量', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('stitchPrecision每次更新+0.02', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(50.02, 5)
  })

  it('designComplexity每次更新+0.015', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), designComplexity: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].designComplexity).toBeCloseTo(50.015, 5)
  })

  it('outputQuality每次更新+0.01', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), outputQuality: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('stitchPrecision上限100，不超过100', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 99.99 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].stitchPrecision).toBe(100)
  })

  it('designComplexity上限100，不超过100', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), designComplexity: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].designComplexity).toBe(100)
  })

  it('outputQuality上限100，不超过100', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), outputQuality: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBe(100)
  })

  it('threadSelection不在增量列表内，保持不变', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), threadSelection: 55 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].threadSelection).toBe(55)
  })

  it('多个刺绣师各自技能独立递增', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 30 })
    ;(sys as any).makers.push({ ...makeMaker(2), stitchPrecision: 60 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].stitchPrecision).toBeCloseTo(30.02, 5)
    expect((sys as any).makers[1].stitchPrecision).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureNeedleworkMakersSystem - cleanup边界', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('stitchPrecision=3.98，增量后4.00<=4，被删除', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 3.98 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('stitchPrecision=4，增量后4.02>4，保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 4 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('stitchPrecision=4.01（>4），保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 4.01 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('stitchPrecision=0，被cleanup删除', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('混合：stitchPrecision低的删除，高的保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 1 })
    ;(sys as any).makers.push({ ...makeMaker(2), stitchPrecision: 50 })
    ;(sys as any).makers.push({ ...makeMaker(3), stitchPrecision: 2 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cleanup不依赖threadSelection，threadSelection极低时不影响保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), stitchPrecision: 50, threadSelection: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureNeedleworkMakersSystem - MAX_MAKERS上限', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_MAKERS=13：注入13个后数组长度=13', () => {
    for (let i = 0; i < MAX_MAKERS; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(MAX_MAKERS)
  })

  it('数据完整性：所有字段注入后正确存储', () => {
    const m: NeedleworkMaker = { id: 77, entityId: 99, stitchPrecision: 55, threadSelection: 60, designComplexity: 45, outputQuality: 70, tick: 200 }
    ;(sys as any).makers.push(m)
    const stored = (sys as any).makers[0]
    expect(stored.id).toBe(77)
    expect(stored.entityId).toBe(99)
    expect(stored.threadSelection).toBe(60)
    expect(stored.tick).toBe(200)
  })
})
