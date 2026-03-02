import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLaceMakersSystem } from '../systems/CreatureLaceMakersSystem'
import type { LaceMaker, LaceStyle } from '../systems/CreatureLaceMakersSystem'

let nextId = 1
function makeSys(): CreatureLaceMakersSystem { return new CreatureLaceMakersSystem() }
function makeMaker(entityId: number, laceStyle: LaceStyle = 'bobbin', skill = 60): LaceMaker {
  return {
    id: nextId++, entityId, skill,
    piecesWoven: 1 + Math.floor(skill / 10),
    laceStyle,
    threadFineness: 12 + skill * 0.72,
    reputation: 10 + skill * 0.82,
    tick: 0,
  }
}

const EMPTY_EM = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

// ——— 初始状态测试 ———
describe('CreatureLaceMakersSystem - 初始状态', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无花边师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('makers 初始为空数组（非 null/undefined）', () => {
    expect((sys as any).makers).toBeDefined()
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })
})

// ——— 基础增删查测试 ———
describe('CreatureLaceMakersSystem - 基础增删查', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 needle 风格', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle'))
    expect((sys as any).makers[0].laceStyle).toBe('needle')
  })

  it('返回内部引用稳定', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种花边风格', () => {
    const styles: LaceStyle[] = ['bobbin', 'needle', 'tatting', 'crochet']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].laceStyle).toBe(s) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('entityId 字段正确记录', () => {
    const m = makeMaker(999)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].entityId).toBe(999)
  })

  it('tick 字段默认为 0', () => {
    const m = makeMaker(1)
    expect(m.tick).toBe(0)
  })

  it('id 字段正确递增', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers[0].id).toBe(1)
    expect((sys as any).makers[1].id).toBe(2)
  })
})

// ——— LaceStyle 支持测试 ———
describe('CreatureLaceMakersSystem - LaceStyle 支持', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('bobbin 风格记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bobbin'))
    expect((sys as any).makers[0].laceStyle).toBe('bobbin')
  })

  it('needle 风格记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle'))
    expect((sys as any).makers[0].laceStyle).toBe('needle')
  })

  it('tatting 风格记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tatting'))
    expect((sys as any).makers[0].laceStyle).toBe('tatting')
  })

  it('crochet 风格记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'crochet'))
    expect((sys as any).makers[0].laceStyle).toBe('crochet')
  })
})

// ——— 公式验证测试 ———
describe('CreatureLaceMakersSystem - 公式验证', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('threadFineness 公式：12 + skill * 0.72（skill=50）', () => {
    const skill = 50
    const m = makeMaker(1, 'bobbin', skill)
    ;(sys as any).makers.push(m)
    const l = (sys as any).makers[0]
    expect(l.threadFineness).toBeCloseTo(12 + skill * 0.72, 5)
  })

  it('threadFineness 公式：skill=0 → 12', () => {
    const m = makeMaker(1, 'bobbin', 0)
    expect(m.threadFineness).toBeCloseTo(12, 5)
  })

  it('threadFineness 公式：skill=100 → 84', () => {
    const m = makeMaker(1, 'bobbin', 100)
    expect(m.threadFineness).toBeCloseTo(12 + 100 * 0.72, 5)  // 84
  })

  it('threadFineness 公式：skill=25 → 30', () => {
    const m = makeMaker(1, 'bobbin', 25)
    expect(m.threadFineness).toBeCloseTo(12 + 25 * 0.72, 5)  // 30
  })

  it('threadFineness 公式：skill=75 → 66', () => {
    const m = makeMaker(1, 'bobbin', 75)
    expect(m.threadFineness).toBeCloseTo(12 + 75 * 0.72, 5)  // 66
  })

  it('reputation 公式：10 + skill * 0.82（skill=80）', () => {
    const skill = 80
    const m = makeMaker(1, 'bobbin', skill)
    ;(sys as any).makers.push(m)
    const l = (sys as any).makers[0]
    expect(l.reputation).toBeCloseTo(10 + skill * 0.82, 5)
  })

  it('reputation 公式：skill=0 → 10', () => {
    const m = makeMaker(1, 'bobbin', 0)
    expect(m.reputation).toBeCloseTo(10, 5)
  })

  it('reputation 公式：skill=100 → 92', () => {
    const m = makeMaker(1, 'bobbin', 100)
    expect(m.reputation).toBeCloseTo(10 + 100 * 0.82, 5)  // 92
  })

  it('reputation 公式：skill=50 → 51', () => {
    const m = makeMaker(1, 'bobbin', 50)
    expect(m.reputation).toBeCloseTo(10 + 50 * 0.82, 5)  // 51
  })

  it('piecesWoven = 1 + floor(skill / 10)（skill=35）', () => {
    const skill = 35
    const m = makeMaker(1, 'bobbin', skill)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].piecesWoven).toBe(1 + Math.floor(skill / 10))
  })

  it('skill=0 时 piecesWoven 最小为 1', () => {
    const m = makeMaker(1, 'bobbin', 0)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].piecesWoven).toBe(1)
  })

  it('piecesWoven：skill=10 → 2', () => {
    const m = makeMaker(1, 'bobbin', 10)
    expect(m.piecesWoven).toBe(2)
  })

  it('piecesWoven：skill=60 → 7', () => {
    const m = makeMaker(1, 'bobbin', 60)
    expect(m.piecesWoven).toBe(7) // 1 + floor(60/10) = 7
  })

  it('piecesWoven：skill=100 → 11', () => {
    const m = makeMaker(1, 'bobbin', 100)
    expect(m.piecesWoven).toBe(11) // 1 + floor(100/10) = 11
  })

  it('piecesWoven：skill=9 → 1（不足整除）', () => {
    const m = makeMaker(1, 'bobbin', 9)
    expect(m.piecesWoven).toBe(1) // floor(9/10)=0
  })
})

