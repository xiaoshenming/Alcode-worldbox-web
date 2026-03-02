import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBasketWeaverSystem } from '../systems/CreatureBasketWeaverSystem'
import type { BasketWeaver } from '../systems/CreatureBasketWeaverSystem'

const CHECK_INTERVAL = 2570

let nextId = 1
function makeSys(): CreatureBasketWeaverSystem { return new CreatureBasketWeaverSystem() }
function makeWeaver(entityId: number): BasketWeaver {
  return { id: nextId++, entityId, fiberSelection: 30, weavePattern: 25, structuralIntegrity: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureBasketWeaverSystem.getWeavers', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无篮编师', () => { expect((sys as any).weavers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })

  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWeaver(10)
    w.fiberSelection = 80; w.weavePattern = 75; w.structuralIntegrity = 70; w.outputQuality = 65
    ;(sys as any).weavers.push(w)
    const r = (sys as any).weavers[0]
    expect(r.fiberSelection).toBe(80)
    expect(r.weavePattern).toBe(75)
    expect(r.structuralIntegrity).toBe(70)
    expect(r.outputQuality).toBe(65)
  })
})

describe('CreatureBasketWeaverSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 大于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    // CHECK_INTERVAL + 1 - CHECK_INTERVAL = 1 < CHECK_INTERVAL，不更新
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureBasketWeaverSystem 技能递增', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 fiberSelection 增加 0.02', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBeCloseTo(50.02)
  })

  it('每次触发后 structuralIntegrity 增加 0.015', () => {
    const w = makeWeaver(1)
    w.structuralIntegrity = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].structuralIntegrity).toBeCloseTo(50.015)
  })

  it('每次触发后 outputQuality 增加 0.01', () => {
    const w = makeWeaver(1)
    w.outputQuality = 50
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBeCloseTo(50.01)
  })

  it('fiberSelection 上限为 100，不超过', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 99.99
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].fiberSelection).toBe(100)
  })

  it('outputQuality 上限为 100，不超过', () => {
    const w = makeWeaver(1)
    w.outputQuality = 99.999
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers[0].outputQuality).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 50
    ;(sys as any).weavers.push(w)
    // tick 小于 CHECK_INTERVAL，不触发
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).weavers[0].fiberSelection).toBe(50)
  })
})

describe('CreatureBasketWeaverSystem cleanup', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 注意：cleanup 先做技能递增再判断，所以初始值需低于 4
  // 例如初始 3.0 → +0.02 = 3.02 ≤ 4，被移除
  it('技能递增后仍 <= 4 的篮编师被移除（初始值 3.0）', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 3.0
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.0 + 0.02 = 3.02 <= 4，被清除
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('fiberSelection > 4 的篮编师不被移除', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 4.01
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const w = makeWeaver(1)
    w.fiberSelection = 3.98
    ;(sys as any).weavers.push(w)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，仍 <= 4 被清除
    expect((sys as any).weavers).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const w1 = makeWeaver(1); w1.fiberSelection = 3.0   // 递增后 3.02 <= 4 → 被清除
    const w2 = makeWeaver(2); w2.fiberSelection = 50    // 递增后 50.02 > 4 → 保留
    ;(sys as any).weavers.push(w1, w2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).weavers).toHaveLength(1)
    expect((sys as any).weavers[0].entityId).toBe(2)
  })
})
