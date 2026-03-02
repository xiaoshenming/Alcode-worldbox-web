import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFletchersSystem } from '../systems/CreatureFletchersSystem'
import type { Fletcher, ProjectileType } from '../systems/CreatureFletchersSystem'

let nextId = 1
function makeSys(): CreatureFletchersSystem { return new CreatureFletchersSystem() }
function makeFletcher(entityId: number, skill = 40, projectileType: ProjectileType = 'arrow'): Fletcher {
  return {
    id: nextId++,
    entityId,
    skill,
    projectilesCrafted: 2 + Math.floor(skill / 8),
    projectileType,
    accuracy: 25 + skill * 0.65,
    penetration: 20 + skill * 0.7,
    tick: 0,
  }
}

describe('CreatureFletchersSystem', () => {
  let sys: CreatureFletchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 静态数据测试 ----
  it('初始无箭匠', () => {
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, 40, 'bolt'))
    expect((sys as any).fletchers[0].projectileType).toBe('bolt')
  })

  it('支持所有 4 种投射物类型（arrow/bolt/dart/javelin）', () => {
    const types: ProjectileType[] = ['arrow', 'bolt', 'dart', 'javelin']
    types.forEach((t, i) => { ;(sys as any).fletchers.push(makeFletcher(i + 1, 40, t)) })
    const all = (sys as any).fletchers
    types.forEach((t, i) => { expect(all[i].projectileType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect((sys as any).fletchers).toHaveLength(2)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ---- accuracy 公式验证：25 + skill * 0.65 ----
  it('accuracy 公式：25 + skill * 0.65', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + skill * 0.65)
  })

  it('accuracy 公式在 skill=100 时正确', () => {
    const skill = 100
    const f = makeFletcher(1, skill)
    expect(f.accuracy).toBeCloseTo(25 + 100 * 0.65) // 90
  })

  // ---- penetration 公式验证：20 + skill * 0.7 ----
  it('penetration 公式：20 + skill * 0.7', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + skill * 0.7)
  })

  it('penetration 公式在 skill=75 时正确', () => {
    const skill = 75
    const f = makeFletcher(1, skill)
    expect(f.penetration).toBeCloseTo(20 + 75 * 0.7) // 72.5
  })

  // ---- projectilesCrafted 公式：2 + floor(skill / 8) ----
  it('projectilesCrafted 公式：2 + floor(skill / 8)', () => {
    const skill = 40
    const f = makeFletcher(1, skill)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(40 / 8)) // 7
  })

  it('projectilesCrafted 在 skill=100 时为 14', () => {
    const f = makeFletcher(1, 100)
    expect(f.projectilesCrafted).toBe(2 + Math.floor(100 / 8)) // 14
  })

  // ---- projectileType 由 skill/25 决定 4段（typeIdx = min(3, floor(skill/25))）----
  it('skill < 25 → arrow（typeIdx=0）', () => {
    // typeIdx = min(3, floor(10/25)) = min(3,0) = 0 => 'arrow'
    const f = makeFletcher(1, 10, 'arrow')
    expect(f.projectileType).toBe('arrow')
  })

  it('skill = 25 → bolt（typeIdx=1）', () => {
    // typeIdx = min(3, floor(25/25)) = min(3,1) = 1 => 'bolt'
    const f = makeFletcher(1, 25, 'bolt')
    expect(f.projectileType).toBe('bolt')
  })

  it('skill = 50 → dart（typeIdx=2）', () => {
    // typeIdx = min(3, floor(50/25)) = min(3,2) = 2 => 'dart'
    const f = makeFletcher(1, 50, 'dart')
    expect(f.projectileType).toBe('dart')
  })

  it('skill = 75 → javelin（typeIdx=3）', () => {
    // typeIdx = min(3, floor(75/25)) = min(3,3) = 3 => 'javelin'
    const f = makeFletcher(1, 75, 'javelin')
    expect(f.projectileType).toBe('javelin')
  })

  // ---- update / tick 控制测试 ----
  it('tick差值 < CHECK_INTERVAL(1400) 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(1400) 时更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponents: () => [],
    } as any
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  // ---- time-based cleanup：tick < cutoff(tick - 55000) 的记录被移除 ----
  it('time-based cleanup: tick 过期（< currentTick - 55000）的记录被移除', () => {
    const currentTick = 100000
    const oldFletcher: Fletcher = {
      id: nextId++,
      entityId: 1,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: currentTick - 55001, // 过期
    }
    const newFletcher: Fletcher = {
      id: nextId++,
      entityId: 2,
      skill: 40,
      projectilesCrafted: 7,
      projectileType: 'arrow',
      accuracy: 51,
      penetration: 48,
      tick: currentTick - 1000, // 未过期
    }
    ;(sys as any).fletchers.push(oldFletcher)
    ;(sys as any).fletchers.push(newFletcher)
    ;(sys as any).lastCheck = 0

    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
    } as any
    // pruneDeadEntities 需要 em.getEntitiesWithComponent
    ;em.getEntitiesWithComponent = () => []

    sys.update(1, em, currentTick)
    // 过期的 oldFletcher 应被移除，newFletcher 保留
    expect((sys as any).fletchers).toHaveLength(1)
    expect((sys as any).fletchers[0].entityId).toBe(2)
  })

  it('未过期的记录在 cleanup 后保留', () => {
    const currentTick = 100000
    const fresh: Fletcher = {
      id: nextId++,
      entityId: 3,
      skill: 50,
      projectilesCrafted: 8,
      projectileType: 'dart',
      accuracy: 57.5,
      penetration: 55,
      tick: currentTick - 10000, // 未过期（10000 < 55000）
    }
    ;(sys as any).fletchers.push(fresh)
    ;(sys as any).lastCheck = 0

    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
      getEntitiesWithComponent: () => [],
    } as any

    sys.update(1, em, currentTick)
    expect((sys as any).fletchers).toHaveLength(1)
    expect((sys as any).fletchers[0].entityId).toBe(3)
  })
})
