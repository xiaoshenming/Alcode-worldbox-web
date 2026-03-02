import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAnvilsmithSystem } from '../systems/CreatureAnvilsmithSystem'
import type { Anvilsmith } from '../systems/CreatureAnvilsmithSystem'

// CHECK_INTERVAL=2650, RECRUIT_CHANCE=0.0013, MAX_ANVILSMITHS=10
// 技能递增: heavyForging+0.02/tick, hornShaping+0.015/tick, outputQuality+0.01/tick
// cleanup: heavyForging<=4时删除

let nextId = 1
function makeSys(): CreatureAnvilsmithSystem { return new CreatureAnvilsmithSystem() }
function makeAnvilsmith(entityId: number, overrides: Partial<Anvilsmith> = {}): Anvilsmith {
  return { id: nextId++, entityId, heavyForging: 30, surfaceGrinding: 25, hornShaping: 20, outputQuality: 35, tick: 0, ...overrides }
}

describe('CreatureAnvilsmithSystem', () => {
  let sys: CreatureAnvilsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铁砧匠', () => { expect((sys as any).anvilsmiths).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
    expect((sys as any).anvilsmiths[0].entityId).toBe(1)
  })
  it('多个全部返回', () => {
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1))
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(2))
    expect((sys as any).anvilsmiths).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const a = makeAnvilsmith(10, { heavyForging: 80, surfaceGrinding: 75, hornShaping: 70, outputQuality: 65 })
    ;(sys as any).anvilsmiths.push(a)
    const r = (sys as any).anvilsmiths[0]
    expect(r.heavyForging).toBe(80); expect(r.surfaceGrinding).toBe(75)
    expect(r.hornShaping).toBe(70); expect(r.outputQuality).toBe(65)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2650)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2650
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2650)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2650)  // 2650 >= 2650
    expect((sys as any).lastCheck).toBe(2650)
  })

  // ── 技能递增 + cleanup ────────────────────────────────────────────────────

  it('update后heavyForging+0.02（上限100）', () => {
    const em = {} as any
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2650)
    expect((sys as any).anvilsmiths[0].heavyForging).toBeCloseTo(50.02, 5)
  })

  it('update后hornShaping+0.015（上限100）', () => {
    const em = {} as any
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { hornShaping: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2650)
    expect((sys as any).anvilsmiths[0].hornShaping).toBeCloseTo(60.015, 5)
  })

  it('heavyForging上限为100', () => {
    const em = {} as any
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2650)
    expect((sys as any).anvilsmiths[0].heavyForging).toBe(100)
  })

  it('cleanup: heavyForging<=4时删除（先递增后cleanup，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(1, { heavyForging: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).anvilsmiths.push(makeAnvilsmith(2, { heavyForging: 50 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2650)
    expect((sys as any).anvilsmiths.length).toBe(1)
    expect((sys as any).anvilsmiths[0].entityId).toBe(2)
  })
})
