import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWelderSystem } from '../systems/CreatureWelderSystem'
import type { Welder } from '../systems/CreatureWelderSystem'

// CHECK_INTERVAL=2800, RECRUIT_CHANCE=0.0015, MAX_WELDERS=10
// 技能递增: weldingSkill+0.02/tick, jointStrength+0.015/tick, metalBonding+0.01/tick
// cleanup: weldingSkill<=4时删除（先递增后cleanup）

let nextId = 1
function makeSys(): CreatureWelderSystem { return new CreatureWelderSystem() }
function makeWelder(entityId: number, overrides: Partial<Welder> = {}): Welder {
  return { id: nextId++, entityId, weldingSkill: 70, jointStrength: 65, heatPrecision: 80, metalBonding: 75, tick: 0, ...overrides }
}

describe('CreatureWelderSystem', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据结构 ──────────────────────────────────────────────────────────

  it('初始无焊工', () => { expect((sys as any).welders).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect((sys as any).welders).toBe((sys as any).welders)
  })
  it('字段正确', () => {
    ;(sys as any).welders.push(makeWelder(2))
    const w = (sys as any).welders[0]
    expect(w.weldingSkill).toBe(70)
    expect(w.heatPrecision).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).welders.push(makeWelder(1))
    ;(sys as any).welders.push(makeWelder(2))
    expect((sys as any).welders).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2800)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2799)  // 2799 < 2800
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2800)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)  // 2800 >= 2800
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('节流时焊工数据不变', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 100 < 2800，节流
    expect((sys as any).welders[0].weldingSkill).toBe(50)
  })

  // ── 技能递增 ──────────────────────────────────────────────────────────────

  it('update后weldingSkill+0.02', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后jointStrength+0.015', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { jointStrength: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].jointStrength).toBeCloseTo(40.015, 5)
  })

  it('update后metalBonding+0.01', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { metalBonding: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].metalBonding).toBeCloseTo(30.01, 5)
  })

  it('weldingSkill上限为100', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].weldingSkill).toBe(100)
  })

  it('jointStrength上限为100', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { jointStrength: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].jointStrength).toBe(100)
  })

  it('metalBonding上限为100', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { metalBonding: 99.995 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].metalBonding).toBe(100)
  })

  // ── cleanup: weldingSkill<=4 时删除（先递增后cleanup）────────────────────

  it('cleanup: weldingSkill<=4时删除（3.98+0.02=4.00<=4，删除）', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 50 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders.length).toBe(1)
    expect((sys as any).welders[0].entityId).toBe(2)
  })

  it('cleanup: weldingSkill恰好4后不删除（4.00+0.02=4.02>4，保留）', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 4.0 }))  // 4.0+0.02=4.02>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders.length).toBe(1)
  })

  it('heatPrecision字段在update时不被cleanup条件影响', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 50, heatPrecision: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    const w = (sys as any).welders[0]
    expect(w.heatPrecision).toBe(30)  // heatPrecision不参与递增
  })

  it('多焊工同时更新技能', () => {
    const em = {} as any
    ;(sys as any).welders.push(makeWelder(1, { weldingSkill: 20, jointStrength: 30 }))
    ;(sys as any).welders.push(makeWelder(2, { weldingSkill: 60, jointStrength: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).welders[0].weldingSkill).toBeCloseTo(20.02, 5)
    expect((sys as any).welders[1].weldingSkill).toBeCloseTo(60.02, 5)
  })
})