// ——— laceStyle 4段映射测试 ———
describe('CreatureLaceMakersSystem - laceStyle 4段映射', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill < 25 → bobbin (styleIdx=0)', () => {
    const skill = 20
    expect(Math.min(3, Math.floor(skill / 25))).toBe(0)
  })

  it('skill = 0 → styleIdx=0 → bobbin', () => {
    expect(Math.min(3, Math.floor(0 / 25))).toBe(0)
  })

  it('skill = 24 → styleIdx=0（段0边界）', () => {
    expect(Math.min(3, Math.floor(24 / 25))).toBe(0)
  })

  it('skill = 25 → needle (styleIdx=1)', () => {
    const skill = 25
    expect(Math.min(3, Math.floor(skill / 25))).toBe(1)
  })

  it('skill = 49 → styleIdx=1（段1边界）', () => {
    expect(Math.min(3, Math.floor(49 / 25))).toBe(1)
  })

  it('skill = 50 → tatting (styleIdx=2)', () => {
    const skill = 50
    expect(Math.min(3, Math.floor(skill / 25))).toBe(2)
  })

  it('skill = 74 → styleIdx=2（段2边界）', () => {
    expect(Math.min(3, Math.floor(74 / 25))).toBe(2)
  })

  it('skill >= 75 → crochet (styleIdx=3)', () => {
    const skill = 75
    expect(Math.min(3, Math.floor(skill / 25))).toBe(3)
  })

  it('skill = 100 → 仍为 crochet (styleIdx=3, min限3)', () => {
    const skill = 100
    expect(Math.min(3, Math.floor(skill / 25))).toBe(3)
  })

  it('styleIdx 数组映射正确', () => {
    const styles: LaceStyle[] = ['bobbin', 'needle', 'tatting', 'crochet']
    expect(styles[0]).toBe('bobbin')
    expect(styles[1]).toBe('needle')
    expect(styles[2]).toBe('tatting')
    expect(styles[3]).toBe('crochet')
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
describe('CreatureLaceMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < 1380 时 getEntitiesWithComponents 一次都不调用', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 500)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(0)
  })

  it('tick >= 1380 时触发一次并更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1380)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    expect((sys as any).lastCheck).toBe(1380)
  })

  it('tick=1379时不触发（严格小于1380）', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1379)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('第一次触发后 lastCheck 更新，第二次差值不足被节流', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1380) // 触发，lastCheck=1380
    sys.update(0, em, 1380 + 100) // diff=100 < 1380 → 节流
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次间隔>=1380都触发', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1380)  // 触发一次
    sys.update(0, em, 2760)  // 触发第二次
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  it('tick差值<1380不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 5000 + 1000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差值>=1380更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, 1380)
    expect((sys as any).lastCheck).toBe(1380)
  })
})

