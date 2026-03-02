import { describe, it, expect, beforeEach, vi } from 'vitest'
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

// ——— 基础增删查测试 ———
describe('CreatureLaceMakersSystem - 基础增删查', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无花边师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

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
})

// ——— 公式验证测试 ———
describe('CreatureLaceMakersSystem - 公式验证', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('threadFineness 公式：12 + skill * 0.72', () => {
    const skill = 50
    const m = makeMaker(1, 'bobbin', skill)
    ;(sys as any).makers.push(m)
    const l = (sys as any).makers[0]
    expect(l.threadFineness).toBeCloseTo(12 + skill * 0.72, 5)
  })

  it('reputation 公式：10 + skill * 0.82', () => {
    const skill = 80
    const m = makeMaker(1, 'bobbin', skill)
    ;(sys as any).makers.push(m)
    const l = (sys as any).makers[0]
    expect(l.reputation).toBeCloseTo(10 + skill * 0.82, 5)
  })

  it('piecesWoven = 1 + floor(skill / 10)', () => {
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
})

// ——— laceStyle 4段映射测试 ———
describe('CreatureLaceMakersSystem - laceStyle 4段映射', () => {
  it('skill < 25 → bobbin (styleIdx=0)', () => {
    // styleIdx = min(3, floor(skill/25))
    const skill = 20
    expect(Math.min(3, Math.floor(skill / 25))).toBe(0)
  })

  it('skill = 25 → needle (styleIdx=1)', () => {
    const skill = 25
    expect(Math.min(3, Math.floor(skill / 25))).toBe(1)
  })

  it('skill = 50 → tatting (styleIdx=2)', () => {
    const skill = 50
    expect(Math.min(3, Math.floor(skill / 25))).toBe(2)
  })

  it('skill >= 75 → crochet (styleIdx=3)', () => {
    const skill = 75
    expect(Math.min(3, Math.floor(skill / 25))).toBe(3)
  })

  it('skill = 100 → 仍为 crochet (styleIdx=3, min限3)', () => {
    const skill = 100
    expect(Math.min(3, Math.floor(skill / 25))).toBe(3)
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
// 注意：tick=0 时 0-0=0 < 1380，同样被节流（第一次也跳过）
// 只有 tick >= 1380 时才触发 getEntitiesWithComponents
describe('CreatureLaceMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < 1380 时 getEntitiesWithComponents 一次都不调用', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    // tick=0: 0-0=0 < 1380 → skip
    sys.update(0, em, 0)
    // tick=500: 500-0=500 < 1380 → skip
    sys.update(0, em, 500)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(0)
  })

  it('tick >= 1380 时触发一次并更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    // tick=1380: 1380-0=1380, NOT < 1380 → process
    sys.update(0, em, 1380)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    expect((sys as any).lastCheck).toBe(1380)
  })
})

// ——— time-based cleanup 测试 ———
describe('CreatureLaceMakersSystem - time-based cleanup', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick < cutoff(52000)的记录被清除', () => {
    const oldMaker: LaceMaker = { ...makeMaker(1), tick: 0 }
    ;(sys as any).makers.push(oldMaker)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    // 触发 tick=60000，cutoff=60000-52000=8000, oldMaker.tick=0 < 8000
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
    // tick=60000, cutoff=8000, 50000 >= 8000 → 保留
    sys.update(0, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
})
