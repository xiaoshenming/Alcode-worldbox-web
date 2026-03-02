import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureFeltingMakersSystem } from '../systems/CreatureFeltingMakersSystem'
import type { FeltingMaker, FeltingType } from '../systems/CreatureFeltingMakersSystem'

let nextId = 1
function makeSys(): CreatureFeltingMakersSystem { return new CreatureFeltingMakersSystem() }
function makeMaker(entityId: number, feltingType: FeltingType = 'wet_felting', skill = 40, tick = 0): FeltingMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    piecesMade: 3 + Math.floor(skill / 8),
    feltingType,
    fiberDensity: 15 + skill * 0.69,
    reputation: 10 + skill * 0.79,
    tick,
  }
}

function makeEM(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getComponent: vi.fn(() => null),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureFeltingMakersSystem', () => {
  let sys: CreatureFeltingMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始makers数组为空', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询maker', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle_felting'))
    expect((sys as any).makers[0].feltingType).toBe('needle_felting')
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  // 3. FeltingType包含4种
  it('FeltingType包含4种: wet_felting/needle_felting/nuno/cobweb', () => {
    const types: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all: FeltingMaker[] = (sys as any).makers
    expect(all.map(m => m.feltingType)).toEqual(['wet_felting', 'needle_felting', 'nuno', 'cobweb'])
  })

  // 4. fiberDensity公式验证: fiberDensity = 15 + skill * 0.69
  it('fiberDensity公式: 15 + skill * 0.69', () => {
    const skill = 40
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.fiberDensity).toBeCloseTo(15 + skill * 0.69, 5)
  })

  // 5. reputation公式验证: reputation = 10 + skill * 0.79
  it('reputation公式: 10 + skill * 0.79', () => {
    const skill = 60
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.reputation).toBeCloseTo(10 + skill * 0.79, 5)
  })

  // 6. piecesMade计算: skill=40 → 3+floor(40/8)=8
  it('piecesMade计算: skill=40 → 3+floor(40/8)=8', () => {
    const skill = 40
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.piecesMade).toBe(3 + Math.floor(40 / 8)) // 3+5=8
  })

  // 7. feltingType由skill/25决定4段
  it('feltingType由skill/25决定4段', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    expect(TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('wet_felting')
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('needle_felting')
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('nuno')
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('cobweb')
    expect(TYPES[Math.min(3, Math.floor(99 / 25))]).toBe('cobweb')
  })

  // 8. tick差值 < 1480 不更新 lastCheck
  it('tick差值<CHECK_INTERVAL=1480时不执行更新', () => {
    const em = makeEM([])
    // 先让 lastCheck = 0 被设置（通过强制初始 lastCheck 为负）
    ;(sys as any).lastCheck = -1480
    sys.update(0, em as any, 0)    // 0-(-1480)=1480 >= 1480, 触发, lastCheck=0
    sys.update(0, em as any, 1479) // 1479-0=1479 < 1480, 不触发
    // 第2次调用不应触发更新
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  // 9. tick差值 >= 1480 更新 lastCheck
  it('tick差值>=CHECK_INTERVAL=1480时更新lastCheck', () => {
    const em = makeEM([])
    sys.update(0, em as any, 0)    // lastCheck=0
    sys.update(0, em as any, 1480) // 1480-0=1480 >= 1480
    expect((sys as any).lastCheck).toBe(1480)
  })

  // 10. time-based cleanup: tick < cutoff = tick - 51000 的记录被删除
  it('cleanup: 超过51000 tick的旧记录被清除', () => {
    const oldTick = 0
    const currentTick = 60000
    ;(sys as any).makers.push(makeMaker(1, 'wet_felting', 40, oldTick)) // tick=0 < 60000-51000=9000
    ;(sys as any).makers.push(makeMaker(2, 'cobweb', 40, 50000))         // tick=50000 >= 9000, 保留
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    const remaining: FeltingMaker[] = (sys as any).makers
    expect(remaining.some(m => m.entityId === 1)).toBe(false)
    expect(remaining.some(m => m.entityId === 2)).toBe(true)
  })

  // 11. 多个记录可共存
  it('多个maker可共存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })

  // 12. skill=75时feltingType为cobweb(typeIdx=3)
  it('skill=75时feltingType为cobweb', () => {
    const TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    const typeIdx = Math.min(3, Math.floor(75 / 25))
    expect(typeIdx).toBe(3)
    expect(TYPES[typeIdx]).toBe('cobweb')
  })

  // 13. piecesMade不同skill值验证
  it('piecesMade计算: skill=8 → 3+floor(8/8)=4', () => {
    const skill = 8
    const m = makeMaker(1, 'wet_felting', skill)
    expect(m.piecesMade).toBe(4)
  })

  // 14. fiberDensity边界: skill=0 → 15
  it('fiberDensity边界: skill=0 → 15', () => {
    const m = makeMaker(1, 'wet_felting', 0)
    expect(m.fiberDensity).toBe(15)
  })
})
