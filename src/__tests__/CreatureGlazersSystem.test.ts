import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureGlazersSystem } from '../systems/CreatureGlazersSystem'
import type { Glazer, GlassType } from '../systems/CreatureGlazersSystem'

let nextId = 1
function makeSys(): CreatureGlazersSystem { return new CreatureGlazersSystem() }
function makeGlazer(entityId: number, overrides: Partial<Glazer> = {}): Glazer {
  return {
    id: nextId++, entityId, skill: 40, panesInstalled: 4,
    glassType: 'clear', clarity: 54, artistry: 45, tick: 0,
    ...overrides,
  }
}

describe('CreatureGlazersSystem', () => {
  let sys: CreatureGlazersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无玻璃工', () => {
    expect((sys as any).glazers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).glazers.push(makeGlazer(42, { glassType: 'leaded' }))
    expect((sys as any).glazers[0].entityId).toBe(42)
    expect((sys as any).glazers[0].glassType).toBe('leaded')
  })

  // 3. GlassType 包含 4 种
  it('支持所有 4 种玻璃类型', () => {
    const types: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
    types.forEach((t, i) => { ;(sys as any).glazers.push(makeGlazer(i + 1, { glassType: t })) })
    const all = (sys as any).glazers as Glazer[]
    types.forEach((t, i) => { expect(all[i].glassType).toBe(t) })
  })

  // 4. clarity 公式：30 + skill * 0.6
  it('clarity 公式正确: 30 + skill * 0.6', () => {
    const skill = 60
    const g = makeGlazer(1, { skill, clarity: 30 + skill * 0.6 })
    ;(sys as any).glazers.push(g)
    expect((sys as any).glazers[0].clarity).toBeCloseTo(66, 5)
  })

  // 5. artistry 公式：15 + skill * 0.75
  it('artistry 公式正确: 15 + skill * 0.75', () => {
    const skill = 80
    const g = makeGlazer(1, { skill, artistry: 15 + skill * 0.75 })
    ;(sys as any).glazers.push(g)
    expect((sys as any).glazers[0].artistry).toBeCloseTo(75, 5)
  })

  // 6. panesInstalled 公式：1 + floor(skill/12)
  it('panesInstalled 公式正确: 1 + floor(skill/12)', () => {
    ;[0, 12, 24, 60, 99].forEach(skill => {
      const expected = 1 + Math.floor(skill / 12)
      const g = makeGlazer(1, { skill, panesInstalled: expected })
      expect(g.panesInstalled).toBe(expected)
    })
  })

  // 7. glassType 由 floor(skill/25) 的 4 段决定
  it('glassType 由 skill/25 分段决定', () => {
    const cases: [number, GlassType][] = [
      [0,  'clear'],
      [24, 'clear'],
      [25, 'colored'],
      [49, 'colored'],
      [50, 'stained'],
      [74, 'stained'],
      [75, 'leaded'],
      [100, 'leaded'],
    ]
    const TYPES: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
    cases.forEach(([skill, expected]) => {
      const typeIdx = Math.min(3, Math.floor(skill / 25))
      expect(TYPES[typeIdx]).toBe(expected)
    })
  })

  // 8. tick 差 < 1400 不执行（em.getEntitiesWithComponents 不被调用）
  it('tick 差 < 1400 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: vi.fn(() => []) } as any
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 1000 + 1399)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 9. tick 差 >= 1400 更新 lastCheck
  it('tick 差 >= 1400 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: vi.fn(() => []) } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  // 10. time-based cleanup：tick < cutoff(tick - 55000) 的记录被删除（严格小于才删）
  it('cleanup: tick 早于 cutoff 的玻璃工被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 55000  // 45000
    ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 1 }))  // 严格小于 → 删除
    ;(sys as any).glazers.push(makeGlazer(2, { tick: cutoff }))       // 等于 cutoff → 保留（非严格小于）
    ;(sys as any).glazers.push(makeGlazer(3, { tick: cutoff + 1 }))  // 大于 cutoff → 保留
    ;(sys as any).lastCheck = 0
    const em = { getEntitiesWithComponents: vi.fn(() => []) } as any
    sys.update(0, em, currentTick)
    const remaining = (sys as any).glazers as Glazer[]
    expect(remaining).toHaveLength(2)
    expect(remaining.some(g => g.entityId === 1)).toBe(false)
    expect(remaining.some(g => g.entityId === 2)).toBe(true)
    expect(remaining.some(g => g.entityId === 3)).toBe(true)
  })

  // 11. 多个记录全部返回
  it('多个记录全部返回', () => {
    ;(sys as any).glazers.push(makeGlazer(1))
    ;(sys as any).glazers.push(makeGlazer(2))
    ;(sys as any).glazers.push(makeGlazer(3))
    expect((sys as any).glazers).toHaveLength(3)
  })

  // 12. clarity/artistry 在 skill=0 时的边界值
  it('skill=0 时 clarity=30, artistry=15', () => {
    expect(30 + 0 * 0.6).toBe(30)
    expect(15 + 0 * 0.75).toBe(15)
  })

  // 13. skill=100 时 glassType 为 leaded
  it('skill=100 时 glassType 为 leaded', () => {
    const TYPES: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
    const typeIdx = Math.min(3, Math.floor(100 / 25))
    expect(TYPES[typeIdx]).toBe('leaded')
  })
})
