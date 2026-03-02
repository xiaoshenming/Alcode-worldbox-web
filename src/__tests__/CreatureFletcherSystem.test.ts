import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFletcherSystem } from '../systems/CreatureFletcherSystem'
import type { Fletcher } from '../systems/CreatureFletcherSystem'

let nextId = 1
function makeSys(): CreatureFletcherSystem { return new CreatureFletcherSystem() }
function makeFletcher(entityId: number, overrides: Partial<Fletcher> = {}): Fletcher {
  return {
    id: nextId++, entityId,
    featherCutting: 50, shaftBinding: 60, flightTuning: 70, outputQuality: 80, tick: 0,
    ...overrides
  }
}

const em = {} as any
const CHECK_INTERVAL = 2550

describe('CreatureFletcherSystem', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 基础状态测试 ----
  it('初始无箭羽工', () => {
    expect((sys as any).fletchers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect((sys as any).fletchers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect((sys as any).fletchers).toHaveLength(2)
  })

  it('四字段数据完整（featherCutting/shaftBinding/flightTuning/outputQuality）', () => {
    const f = makeFletcher(10)
    f.featherCutting = 90; f.shaftBinding = 85; f.flightTuning = 80; f.outputQuality = 75
    ;(sys as any).fletchers.push(f)
    const r = (sys as any).fletchers[0]
    expect(r.featherCutting).toBe(90)
    expect(r.shaftBinding).toBe(85)
    expect(r.flightTuning).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  // ---- tick/CHECK_INTERVAL 测试 ----
  it('tick差值<2550时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2550时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick恰好等于lastCheck+2550时触发更新', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })

  // ---- 技能递增测试 ----
  it('update后featherCutting+0.02', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBeCloseTo(50.02, 5)
  })

  it('update后flightTuning+0.015', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { flightTuning: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].flightTuning).toBeCloseTo(70.015, 5)
  })

  it('update后outputQuality+0.01', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { outputQuality: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].outputQuality).toBeCloseTo(80.01, 5)
  })

  // ---- 上限测试 ----
  it('featherCutting上限100，不超过100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].featherCutting).toBe(100)
  })

  it('flightTuning上限100，不超过100', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { flightTuning: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).fletchers[0].flightTuning).toBe(100)
  })

  // ---- cleanup测试 ----
  it('featherCutting<=4时删除该fletcher', () => {
    // 3.98 + 0.02 = 4.00 -> 恰好等于4 -> 被删除
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 3.98 }))
    ;(sys as any).fletchers.push(makeFletcher(2, { featherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    const remaining = (sys as any).fletchers
    // entityId=1的fletcher的featherCutting从3.98→4.00，恰好<=4，应被删除
    expect(remaining.every((f: Fletcher) => f.entityId !== 1)).toBe(true)
    // entityId=2的fletcher应保留
    expect(remaining.some((f: Fletcher) => f.entityId === 2)).toBe(true)
  })

  it('featherCutting>4时保留', () => {
    ;(sys as any).fletchers.push(makeFletcher(1, { featherCutting: 4.01 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 -> > 4 -> 保留
    expect((sys as any).fletchers).toHaveLength(1)
  })
})
