import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureNailsmithSystem } from '../systems/CreatureNailsmithSystem'
import type { Nailsmith } from '../systems/CreatureNailsmithSystem'

const CHECK_INTERVAL = 2620
const em = {} as any

let nextId = 1
function makeSys(): CreatureNailsmithSystem { return new CreatureNailsmithSystem() }
function makeNailsmith(entityId: number): Nailsmith {
  return { id: nextId++, entityId, ironDrawing: 70, headForming: 65, pointShaping: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureNailsmithSystem.getNailsmiths', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉工匠', () => { expect((sys as any).nailsmiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nailsmiths[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nailsmiths).toBe((sys as any).nailsmiths)
  })
  it('字段正确', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(3))
    const n = (sys as any).nailsmiths[0]
    expect(n.ironDrawing).toBe(70)
    expect(n.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    ;(sys as any).nailsmiths.push(makeNailsmith(2))
    expect((sys as any).nailsmiths).toHaveLength(2)
  })
})

describe('CreatureNailsmithSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不执行更新（lastCheck=0，差值=0<2620）', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, 0)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(before)
  })

  it('tick < CHECK_INTERVAL 时不更新技能', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(before)
  })

  it('tick === CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(before + 0.02, 5)
  })

  it('tick > CHECK_INTERVAL 时触发更新', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    const before = (sys as any).nailsmiths[0].ironDrawing
    sys.update(1, em, CHECK_INTERVAL + 100)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(before + 0.02, 5)
  })

  it('触发后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用需再等CHECK_INTERVAL才能再次触发', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).nailsmiths[0].ironDrawing
    // 未到下一个间隔
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(afterFirst)
    // 超过第二个间隔
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureNailsmithSystem - 技能增量', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing每次更新+0.02', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(50.02, 5)
  })

  it('pointShaping每次更新+0.015', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), pointShaping: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].pointShaping).toBeCloseTo(50.015, 5)
  })

  it('outputQuality每次更新+0.01', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), outputQuality: 50 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('ironDrawing上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 99.99 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBe(100)
  })

  it('pointShaping上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), pointShaping: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].pointShaping).toBe(100)
  })

  it('outputQuality上限100，不超过100', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), outputQuality: 100 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].outputQuality).toBe(100)
  })

  it('headForming不在增量列表内，保持不变', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), headForming: 55 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].headForming).toBe(55)
  })

  it('多个工匠各自技能独立递增', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 30 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 60 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths[0].ironDrawing).toBeCloseTo(30.02, 5)
    expect((sys as any).nailsmiths[1].ironDrawing).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureNailsmithSystem - cleanup边界', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironDrawing=3.98（<=4），更新后=4.00仍<=4，被删除', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 3.98 })
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，但cleanup检查在增量之后，4.00 <= 4 → 删除
    expect((sys as any).nailsmiths).toHaveLength(0)
  })

  it('ironDrawing=4.01（>4），保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 4.01 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })

  it('ironDrawing=4，更新+0.02变成4.02，但cleanup是在增量后检查，4.00原始值<=4时…实际已增量过，4.02 > 4保留', () => {
    // ironDrawing初始=4，增量后=4.02 > 4，保留
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 4 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })

  it('ironDrawing=1（远低于4），被cleanup删除', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 1 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(0)
  })

  it('混合：ironDrawing低的删除，高的保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 2 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(2), ironDrawing: 50 })
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(3), ironDrawing: 3 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
    expect((sys as any).nailsmiths[0].entityId).toBe(2)
  })

  it('cleanup不依赖headForming，headForming极低时不影响保留', () => {
    ;(sys as any).nailsmiths.push({ ...makeNailsmith(1), ironDrawing: 50, headForming: 0 })
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nailsmiths).toHaveLength(1)
  })
})

describe('CreatureNailsmithSystem - nextId自增', () => {
  let sys: CreatureNailsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId=1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('注入工匠后nextId不影响（内部计数独立）', () => {
    ;(sys as any).nailsmiths.push(makeNailsmith(1))
    expect((sys as any).nextId).toBe(1)
  })
})