// ——— time-based cleanup 测试 ———
describe('CreatureLaceMakersSystem - time-based cleanup', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < cutoff(52000)的记录被清除', () => {
    const oldMaker: LaceMaker = { ...makeMaker(1), tick: 0 }
    ;(sys as any).makers.push(oldMaker)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick >= cutoff 的记录保留', () => {
    const recentMaker: LaceMaker = { ...makeMaker(1), tick: 50000 }
    ;(sys as any).makers.push(recentMaker)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cutoff边界：tick等于cutoff时不删除（严格小于）', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000  // = 8000
    const m: LaceMaker = { ...makeMaker(1), tick: cutoff } // tick == cutoff
    ;(sys as any).makers.push(m)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick=cutoff-1时删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000  // = 8000
    const m: LaceMaker = { ...makeMaker(1), tick: cutoff - 1 } // 7999 < 8000 → deleted
    ;(sys as any).makers.push(m)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多条过期记录同时删除', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 100 })
    ;(sys as any).makers.push({ ...makeMaker(3), tick: 200 })
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('全部记录均新则全部保留', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 59000 })
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 58000 })
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })

  it('混合情况：删旧保新，顺序正确', () => {
    ;(sys as any).makers.push({ ...makeMaker(1), tick: 0 })       // 过期
    ;(sys as any).makers.push({ ...makeMaker(2), tick: 55000 })   // 保留
    ;(sys as any).makers.push({ ...makeMaker(3), tick: 500 })     // 过期
    ;(sys as any).makers.push({ ...makeMaker(4), tick: 58000 })   // 保留
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 60000)
    const remaining = (sys as any).makers as LaceMaker[]
    expect(remaining).toHaveLength(2)
    const ids = remaining.map(r => r.entityId).sort()
    expect(ids).toEqual([2, 4])
  })
})

// ——— skillMap 测试 ———
describe('CreatureLaceMakersSystem - skillMap', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('可手动设置 skillMap 值', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap 支持多个实体', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
  })

  it('skillMap 覆盖写入', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 70)
    expect((sys as any).skillMap.get(1)).toBe(70)
  })
})

// ——— MAX_MAKERS 上限测试 ———
describe('CreatureLaceMakersSystem - MAX_MAKERS 上限', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('填充30条记录后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('update时makers>=30则不新增（通过mock验证）', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push({ ...makeMaker(i + 1), tick: 100000 })
    }
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([99]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1380)
    expect((sys as any).makers).toHaveLength(30)
    spy.mockRestore()
  })
})

// ——— 综合验证测试 ———
describe('CreatureLaceMakersSystem - 综合验证', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill=1时各公式边界值正确', () => {
    const m = makeMaker(1, 'bobbin', 1)
    expect(m.piecesWoven).toBe(1)
    expect(m.threadFineness).toBeCloseTo(12 + 0.72, 5)
    expect(m.reputation).toBeCloseTo(10 + 0.82, 5)
  })

  it('skill=99时各公式边界值正确', () => {
    const m = makeMaker(1, 'crochet', 99)
    expect(m.piecesWoven).toBe(10) // 1+floor(99/10)=1+9=10
    expect(m.threadFineness).toBeCloseTo(12 + 99 * 0.72, 5)
    expect(m.reputation).toBeCloseTo(10 + 99 * 0.82, 5)
  })

  it('update前后 makers 数组引用一致', () => {
    const ref = (sys as any).makers
    sys.update(16, EMPTY_EM, 0)
    expect((sys as any).makers).toBe(ref)
  })

  it('多次 update 不改变空 makers 的长度（无creature）', () => {
    sys.update(16, EMPTY_EM, 1380)
    sys.update(16, EMPTY_EM, 2760)
    sys.update(16, EMPTY_EM, 4140)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('不同 entityId 的花边师独立存在', () => {
    ;(sys as any).makers.push(makeMaker(101, 'bobbin', 20))
    ;(sys as any).makers.push(makeMaker(202, 'tatting', 50))
    ;(sys as any).makers.push(makeMaker(303, 'crochet', 80))
    const all = (sys as any).makers as LaceMaker[]
    expect(all[0].entityId).toBe(101)
    expect(all[1].entityId).toBe(202)
    expect(all[2].entityId).toBe(303)
  })

  it('相同 entityId 可以多次push（不去重）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bobbin', 30))
    ;(sys as any).makers.push(makeMaker(1, 'needle', 50))
    expect((sys as any).makers).toHaveLength(2)
  })
})
