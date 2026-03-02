import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBevellerSystem } from '../systems/CreatureBevellerSystem'
import type { Beveller } from '../systems/CreatureBevellerSystem'

// CHECK_INTERVAL=2900, RECRUIT_CHANCE=0.0015, MAX_BEVELLERS=10
// 技能递增: bevellingSkill+0.02, angleAccuracy+0.015, chamferControl+0.01
// cleanup: bevellingSkill<=4 时删除

let nextId = 1
function makeSys(): CreatureBevellerSystem { return new CreatureBevellerSystem() }
function makeBeveller(entityId: number, overrides: Partial<Beveller> = {}): Beveller {
  return { id: nextId++, entityId, bevellingSkill: 20, angleAccuracy: 25, edgeSmoothing: 15, chamferControl: 20, tick: 0, ...overrides }
}

describe('CreatureBevellerSystem', () => {
  let sys: CreatureBevellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ────────────────────────────────────────────────────────────

  it('初始无斜切师', () => { expect((sys as any).bevellers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toHaveLength(1)
    expect((sys as any).bevellers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toBe((sys as any).bevellers)
  })

  it('多个斜切师全部返回', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    ;(sys as any).bevellers.push(makeBeveller(2))
    expect((sys as any).bevellers).toHaveLength(2)
  })

  it('四字��数据完整', () => {
    const b = makeBeveller(10, { bevellingSkill: 80, angleAccuracy: 75, edgeSmoothing: 70, chamferControl: 65 })
    ;(sys as any).bevellers.push(b)
    const r = (sys as any).bevellers[0]
    expect(r.bevellingSkill).toBe(80)
    expect(r.angleAccuracy).toBe(75)
    expect(r.edgeSmoothing).toBe(70)
    expect(r.chamferControl).toBe(65)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2900)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2900)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)  // 2900 >= 2900
    expect((sys as any).lastCheck).toBe(2900)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2899)  // 2899 < 2900
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 技能递增 ──────────────────────────────────────────────────────────────

  it('update后bevellingSkill+0.02', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后angleAccuracy+0.015', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { angleAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].angleAccuracy).toBeCloseTo(40.015, 5)
  })

  it('update后chamferControl+0.01', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { chamferControl: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].chamferControl).toBeCloseTo(30.01, 5)
  })

  it('bevellingSkill上限为100', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers[0].bevellingSkill).toBe(100)
  })

  // ── cleanup: bevellingSkill<=4 时删除 ────────────────────────────────────

  it('cleanup: bevellingSkill<=4时删除（先+0.02后比较，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 20 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
    expect((sys as any).bevellers[0].entityId).toBe(2)
  })

  it('cleanup: bevellingSkill刚好>4时保留', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 3.99 }))  // 3.99+0.02=4.01>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(1)
  })

  it('cleanup: 全部技能过低时清空', () => {
    const em = {} as any
    ;(sys as any).bevellers.push(makeBeveller(1, { bevellingSkill: 1 }))
    ;(sys as any).bevellers.push(makeBeveller(2, { bevellingSkill: 2 }))
    ;(sys as any).bevellers.push(makeBeveller(3, { bevellingSkill: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2900)
    expect((sys as any).bevellers.length).toBe(0)
  })
})
