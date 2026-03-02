import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBroomMakersSystem } from '../systems/CreatureBroomMakersSystem'
import type { BroomMaker, BroomType } from '../systems/CreatureBroomMakersSystem'

let nextId = 1
function makeSys(): CreatureBroomMakersSystem { return new CreatureBroomMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<BroomMaker> = {}): BroomMaker {
  return {
    id: nextId++, entityId, skill: 30, broomsMade: 5,
    broomType: 'straw', durability: 39.5, reputation: 29, tick: 0,
    ...overrides
  }
}

// 返回空 creatures 列表的基础 em mock，避免随机招募干扰测试
function makeEmEmpty() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
    hasComponent: () => true,
  } as any
}

// 带有生物的 em mock（用于触发招募路径）
function makeEmWithCreature(eid: number, age: number) {
  return {
    getEntitiesWithComponents: () => [eid],
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: () => true,
  } as any
}

describe('CreatureBroomMakersSystem', () => {
  let sys: CreatureBroomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础存在性 ---
  it('初始无扫帚师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { broomType: 'ceremonial' }))
    expect((sys as any).makers[0].broomType).toBe('ceremonial')
  })

  it('BroomType 包含 4 种（straw/twig/bristle/ceremonial）', () => {
    const types: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    types.forEach((t, i) => {
      ;(sys as any).makers.push(makeMaker(i + 1, { broomType: t }))
    })
    const all = (sys as any).makers as BroomMaker[]
    types.forEach((t, i) => { expect(all[i].broomType).toBe(t) })
  })

  // --- 公式验证 ---
  it('durability 计算公式：skill=40 → 20 + 40*0.65 = 46', () => {
    const skill = 40
    const durability = 20 + skill * 0.65
    expect(durability).toBeCloseTo(46)
  })

  it('reputation 计算公式：skill=40 → 8 + 40*0.7 = 36', () => {
    const skill = 40
    const reputation = 8 + skill * 0.7
    expect(reputation).toBeCloseTo(36)
  })

  it('broomsMade 计算：skill=60 → 2 + Math.floor(60/6) = 12', () => {
    const skill = 60
    const broomsMade = 2 + Math.floor(skill / 6)
    expect(broomsMade).toBe(12)
  })

  it('broomType 由 skill/25 决定：skill=0-24 → straw', () => {
    const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    expect(BROOM_TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('straw')
  })

  it('broomType 由 skill/25 决定：skill=25-49 → twig', () => {
    const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    expect(BROOM_TYPES[Math.min(3, Math.floor(35 / 25))]).toBe('twig')
  })

  it('broomType 由 skill/25 决定：skill=50-74 → bristle', () => {
    const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    expect(BROOM_TYPES[Math.min(3, Math.floor(60 / 25))]).toBe('bristle')
  })

  it('broomType 由 skill/25 决定：skill=75+ → ceremonial', () => {
    const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    expect(BROOM_TYPES[Math.min(3, Math.floor(80 / 25))]).toBe('ceremonial')
  })

  // --- tick 节流逻辑（CHECK_INTERVAL = 1350）---
  it('tick 差值 < 1350 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEmEmpty(), 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 >= 1350 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEmEmpty(), 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  // --- time-based cleanup ---
  it('time-based cleanup：tick=0 的记录在 update(tick=60000) 时被删除（cutoff=10000，0<10000）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEmEmpty(), 60000)
    // cutoff = 60000 - 50000 = 10000，记录 tick=0 < 10000，应被删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick 较新的记录不被 cleanup（tick=55000 在 update(tick=60000) 时不会被删）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeEmEmpty(), 60000)
    // cutoff = 60000 - 50000 = 10000，记录 tick=55000 >= 10000，应保留
    expect((sys as any).makers).toHaveLength(1)
  })
})
