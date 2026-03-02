import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAnnealerSystem } from '../systems/CreatureAnnealerSystem'
import type { Annealer } from '../systems/CreatureAnnealerSystem'

// CHECK_INTERVAL=2860, RECRUIT_CHANCE=0.0015, MAX_ANNEALERS=10
// 技能递增: annealingSkill+0.02/tick, temperatureCycling+0.015/tick, grainRefinement+0.01/tick
// cleanup: annealingSkill<=4时删除

let nextAnnId = 1
function makeAnnSys(): CreatureAnnealerSystem { return new CreatureAnnealerSystem() }
function makeAnnealer(entityId: number, overrides: Partial<Annealer> = {}): Annealer {
  return { id: nextAnnId++, entityId, annealingSkill: 20, temperatureCycling: 25, coolingRate: 10, grainRefinement: 15, tick: 0, ...overrides }
}

describe('CreatureAnnealerSystem', () => {
  let sys: CreatureAnnealerSystem
  beforeEach(() => { sys = makeAnnSys(); nextAnnId = 1 })

  it('初始无退火师', () => { expect((sys as any).annealers).toHaveLength(0) })
  it('注入退火师后可查询', () => {
    ;(sys as any).annealers.push(makeAnnealer(1))
    expect((sys as any).annealers).toHaveLength(1)
    expect((sys as any).annealers[0].entityId).toBe(1)
  })
  it('多个退火师全部返回', () => {
    ;(sys as any).annealers.push(makeAnnealer(1))
    ;(sys as any).annealers.push(makeAnnealer(2))
    ;(sys as any).annealers.push(makeAnnealer(3))
    expect((sys as any).annealers).toHaveLength(3)
  })
  it('退火师数据完整', () => {
    const a = makeAnnealer(10, { annealingSkill: 75, temperatureCycling: 60, coolingRate: 30, grainRefinement: 50 })
    ;(sys as any).annealers.push(a)
    const r = (sys as any).annealers[0]
    expect(r.annealingSkill).toBe(75); expect(r.temperatureCycling).toBe(60)
    expect(r.coolingRate).toBe(30); expect(r.grainRefinement).toBe(50)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(2860)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 2860
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(2860)时更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2860)  // 2860 >= 2860
    expect((sys as any).lastCheck).toBe(2860)
  })

  // ── 技能递增 + cleanup ────────────────────────────────────────────────────

  it('update后annealingSkill+0.02', () => {
    const em = {} as any
    ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2860)
    expect((sys as any).annealers[0].annealingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后temperatureCycling+0.015', () => {
    const em = {} as any
    ;(sys as any).annealers.push(makeAnnealer(1, { temperatureCycling: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2860)
    expect((sys as any).annealers[0].temperatureCycling).toBeCloseTo(40.015, 5)
  })

  it('annealingSkill上限为100', () => {
    const em = {} as any
    ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2860)
    expect((sys as any).annealers[0].annealingSkill).toBe(100)
  })

  it('cleanup: annealingSkill<=4时删除（先递增后cleanup，3.98+0.02=4.00<=4）', () => {
    const em = {} as any
    ;(sys as any).annealers.push(makeAnnealer(1, { annealingSkill: 3.98 }))  // 3.98+0.02=4.00<=4，删除
    ;(sys as any).annealers.push(makeAnnealer(2, { annealingSkill: 30 }))    // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2860)
    expect((sys as any).annealers.length).toBe(1)
    expect((sys as any).annealers[0].entityId).toBe(2)
  })
})
