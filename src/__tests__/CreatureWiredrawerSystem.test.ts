import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureWiredrawerSystem } from '../systems/CreatureWiredrawerSystem'
import type { Wiredrawer } from '../systems/CreatureWiredrawerSystem'

let nextId = 1
function makeSys(): CreatureWiredrawerSystem { return new CreatureWiredrawerSystem() }
function makeWiredrawer(entityId: number, metalDrawing = 70, gaugeControl = 80, outputQuality = 75): Wiredrawer {
  return { id: nextId++, entityId, metalDrawing, dieWork: 65, gaugeControl, outputQuality, tick: 0 }
}

function makeEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(true),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
  }
}

describe('CreatureWiredrawerSystem.getWiredrawers', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无拔丝工', () => { expect((sys as any).wiredrawers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect((sys as any).wiredrawers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect((sys as any).wiredrawers).toBe((sys as any).wiredrawers)
  })
  it('字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(2))
    const w = (sys as any).wiredrawers[0]
    expect(w.metalDrawing).toBe(70)
    expect(w.gaugeControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    ;(sys as any).wiredrawers.push(makeWiredrawer(2))
    expect((sys as any).wiredrawers).toHaveLength(2)
  })
})

describe('CreatureWiredrawerSystem CHECK_INTERVAL=2650 节流', () => {
  let sys: CreatureWiredrawerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不执行', () => {
    sys.update(0, makeEM() as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2649 时跳过', () => {
    sys.update(0, makeEM() as any, 2649)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2650 时执行并更新 lastCheck', () => {
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).lastCheck).toBe(2650)
  })

  it('执行后 2649 tick 内再次调用不执行', () => {
    sys.update(0, makeEM() as any, 2650)
    sys.update(0, makeEM() as any, 2650 + 2649)
    expect((sys as any).lastCheck).toBe(2650)
  })

  it('执行后满 2650 再次执行', () => {
    sys.update(0, makeEM() as any, 2650)
    sys.update(0, makeEM() as any, 5300)
    expect((sys as any).lastCheck).toBe(5300)
  })
})

describe('CreatureWiredrawerSystem 技能增长', () => {
  let sys: CreatureWiredrawerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次 update 触发后 metalDrawing += 0.02', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 50.0))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].metalDrawing).toBeCloseTo(50.02, 5)
  })

  it('每次 update 触发后 gaugeControl += 0.015', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 70, 40.0))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].gaugeControl).toBeCloseTo(40.015, 5)
  })

  it('每次 update 触发后 outputQuality += 0.01', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 70, 80, 30.0))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].outputQuality).toBeCloseTo(30.01, 5)
  })

  it('metalDrawing 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 99.99))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].metalDrawing).toBe(100)
  })

  it('gaugeControl 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 70, 99.99))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].gaugeControl).toBe(100)
  })

  it('outputQuality 不超过 100', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 70, 80, 99.99))
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers[0].outputQuality).toBe(100)
  })
})

describe('CreatureWiredrawerSystem metalDrawing<=4 清理', () => {
  let sys: CreatureWiredrawerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('metalDrawing=5 时保留', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 5))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers).toHaveLength(1)
  })

  it('metalDrawing=3.98 先增 +0.02 = 4.00 → <= 4 → 删除', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 3.98))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers).toHaveLength(0)
  })

  it('metalDrawing=4.01 → 增后 4.03 > 4，保留', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 4.01))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers).toHaveLength(1)
  })

  it('metalDrawing=2 → cleanup 删除', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 2))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers).toHaveLength(0)
  })

  it('混合：低metalDrawing删除，高的保留', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1, 1))   // 删
    ;(sys as any).wiredrawers.push(makeWiredrawer(2, 50))  // 留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2650)
    expect((sys as any).wiredrawers).toHaveLength(1)
    expect((sys as any).wiredrawers[0].entityId).toBe(2)
  })
})

describe('CreatureWiredrawerSystem MAX_WIREDRAWERS=10 上限', () => {
  let sys: CreatureWiredrawerSystem

  beforeEach(() => { sys = makeSys() })

  it('已达 10 人，不再新增', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).wiredrawers.push(makeWiredrawer(i + 1))
    }
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    sys.update(0, makeEM() as any, 2650)
    // 即使随机值=0，length < MAX 条件不满足，不会新增
    expect((sys as any).wiredrawers).toHaveLength(10)
    Math.random = origRandom
  })
})

describe('CreatureWiredrawerSystem nextId 递增', () => {
  let sys: CreatureWiredrawerSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('多个工匠 id 连续递增', () => {
    ;(sys as any).wiredrawers.push({ ...makeWiredrawer(1), id: (sys as any).nextId++ })
    ;(sys as any).wiredrawers.push({ ...makeWiredrawer(2), id: (sys as any).nextId++ })
    const ids = (sys as any).wiredrawers.map((w: Wiredrawer) => w.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })
})
