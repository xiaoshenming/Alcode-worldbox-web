import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureYokemakerSystem } from '../systems/CreatureYokemakerSystem'
import type { Yokemaker } from '../systems/CreatureYokemakerSystem'

let nextId = 1
function makeSys(): CreatureYokemakerSystem { return new CreatureYokemakerSystem() }
function makeMaker(entityId: number, woodCarving = 70, balanceWork = 80, outputQuality = 75): Yokemaker {
  return { id: nextId++, entityId, woodCarving, yokeFitting: 65, balanceWork, outputQuality, tick: 0 }
}

function makeEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(true),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
  }
}

describe('CreatureYokemakerSystem.getYokemakers', () => {
  let sys: CreatureYokemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轭木工', () => { expect((sys as any).yokemakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    expect((sys as any).yokemakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    expect((sys as any).yokemakers).toBe((sys as any).yokemakers)
  })
  it('字段正确', () => {
    ;(sys as any).yokemakers.push(makeMaker(2))
    const y = (sys as any).yokemakers[0]
    expect(y.woodCarving).toBe(70)
    expect(y.balanceWork).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).yokemakers.push(makeMaker(1))
    ;(sys as any).yokemakers.push(makeMaker(2))
    expect((sys as any).yokemakers).toHaveLength(2)
  })
})

describe('CreatureYokemakerSystem CHECK_INTERVAL=2640 节流', () => {
  let sys: CreatureYokemakerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不执行', () => {
    sys.update(0, makeEM() as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2639 时跳过', () => {
    sys.update(0, makeEM() as any, 2639)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2640 时执行并更新 lastCheck', () => {
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('执行后 2639 tick 内再次调用不执行', () => {
    sys.update(0, makeEM() as any, 2640)
    sys.update(0, makeEM() as any, 2640 + 2639)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('执行后满 2640 再次执行', () => {
    sys.update(0, makeEM() as any, 2640)
    sys.update(0, makeEM() as any, 5280)
    expect((sys as any).lastCheck).toBe(5280)
  })
})

describe('CreatureYokemakerSystem 技能增长', () => {
  let sys: CreatureYokemakerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次 update 触发后 woodCarving += 0.02', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 50.0))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].woodCarving).toBeCloseTo(50.02, 5)
  })

  it('每次 update 触发后 balanceWork += 0.015', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 70, 40.0))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].balanceWork).toBeCloseTo(40.015, 5)
  })

  it('每次 update 触发后 outputQuality += 0.01', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 70, 80, 30.0))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].outputQuality).toBeCloseTo(30.01, 5)
  })

  it('woodCarving 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 99.99))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].woodCarving).toBe(100)
  })

  it('balanceWork 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 70, 99.99))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].balanceWork).toBe(100)
  })

  it('outputQuality 不超过 100', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 70, 80, 99.99))
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers[0].outputQuality).toBe(100)
  })
})

describe('CreatureYokemakerSystem woodCarving<=4 清理', () => {
  let sys: CreatureYokemakerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('woodCarving=5 时保留', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 5))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(1)
  })

  it('woodCarving=3.98 先增 +0.02 = 4.00 → <= 4 → 删除', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 3.98))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(0)
  })

  it('woodCarving=4.01 → 增后 4.03 > 4，保留', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 4.01))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(1)
  })

  it('woodCarving=2 → cleanup 删除', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 2))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(0)
  })

  it('混合：低woodCarving删除，高的保留', () => {
    ;(sys as any).yokemakers.push(makeMaker(1, 1))   // 删
    ;(sys as any).yokemakers.push(makeMaker(2, 50))  // 留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(1)
    expect((sys as any).yokemakers[0].entityId).toBe(2)
  })
})

describe('CreatureYokemakerSystem MAX_YOKEMAKERS=10 上限', () => {
  let sys: CreatureYokemakerSystem

  beforeEach(() => { sys = makeSys() })

  it('已达 10 人，不再新增', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).yokemakers.push(makeMaker(i + 1))
    }
    const origRandom = Math.random
    Math.random = vi.fn().mockReturnValue(0)
    sys.update(0, makeEM() as any, 2640)
    expect((sys as any).yokemakers).toHaveLength(10)
    Math.random = origRandom
  })
})

describe('CreatureYokemakerSystem nextId 递增', () => {
  let sys: CreatureYokemakerSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('多个轭木工 id 连续递增', () => {
    ;(sys as any).yokemakers.push({ ...makeMaker(1), id: (sys as any).nextId++ })
    ;(sys as any).yokemakers.push({ ...makeMaker(2), id: (sys as any).nextId++ })
    const ids = (sys as any).yokemakers.map((y: Yokemaker) => y.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })
})
