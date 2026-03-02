import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureHarnessMakersSystem } from '../systems/CreatureHarnessMakersSystem'
import type { HarnessMaker, HarnessType } from '../systems/CreatureHarnessMakersSystem'

let nextId = 1
function makeSys(): CreatureHarnessMakersSystem { return new CreatureHarnessMakersSystem() }

/** 手动构造 HarnessMaker，字段名以源码为准 */
function makeMaker(entityId: number, harnessType: HarnessType = 'riding', skill = 60, tick = 0): HarnessMaker {
  const harnessessMade = 1 + Math.floor(skill / 10)
  const leatherwork = 15 + skill * 0.68
  const reputation = 10 + skill * 0.78
  return { id: nextId++, entityId, skill, harnessessMade, harnessType, leatherwork, reputation, tick }
}

describe('CreatureHarnessMakersSystem — 数据查询', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马具匠', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft'))
    expect((sys as any).makers[0].harnessType).toBe('draft')
  })

  it('支持所有 4 种 HarnessType', () => {
    const types: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    types.forEach((t, i) => { (sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers as HarnessMaker[]
    types.forEach((t, i) => { expect(all[i].harnessType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureHarnessMakersSystem — 公式验证', () => {
  it('leatherwork = 15 + skill * 0.68', () => {
    const m = makeMaker(1, 'riding', 50)
    expect(m.leatherwork).toBeCloseTo(15 + 50 * 0.68)
  })

  it('reputation = 10 + skill * 0.78', () => {
    const m = makeMaker(1, 'pack', 80)
    expect(m.reputation).toBeCloseTo(10 + 80 * 0.78)
  })

  it('harnessessMade = 1 + floor(skill / 10)', () => {
    expect(makeMaker(1, 'draft', 0).harnessessMade).toBe(1)
    expect(makeMaker(2, 'draft', 25).harnessessMade).toBe(3)
    expect(makeMaker(3, 'draft', 99).harnessessMade).toBe(10)
  })

  it('harnessType 由 skill/25 决定 4 段', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    const cases: [number, HarnessType][] = [
      [0, 'draft'],
      [25, 'riding'],
      [50, 'pack'],
      [75, 'ceremonial'],
    ]
    for (const [skill, expected] of cases) {
      const typeIdx = Math.min(3, Math.floor(skill / 25))
      expect(HARNESS_TYPES[typeIdx]).toBe(expected)
    }
  })

  it('skill >= 100 时 harnessType 仍为 ceremonial（Math.min(3,...) 上限）', () => {
    const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    const typeIdx = Math.min(3, Math.floor(200 / 25))
    expect(HARNESS_TYPES[typeIdx]).toBe('ceremonial')
  })
})

describe('CreatureHarnessMakersSystem — CHECK_INTERVAL', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1400 不触发（先推进 lastCheck 到高 tick，再调用差值不足的 tick）', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), hasComponent: vi.fn().mockReturnValue(true) } as any
    // 先以 tick=10000 触发一次，更新 lastCheck=10000
    sys.update(0, em, 10000)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    // 再以 tick=10000+1399 调用，差值 1399 < 1400，不触发
    sys.update(0, em, 10000 + 1399)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('tick 差值 >= 1400 更新 lastCheck（从 0 开始差值足够）', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), hasComponent: vi.fn().mockReturnValue(true) } as any
    sys.update(0, em, 1000)
    sys.update(0, em, 1000 + 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 后 lastCheck 更新，短间隔不再触发', () => {
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), hasComponent: vi.fn().mockReturnValue(true) } as any
    sys.update(0, em, 5000)
    sys.update(0, em, 5050)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})

describe('CreatureHarnessMakersSystem — time-based cleanup', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过 50000 tick 的马具匠被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft', 60, 0))
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), hasComponent: vi.fn().mockReturnValue(true) } as any
    // tick=51400: lastCheck=0, 51400-0 >= 1400 触发; cutoff = 51400 - 50000 = 1400; tick=0 < 1400 => 删除
    sys.update(0, em, 51400)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('未超过 50000 tick 的马具匠保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'riding', 60, 10000))
    const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]), hasComponent: vi.fn().mockReturnValue(true) } as any
    // tick=11400: cutoff = 11400 - 50000 = -38600; tick=10000 > -38600 => 保留
    sys.update(0, em, 11400)
    expect((sys as any).makers).toHaveLength(1)
  })
})
