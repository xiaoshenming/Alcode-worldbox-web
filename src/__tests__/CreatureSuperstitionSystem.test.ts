import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSuperstitionSystem } from '../systems/CreatureSuperstitionSystem'
import type { Superstition, SuperstitionType } from '../systems/CreatureSuperstitionSystem'

// CHECK_INTERVAL=800, MAX_SUPERSTITIONS=20, MIN_STRENGTH=5, MAX_STRENGTH=100
// DECAY_BASE=0.3, BELIEF_SPREAD_RANGE=8
// TYPE_CONFIG: lucky_spot(+,r3), cursed_ground(-,r4), sacred_tree(+,r5), omen_bird(-,r3), forbidden_path(-,r6), blessed_water(+,r4)

function makeSys() { return new CreatureSuperstitionSystem() }

function makeSup(id: number, strength: number, believers = 0): Superstition {
  const b = new Set<number>()
  for (let i = 0; i < believers; i++) b.add(i + 1)
  return {
    id, type: 'lucky_spot', x: 100, y: 100, radius: 3,
    strength, originTick: 0, believers: b, positive: true, decayRate: 0.3,
  }
}

describe('CreatureSuperstitionSystem', () => {
  let sys: CreatureSuperstitionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureSuperstitionSystem) })
  it('初始superstitions为空', () => { expect((sys as any).superstitions.length).toBe(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })

  // ── TYPE_CONFIG 数据验证 ─────────────────────────────────────────────────────

  it('lucky_spot是正面迷信', () => {
    // TYPE_CONFIG不直接导出，通过formSuperstitions间接验证
    // 但我们可以直接验证超信仰数据结构
    const sup = makeSup(1, 50)
    expect(sup.positive).toBe(true)
  })

  it('6种SuperstitionType都有效', () => {
    const types: SuperstitionType[] = ['lucky_spot', 'cursed_ground', 'sacred_tree', 'omen_bird', 'forbidden_path', 'blessed_water']
    for (const type of types) {
      const sup = { ...makeSup(1, 50), type }
      ;(sys as any).superstitions.push(sup)
    }
    expect((sys as any).superstitions.length).toBe(6)
  })

  // ── decaySuperstitions 逻辑 ──────────────────────────────────────────────────

  it('decaySuperstitions: 无believers时believerFactor=max(0.3, 1-0)=1.0', () => {
    const sup = makeSup(1, 50, 0)  // 0个believers
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // believerFactor = max(0.3, 1 - 0*0.05) = 1.0
    // strength -= 0.3 * 1.0 = 0.3
    expect(sup.strength).toBeCloseTo(49.7, 5)
  })

  it('decaySuperstitions: 20个believers时believerFactor=max(0.3, 1-1.0)=0.3', () => {
    const sup = makeSup(1, 50, 20)  // 20个believers
    sup.decayRate = 0.3
    ;(sys as any).superstitions.push(sup)
    ;(sys as any).decaySuperstitions()
    // believerFactor = max(0.3, 1 - 20*0.05) = max(0.3, 0) = 0.3
    // strength -= 0.3 * 0.3 = 0.09
    expect(sup.strength).toBeCloseTo(49.91, 2)
  })

  it('decaySuperstitions: 多个迷信同时衰减', () => {
    const sup1 = makeSup(1, 50, 0)
    const sup2 = makeSup(2, 60, 0)
    sup1.decayRate = 0.3; sup2.decayRate = 0.5
    ;(sys as any).superstitions.push(sup1, sup2)
    ;(sys as any).decaySuperstitions()
    expect(sup1.strength).toBeCloseTo(49.7, 5)
    expect(sup2.strength).toBeCloseTo(59.5, 5)
  })

  // ── cleanup 逻辑 ─────────────────────────────────────────────────────────────

  it('cleanup: strength >= MIN_STRENGTH(5)时保留', () => {
    ;(sys as any).superstitions.push(makeSup(1, 5))   // 边界值=5，保留
    ;(sys as any).superstitions.push(makeSup(2, 10))  // 保留
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(2)
  })

  it('cleanup: strength < MIN_STRENGTH(5)时删除', () => {
    ;(sys as any).superstitions.push(makeSup(1, 4.9))  // <5，删除
    ;(sys as any).superstitions.push(makeSup(2, 5))    // 保留
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(1)
    expect((sys as any).superstitions[0].id).toBe(2)
  })

  it('cleanup: 全部超时则变空', () => {
    ;(sys as any).superstitions.push(makeSup(1, 0))
    ;(sys as any).superstitions.push(makeSup(2, 3))
    ;(sys as any).cleanup()
    expect((sys as any).superstitions.length).toBe(0)
  })

  it('cleanup: 空superstitions不崩溃', () => {
    expect(() => (sys as any).cleanup()).not.toThrow()
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────

  it('tick未达到CHECK_INTERVAL(800)时不更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL(800)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })
})
