import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureForgerSystem } from '../systems/CreatureForgerSystem'
import type { Forger } from '../systems/CreatureForgerSystem'

let nextId = 1
function makeSys(): CreatureForgerSystem { return new CreatureForgerSystem() }
function makeForger(entityId: number, overrides: Partial<Forger> = {}): Forger {
  return {
    id: nextId++, entityId,
    forgingSkill: 50, hammerControl: 60, metalReading: 70, structuralIntegrity: 80, tick: 0,
    ...overrides
  }
}

const em = {} as any
const CHECK_INTERVAL = 2900

describe('CreatureForgerSystem', () => {
  let sys: CreatureForgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 基础状态测试 ----
  it('初始无锻造师', () => {
    expect((sys as any).forgers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).forgers.push(makeForger(1))
    expect((sys as any).forgers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).forgers.push(makeForger(1))
    ;(sys as any).forgers.push(makeForger(2))
    expect((sys as any).forgers).toHaveLength(2)
  })

  it('四字段数据完整（forgingSkill/hammerControl/metalReading/structuralIntegrity）', () => {
    const f = makeForger(10)
    f.forgingSkill = 90; f.hammerControl = 85; f.metalReading = 80; f.structuralIntegrity = 75
    ;(sys as any).forgers.push(f)
    const r = (sys as any).forgers[0]
    expect(r.forgingSkill).toBe(90)
    expect(r.hammerControl).toBe(85)
    expect(r.metalReading).toBe(80)
    expect(r.structuralIntegrity).toBe(75)
  })

  // ---- tick/CHECK_INTERVAL 测试 ----
  it('tick差值<2900时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2900时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick恰好等于lastCheck+2900时触发更新', () => {
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 3000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(3000 + CHECK_INTERVAL)
  })

  // ---- 技能递增测试 ----
  it('update后forgingSkill+0.02', () => {
    ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers[0].forgingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后hammerControl+0.015', () => {
    ;(sys as any).forgers.push(makeForger(1, { hammerControl: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers[0].hammerControl).toBeCloseTo(60.015, 5)
  })

  it('update后structuralIntegrity+0.01', () => {
    ;(sys as any).forgers.push(makeForger(1, { structuralIntegrity: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers[0].structuralIntegrity).toBeCloseTo(80.01, 5)
  })

  // ---- 上限测试 ----
  it('forgingSkill上限100，不超过100', () => {
    ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers[0].forgingSkill).toBe(100)
  })

  it('hammerControl上限100，不超过100', () => {
    ;(sys as any).forgers.push(makeForger(1, { hammerControl: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers[0].hammerControl).toBe(100)
  })

  // ---- cleanup测试（先递增后cleanup）----
  it('cleanup: forgingSkill<=4时删除（3.98边界，递增后恰好=4）', () => {
    // 3.98 + 0.02 = 4.00 -> <= 4 -> 被删除
    ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 3.98 }))
    ;(sys as any).forgers.push(makeForger(2, { forgingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const remaining = (sys as any).forgers
    // entityId=1的锻造师forgingSkill从3.98→4.00，恰好<=4，应被删除
    expect(remaining.every((f: Forger) => f.entityId !== 1)).toBe(true)
    // entityId=2的锻造师应保留
    expect(remaining.some((f: Forger) => f.entityId === 2)).toBe(true)
  })

  it('forgingSkill>4时保留（4.01+0.02=4.03不删除）', () => {
    ;(sys as any).forgers.push(makeForger(1, { forgingSkill: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).forgers).toHaveLength(1)
  })

  it('metalReading字段shaftBinding不在递增列表', () => {
    const f = makeForger(1, { metalReading: 55 })
    ;(sys as any).forgers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // metalReading不在递增列表，保持不变
    expect((sys as any).forgers[0].metalReading).toBe(55)
  })
})
