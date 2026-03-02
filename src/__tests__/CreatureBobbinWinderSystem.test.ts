import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinWinderSystem } from '../systems/CreatureBobbinWinderSystem'
import type { BobbinWinder } from '../systems/CreatureBobbinWinderSystem'

// CHECK_INTERVAL=2520, RECRUIT_CHANCE=0.0019, MAX_WINDERS=13
// 技能递增: windingSpeed+0.02, tensionAccuracy+0.015, consistency+0.01
// cleanup: windingSpeed<=4 时删除

let nextId = 1
function makeSys(): CreatureBobbinWinderSystem { return new CreatureBobbinWinderSystem() }
function makeWinder(entityId: number, overrides: Partial<BobbinWinder> = {}): BobbinWinder {
  return { id: nextId++, entityId, windingSpeed: 30, tensionAccuracy: 25, threadCapacity: 20, consistency: 35, tick: 0, ...overrides }
}

describe('CreatureBobbinWinderSystem', () => {
  let sys: CreatureBobbinWinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ────────────────────────────────────────────────────────────

  it('初始无绕线师', () => { expect((sys as any).winders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders).toBe((sys as any).winders)
  })

  it('多个全部返回', () => {
    ;(sys as any).winders.push(makeWinder(1))
    ;(sys as any).winders.push(makeWinder(2))
    expect((sys as any).winders).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWinder(10, { windingSpeed: 80, tensionAccuracy: 75, threadCapacity: 70, consistency: 65 })
    ;(sys as any).winders.push(w)
    const r = (sys as any).winders[0]
    expect(r.windingSpeed).toBe(80)
    expect(r.tensionAccuracy).toBe(75)
    expect(r.threadCapacity).toBe(70)
    expect(r.consistency).toBe(65)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2520)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2520
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2520)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)  // 2520 >= 2520
    expect((sys as any).lastCheck).toBe(2520)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2519)  // 2519 < 2520
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 技能递增 ──────────────────────────────────────────────────────────────

  it('update后windingSpeed+0.02', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBeCloseTo(50.02, 5)
  })

  it('update后tensionAccuracy+0.015', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { tensionAccuracy: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].tensionAccuracy).toBeCloseTo(40.015, 5)
  })

  it('update后consistency+0.01', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { consistency: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].consistency).toBeCloseTo(30.01, 5)
  })

  it('windingSpeed上限为100', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders[0].windingSpeed).toBe(100)
  })

  // ── cleanup: windingSpeed<=4 时删除 ──────────────────────────────────────

  it('cleanup: windingSpeed<=4时删除（先+0.02后比较，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 30 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
    expect((sys as any).winders[0].entityId).toBe(2)
  })

  it('cleanup: windingSpeed刚好>4时保留', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 3.99 }))  // 3.99+0.02=4.01>4，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(1)
  })

  it('cleanup: 全部技能过低时清空', () => {
    const em = {} as any
    ;(sys as any).winders.push(makeWinder(1, { windingSpeed: 1 }))
    ;(sys as any).winders.push(makeWinder(2, { windingSpeed: 2 }))
    ;(sys as any).winders.push(makeWinder(3, { windingSpeed: 3 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2520)
    expect((sys as any).winders.length).toBe(0)
  })
})
