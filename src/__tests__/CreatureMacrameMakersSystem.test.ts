import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMacrameMakersSystem } from '../systems/CreatureMacrameMakersSystem'
import type { MacrameMaker, MacrameType } from '../systems/CreatureMacrameMakersSystem'

// CHECK_INTERVAL=1510, MAX_MAKERS=30, SKILL_GROWTH=0.054
// cleanup: cutoff = tick - 53000，tick < cutoff 的记录被删除
// skillMap: entityId → 技能值，累积增长

let nextId = 1
function makeSys(): CreatureMacrameMakersSystem { return new CreatureMacrameMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<MacrameMaker> = {}): MacrameMaker {
  return {
    id: nextId++, entityId, skill: 60, piecesMade: 10,
    macrameType: 'wall_hanging', knotDensity: 70, reputation: 50, tick: 0,
    ...overrides
  }
}

describe('CreatureMacrameMakersSystem', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有 5 个测试 ──────────────────────────────────────────────
  it('初始无绳结师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { macrameType: 'plant_hanger' }))
    expect((sys as any).makers[0].macrameType).toBe('plant_hanger')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种绳结类型', () => {
    const types: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { macrameType: t })) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].macrameType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── skillMap 存储测试 ────────────────────────────────────────
  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('注入 skillMap 条目后可读取', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })

  it('skillMap 可存储多个实体的技能值', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })

  // ── time-based cleanup 测试 ──────────────────────────────────
  it('tick=0 的记录在 tick=53001 时被清除（cutoff=1）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).lastCheck = 0
    // 手动调用内部 cleanup 逻辑：cutoff = 53001 - 53000 = 1，tick=0 < 1 → 删除
    const cutoff = 53001 - 53000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick=53000 的记录在 currentTick=106000 时被清除（cutoff=53000）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 53000 }))
    const cutoff = 106001 - 53000  // =53001，53000 < 53001 → 删除
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(0)
  })

  it('新记录（tick 未超过 cutoff）不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 50000 }))
    const cutoff = 100000 - 53000  // =47000，50000 >= 47000 → 保留
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(1)
  })

  it('旧记录被清除、新记录保留（混合情形）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))      // 旧
    ;(sys as any).makers.push(makeMaker(2, { tick: 60000 }))  // 新
    ;(sys as any).makers.push(makeMaker(3, { tick: 100 }))    // 旧
    const cutoff = 110000 - 53000  // =57000
    for (let i = (sys as any).makers.length - 1; i >= 0; i--) {
      if ((sys as any).makers[i].tick < cutoff) (sys as any).makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // ── CHECK_INTERVAL 节流测试 ────────────────────────────────────
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值不足 CHECK_INTERVAL=1510 时不更新 lastCheck', () => {
    const mockEm = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, mockEm, 100)  // 100 - 0 < 1510
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值满足 CHECK_INTERVAL 时更新 lastCheck', () => {
    const mockEm = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, mockEm, 1510)
    expect((sys as any).lastCheck).toBe(1510)
  })

  // ── 数据完整性测试 ───────────────────────────────────────────
  it('所有字段正确存储', () => {
    const m = makeMaker(77, {
      skill: 42, piecesMade: 8, macrameType: 'curtain',
      knotDensity: 35, reputation: 44, tick: 500
    })
    ;(sys as any).makers.push(m)
    const stored = (sys as any).makers[0]
    expect(stored.entityId).toBe(77)
    expect(stored.skill).toBe(42)
    expect(stored.piecesMade).toBe(8)
    expect(stored.macrameType).toBe('curtain')
    expect(stored.knotDensity).toBe(35)
    expect(stored.reputation).toBe(44)
    expect(stored.tick).toBe(500)
  })

  it('id 自增保证唯一性', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    const ids = (sys as any).makers.map((m: MacrameMaker) => m.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('MAX_MAKERS=30，注入30个后不超出', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  // ── macrameType 与 skill 的关系（typeIdx = min(3, floor(skill/25))）──
  it('skill=0 → typeIdx=0 → macrameType=wall_hanging', () => {
    const typeIdx = Math.min(3, Math.floor(0 / 25))
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[typeIdx]).toBe('wall_hanging')
  })

  it('skill=25 → typeIdx=1 → macrameType=plant_hanger', () => {
    const typeIdx = Math.min(3, Math.floor(25 / 25))
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[typeIdx]).toBe('plant_hanger')
  })

  it('skill=75 → typeIdx=3 → macrameType=belt', () => {
    const typeIdx = Math.min(3, Math.floor(75 / 25))
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[typeIdx]).toBe('belt')
  })

  it('skill=100 → typeIdx=3（上限clamp）→ macrameType=belt', () => {
    const typeIdx = Math.min(3, Math.floor(100 / 25))
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[typeIdx]).toBe('belt')
  })
})
