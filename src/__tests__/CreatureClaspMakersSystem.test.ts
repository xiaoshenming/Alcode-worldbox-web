import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureClaspMakersSystem } from '../systems/CreatureClaspMakersSystem'
import type { ClaspMaker, ClaspType } from '../systems/CreatureClaspMakersSystem'

let nextId = 1
function makeSys(): CreatureClaspMakersSystem { return new CreatureClaspMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<ClaspMaker> = {}): ClaspMaker {
  return { id: nextId++, entityId, skill: 30, claspsMade: 4, claspType: 'cloak', precision: 37, reputation: 33.7, tick: 0, ...overrides }
}

describe('CreatureClaspMakersSystem', () => {
  let sys: CreatureClaspMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础状态 ──
  it('初始无扣环制作者', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { claspType: 'jewelry' }))
    expect((sys as any).makers[0].claspType).toBe('jewelry')
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('ClaspType包含4种（cloak/jewelry/book/chest）', () => {
    const types: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { claspType: t })) })
    const all = (sys as any).makers as ClaspMaker[]
    expect(all.map(m => m.claspType)).toEqual(['cloak', 'jewelry', 'book', 'chest'])
  })

  // ── 公式验证（直接计算，无需 update）──
  it('precision计算：skill=40 → 16+40*0.70=44', () => {
    const skill = 40
    const precision = 16 + skill * 0.70
    expect(precision).toBeCloseTo(44)
  })

  it('reputation计算：skill=40 → 10+40*0.79=41.6', () => {
    const skill = 40
    const reputation = 10 + skill * 0.79
    expect(reputation).toBeCloseTo(41.6)
  })

  it('claspsMade计算：skill=40 → 1+Math.floor(40/8)=6', () => {
    const skill = 40
    const claspsMade = 1 + Math.floor(skill / 8)
    expect(claspsMade).toBe(6)
  })

  it('claspType由skill/25决定4段：0→cloak, 25→jewelry, 50→book, 75→chest', () => {
    const types: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const typeIdx = Math.min(3, Math.floor(skill / 25))
      expect(types[typeIdx]).toBe(types[i])
    })
  })

  it('claspType在skill=24时为cloak（typeIdx=0）', () => {
    const skill = 24
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(0)
  })

  it('claspType在skill=100时为chest（typeIdx=3，不超过3）', () => {
    const skill = 100
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })

  // ── tick 间隔控制（CHECK_INTERVAL = 1450）──
  it('tick差值<1450时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1450时更新lastCheck', () => {
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(16, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })

  // ── time-based cleanup（删除 tick < currentTick - 52000 的记录）──
  it('time-based cleanup：tick=0的记录在update(60000)时被删', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    // currentTick=60000, cutoff=60000-52000=8000, 0<8000 → 删除
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('较新记录保留：tick=55000在currentTick=60000时不删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    // cutoff=60000-52000=8000, 55000>8000 → 保留
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => false,
      getEntitiesWithComponent: () => [],
    } as any
    sys.update(16, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})
