import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChisellerSystem } from '../systems/CreatureChisellerSystem'
import type { Chiseller } from '../systems/CreatureChisellerSystem'

let nextId = 1
function makeSys(): CreatureChisellerSystem { return new CreatureChisellerSystem() }
function makeChiseller(entityId: number, overrides: Partial<Chiseller> = {}): Chiseller {
  return { id: nextId++, entityId, chisellingSkill: 30, cuttingPrecision: 25, metalCarving: 20, edgeDefinition: 35, tick: 0, ...overrides }
}

describe('CreatureChisellerSystem', () => {
  let sys: CreatureChisellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础状态 ──
  it('初始无凿刻工', () => { expect((sys as any).chisellers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chisellers.push(makeChiseller(1))
    expect((sys as any).chisellers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).chisellers.push(makeChiseller(1))
    ;(sys as any).chisellers.push(makeChiseller(2))
    expect((sys as any).chisellers).toHaveLength(2)
  })

  it('四字段数据完整（chisellingSkill/cuttingPrecision/metalCarving/edgeDefinition）', () => {
    const c = makeChiseller(10, { chisellingSkill: 80, cuttingPrecision: 75, metalCarving: 70, edgeDefinition: 65 })
    ;(sys as any).chisellers.push(c)
    const r = (sys as any).chisellers[0]
    expect(r.chisellingSkill).toBe(80)
    expect(r.cuttingPrecision).toBe(75)
    expect(r.metalCarving).toBe(70)
    expect(r.edgeDefinition).toBe(65)
  })

  // ── tick 间隔控制（CHECK_INTERVAL = 2920）──
  it('tick差值<2920时不执行update逻辑，lastCheck保持0', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
    const em = {} as any
    sys.update(16, em, 2919)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=2920时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).lastCheck).toBe(2920)
  })

  // ── 技能递增 ──
  it('update后chisellingSkill+0.02', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers[0].chisellingSkill).toBeCloseTo(30.02)
  })

  it('update后cuttingPrecision+0.015', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { cuttingPrecision: 25 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers[0].cuttingPrecision).toBeCloseTo(25.015)
  })

  it('update后edgeDefinition+0.01', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { edgeDefinition: 35 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers[0].edgeDefinition).toBeCloseTo(35.01)
  })

  // ── 技能上限 ──
  it('chisellingSkill上限为100', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 99.99 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers[0].chisellingSkill).toBe(100)
  })

  it('cuttingPrecision上限为100', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { cuttingPrecision: 99.99 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers[0].cuttingPrecision).toBe(100)
  })

  // ── cleanup ──
  it('cleanup：chisellingSkill递增后<=4时删除记录', () => {
    // skill=3.98 → +0.02 → 4.00 → 4.00 <= 4 → 删除
    ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 3.98 }))
    ;(sys as any).chisellers.push(makeChiseller(2, { chisellingSkill: 30 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    const remaining = (sys as any).chisellers as Chiseller[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('cleanup：chisellingSkill>4时保留', () => {
    ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 5 }))
    const em = { getEntitiesWithComponents: () => [] } as any
    sys.update(16, em, 2920)
    expect((sys as any).chisellers).toHaveLength(1)
  })
})
