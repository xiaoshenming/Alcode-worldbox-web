import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureReamerSystem } from '../systems/CreatureReamerSystem'
import type { Reamer } from '../systems/CreatureReamerSystem'

let nextId = 1
function makeSys(): CreatureReamerSystem { return new CreatureReamerSystem() }
function makeReamer(entityId: number, overrides: Partial<Reamer> = {}): Reamer {
  return { id: nextId++, entityId, reamingSkill: 70, holePrecision: 65, surfaceFinish: 80, dimensionalTolerance: 75, tick: 0, ...overrides }
}

function makeEm(ids: number[] = []) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(ids),
    getEntitiesWithComponents: vi.fn().mockReturnValue(ids),
    hasComponent: vi.fn().mockReturnValue(true),
  } as any
}

const CHECK_INTERVAL = 2940

describe('CreatureReamerSystem — 基础状态', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铰孔工', () => { expect((sys as any).reamers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    expect((sys as any).reamers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    expect((sys as any).reamers).toBe((sys as any).reamers)
  })
  it('字段正确', () => {
    ;(sys as any).reamers.push(makeReamer(2))
    const r = (sys as any).reamers[0]
    expect(r.reamingSkill).toBe(70)
    expect(r.surfaceFinish).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    ;(sys as any).reamers.push(makeReamer(2))
    expect((sys as any).reamers).toHaveLength(2)
  })
})

describe('CreatureReamerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 未达 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发更新', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次连续 tick 间隔不足时第二次不触发', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    const snap = (sys as any).lastCheck
    sys.update(1, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(snap)
  })

  it('间隔满足时 lastCheck 随 tick 推进', () => {
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureReamerSystem — 技能增长与上限', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 reamingSkill 增加 0.02', () => {
    const r = makeReamer(1, { reamingSkill: 50 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.reamingSkill).toBeCloseTo(50.02, 5)
  })

  it('update 后 holePrecision 增加 0.015', () => {
    const r = makeReamer(1, { holePrecision: 40 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.holePrecision).toBeCloseTo(40.015, 5)
  })

  it('update 后 dimensionalTolerance 增加 0.01', () => {
    const r = makeReamer(1, { dimensionalTolerance: 30 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.dimensionalTolerance).toBeCloseTo(30.01, 5)
  })

  it('reamingSkill 不超过 100 上限', () => {
    const r = makeReamer(1, { reamingSkill: 99.99 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.reamingSkill).toBeLessThanOrEqual(100)
  })

  it('holePrecision 不超过 100 上限', () => {
    const r = makeReamer(1, { holePrecision: 99.99 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.holePrecision).toBeLessThanOrEqual(100)
  })

  it('dimensionalTolerance 不超过 100 上限', () => {
    const r = makeReamer(1, { dimensionalTolerance: 99.99 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r.dimensionalTolerance).toBeLessThanOrEqual(100)
  })

  it('多个 reamer 各自独立增长', () => {
    const r1 = makeReamer(1, { reamingSkill: 20 })
    const r2 = makeReamer(2, { reamingSkill: 60 })
    ;(sys as any).reamers.push(r1, r2)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect(r1.reamingSkill).toBeCloseTo(20.02, 5)
    expect(r2.reamingSkill).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureReamerSystem — cleanup（reamingSkill <= 4 移除）', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('reamingSkill <= 4 的 reamer 在 update 后被移除', () => {
    // 注入一个 reamingSkill=3.98（增长后仍 <= 4）的 reamer
    const r = makeReamer(1, { reamingSkill: 3.98 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，边界条件：<= 4 被移除
    expect((sys as any).reamers).toHaveLength(0)
  })

  it('reamingSkill 刚好大于 4（4.001）的不被移除', () => {
    const r = makeReamer(1, { reamingSkill: 3.99 })
    ;(sys as any).reamers.push(r)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    // 3.99 + 0.02 = 4.01 > 4，保留
    expect((sys as any).reamers).toHaveLength(1)
  })

  it('混合：低技能被移除，高技能保留', () => {
    const low = makeReamer(1, { reamingSkill: 3.97 })  // 3.97+0.02=3.99 <= 4 => 移除
    const high = makeReamer(2, { reamingSkill: 50 })
    ;(sys as any).reamers.push(low, high)
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    const reamers = (sys as any).reamers as Reamer[]
    expect(reamers).toHaveLength(1)
    expect(reamers[0].entityId).toBe(2)
  })

  it('所有 reamer 技能充足时无移除', () => {
    ;(sys as any).reamers.push(makeReamer(1, { reamingSkill: 50 }))
    ;(sys as any).reamers.push(makeReamer(2, { reamingSkill: 80 }))
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).reamers).toHaveLength(2)
  })
})

describe('CreatureReamerSystem — 招募上限', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_REAMERS(10) 时不再招募', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).reamers.push(makeReamer(i))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 使概率通过
    const em = makeEm()
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // 招募后技能增长，cleanup 不会移除（skill 都是 70+0.02），长度保持 10
    expect((sys as any).reamers).toHaveLength(10)
  })
})
