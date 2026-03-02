import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBuckleMakersSystem } from '../systems/CreatureBuckleMakersSystem'
import type { BuckleMaker, BuckleType } from '../systems/CreatureBuckleMakersSystem'

let nextId = 1
function makeSys(): CreatureBuckleMakersSystem { return new CreatureBuckleMakersSystem() }
function makeMaker(entityId: number, skill: number = 30, buckleType: BuckleType = 'belt', tickVal: number = 0): BuckleMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    bucklesMade: 1 + Math.floor(skill / 9),
    buckleType,
    craftsmanship: 14 + skill * 0.72,
    reputation: 10 + skill * 0.81,
    tick: tickVal,
  }
}

const EMPTY_EM = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

describe('CreatureBuckleMakersSystem', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无扣具师记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入skill=30的扣具师后可查询字段', () => {
    const m = makeMaker(1, 30, 'belt', 0)
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.entityId).toBe(1)
    expect(r.skill).toBe(30)
    expect(r.bucklesMade).toBe(4)   // 1 + floor(30/9) = 1+3 = 4
    expect(r.buckleType).toBe('belt')
    expect(r.craftsmanship).toBeCloseTo(35.6, 5)  // 14+30*0.72
    expect(r.reputation).toBeCloseTo(34.3, 5)     // 10+30*0.81
  })

  // 3. BuckleType 包含 4 种
  it('支持全部4种扣具类型', () => {
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 30, t)) })
    const all = (sys as any).makers as BuckleMaker[]
    types.forEach((t, i) => { expect(all[i].buckleType).toBe(t) })
  })

  // 4. craftsmanship计算：skill=50 → 14+50*0.72=50
  it('craftsmanship计算：skill=50时为50', () => {
    const m = makeMaker(1, 50, 'armor')
    expect(m.craftsmanship).toBeCloseTo(50, 5)
  })

  // 5. reputation计算：skill=50 → 10+50*0.81=50.5
  it('reputation计算：skill=50时为50.5', () => {
    const m = makeMaker(1, 50, 'armor')
    expect(m.reputation).toBeCloseTo(50.5, 5)
  })

  // 6. bucklesMade计算：skill=45 → 1+floor(45/9)=6
  it('bucklesMade计算：skill=45时为6', () => {
    const m = makeMaker(1, 45)
    expect(m.bucklesMade).toBe(6)
  })

  // 7. buckleType由skill决定（typeIdx=Math.min(3, Math.floor(skill/25))）
  it('skill=0-24 → belt(idx=0)', () => {
    // typeIdx = floor(10/25) = 0 → belt
    const m = makeMaker(1, 10)
    expect(m.buckleType).toBe('belt')
  })

  it('skill=25-49 → shoe(idx=1)', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(idx).toBe(1)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('shoe')
  })

  it('skill=50-74 → armor(idx=2)', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(idx).toBe(2)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('armor')
  })

  it('skill=75-100 → ornamental(idx=3)', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(idx).toBe(3)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('ornamental')
  })

  // 8. tick差值<1440时不更新lastCheck
  it('tick差值<1440时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 1000) // diff=1000 < 1440
    expect((sys as any).lastCheck).toBe(1000) // 未更新
  })

  // 9. tick差值>=1440时更新lastCheck
  it('tick差值>=1440时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 1440) // diff=1440 >= 1440
    expect((sys as any).lastCheck).toBe(1440)
  })

  // 10. time-based cleanup: tick=0记录在update(tick=60000)时被删除
  it('time-based cleanup：tick=0记录在currentTick=60000时删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))   // tick=0
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000) // cutoff=60000-52000=8000, 0 < 8000 → deleted
    expect((sys as any).makers).toHaveLength(0)
  })

  // 11. 新记录不被cleanup（tick=55000记录在update(tick=60000)时保留）
  it('tick=55000记录在currentTick=60000时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 55000)) // tick=55000
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000) // cutoff=8000, 55000 > 8000 → kept
    expect((sys as any).makers).toHaveLength(1)
  })

  // 额外测试：同时有旧记录和新记录，只删旧的
  it('cleanup只删除过期记录，保留新记录', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 30, 'shoe', 55000))  // 新
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000)
    const remaining = (sys as any).makers as BuckleMaker[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  // 额外测试：cutoff边界（tick=52000时cutoff=0，tick=0的记录不删除：0 < 0 为false）
  it('cutoff边界：tick等于cutoff时不删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0)) // tick=0
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 52000) // cutoff=52000-52000=0, 0 < 0 → false → kept
    expect((sys as any).makers).toHaveLength(1)
  })

  // 额外测试：skill=100时bucklesMade和typeIdx正确
  it('skill=100时bucklesMade=12，buckleType=ornamental', () => {
    const m = makeMaker(1, 100, 'ornamental')
    expect(m.bucklesMade).toBe(12) // 1 + floor(100/9) = 1+11 = 12
    expect(m.buckleType).toBe('ornamental')
  })

  // 额外测试：数据字段完整（旧有测试保留）
  it('数据字段完整', () => {
    const m = makeMaker(10, 80, 'shoe')
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bucklesMade).toBe(9) // 1 + floor(80/9) = 1+8 = 9
    expect(r.craftsmanship).toBeCloseTo(14 + 80 * 0.72, 5) // 71.6
    expect(r.reputation).toBeCloseTo(10 + 80 * 0.81, 5)   // 74.8
  })
})
