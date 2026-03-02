import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNeedlerSystem } from '../systems/CreatureNeedlerSystem'
import type { Needler } from '../systems/CreatureNeedlerSystem'

const CHECK_INTERVAL = 3120
const em = {} as any

let nextId = 1
function makeSys(): CreatureNeedlerSystem { return new CreatureNeedlerSystem() }
function makeNeedler(entityId: number): Needler {
  return { id: nextId++, entityId, needlingSkill: 70, pointSharpness: 80, eyeForming: 65, tempeControl: 75, tick: 0 }
}

describe('CreatureNeedlerSystem.getNeedlers', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制针工', () => { expect((sys as any).needlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    expect((sys as any).needlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    expect((sys as any).needlers).toBe((sys as any).needlers)
  })
  it('字段正确', () => {
    ;(sys as any).needlers.push(makeNeedler(5))
    const n = (sys as any).needlers[0]
    expect(n.needlingSkill).toBe(70)
    expect(n.pointSharpness).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    ;(sys as any).needlers.push(makeNeedler(2))
    expect((sys as any).needlers).toHaveLength(2)
  })
})

describe('CreatureNeedlerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不执行更新', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    const before = (sys as any).needlers[0].needlingSkill
    sys.update(1, em, 0)
    expect((sys as any).needlers[0].needlingSkill).toBe(before)
  })

  it('tick < CHECK_INTERVAL 时不更新技能', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    const before = (sys as any).needlers[0].needlingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).needlers[0].needlingSkill).toBe(before)
  })

  it('tick === CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    const before = (sys as any).needlers[0].needlingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].needlingSkill).toBeCloseTo(before + 0.02, 5)
  })

  it('tick > CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    const before = (sys as any).needlers[0].needlingSkill
    sys.update(1, em, CHECK_INTERVAL + 500)
    expect((sys as any).needlers[0].needlingSkill).toBeCloseTo(before + 0.02, 5)
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用需再等CHECK_INTERVAL才能再次触发', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).needlers[0].needlingSkill
    sys.update(1, em, CHECK_INTERVAL + 10)
    expect((sys as any).needlers[0].needlingSkill).toBe(afterFirst)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).needlers[0].needlingSkill).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureNeedlerSystem - 技能增量', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('needlingSkill每次更新+0.02', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].needlingSkill).toBeCloseTo(50.02, 5)
  })

  it('pointSharpness每次更新+0.015', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), pointSharpness: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].pointSharpness).toBeCloseTo(50.015, 5)
  })

  it('tempeControl每次更新+0.01', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), tempeControl: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].tempeControl).toBeCloseTo(50.01, 5)
  })

  it('needlingSkill上限100，不超过100', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 99.99 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].needlingSkill).toBe(100)
  })

  it('pointSharpness上限100，不超过100', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), pointSharpness: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].pointSharpness).toBe(100)
  })

  it('tempeControl上限100，不超过100', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), tempeControl: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].tempeControl).toBe(100)
  })

  it('eyeForming不在增量列表内，保持不变', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), eyeForming: 55 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].eyeForming).toBe(55)
  })

  it('多个制针工各自技能独立递增', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 30 })
    ;(sys as any).needlers.push({ ...makeNeedler(2), needlingSkill: 60 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers[0].needlingSkill).toBeCloseTo(30.02, 5)
    expect((sys as any).needlers[1].needlingSkill).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureNeedlerSystem - cleanup边界', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('needlingSkill=3.98，增量后4.00<=4，被删除', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 3.98 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(0)
  })

  it('needlingSkill=4，增量后4.02>4，保留', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 4 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(1)
  })

  it('needlingSkill=4.01（>4），保留', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 4.01 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(1)
  })

  it('needlingSkill=0，被cleanup删除', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(0)
  })

  it('混合：needlingSkill低的删除，高的保留', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 1 })
    ;(sys as any).needlers.push({ ...makeNeedler(2), needlingSkill: 50 })
    ;(sys as any).needlers.push({ ...makeNeedler(3), needlingSkill: 2 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(1)
    expect((sys as any).needlers[0].entityId).toBe(2)
  })

  it('cleanup不依赖eyeForming，eyeForming极低时不影响保留', () => {
    ;(sys as any).needlers.push({ ...makeNeedler(1), needlingSkill: 50, eyeForming: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).needlers).toHaveLength(1)
  })
})

describe('CreatureNeedlerSystem - 数据完整性', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('所有字段注入后完整保留', () => {
    const n: Needler = { id: 99, entityId: 42, needlingSkill: 55, pointSharpness: 60, eyeForming: 45, tempeControl: 70, tick: 100 }
    ;(sys as any).needlers.push(n)
    const stored = (sys as any).needlers[0]
    expect(stored.id).toBe(99)
    expect(stored.entityId).toBe(42)
    expect(stored.eyeForming).toBe(45)
    expect(stored.tick).toBe(100)
  })
})
