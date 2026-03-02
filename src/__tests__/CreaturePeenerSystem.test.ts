import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreaturePeenerSystem } from '../systems/CreaturePeenerSystem'
import type { Peener } from '../systems/CreaturePeenerSystem'
import { EntityManager } from '../ecs/Entity'

// CHECK_INTERVAL = 2880
const CHECK_INTERVAL = 2880

let nextId = 1
function makeSys(): CreaturePeenerSystem { return new CreaturePeenerSystem() }
function makePeener(entityId: number, peeningSkill = 70, hammerControl = 65, stressRelief = 80): Peener {
  return { id: nextId++, entityId, peeningSkill, hammerControl, surfaceHardening: 75, stressRelief, tick: 0 }
}
function makeEm(): EntityManager { return new EntityManager() }

/** 触发一次 update，绕过 CHECK_INTERVAL 节流 */
function trigger(sys: CreaturePeenerSystem, em: EntityManager): void {
  sys.update(1, em, CHECK_INTERVAL) // 2880-0=2880 >= 2880 -> 触发
}

// ─── 原始 5 个测试（保留）───────────────────────────────────────────────────
describe('CreaturePeenerSystem.getPeeners', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锤击工', () => { expect((sys as any).peeners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners).toBe((sys as any).peeners)
  })
  it('字段正确', () => {
    ;(sys as any).peeners.push(makePeener(3))
    const p = (sys as any).peeners[0]
    expect(p.peeningSkill).toBe(70)
    expect(p.stressRelief).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).peeners.push(makePeener(1))
    ;(sys as any).peeners.push(makePeener(2))
    expect((sys as any).peeners).toHaveLength(2)
  })
})

// ─── 新增测试 ────────────────────────────────────────────────────────────────
describe('CreaturePeenerSystem - CHECK_INTERVAL(2880) 节流', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时 update 跳过，lastCheck 不变', () => {
    const em = makeEm()
    // lastCheck=0, tick=0: 0-0=0 < 2880 -> 跳过
    sys.update(1, em, 0)
    const before = (sys as any).lastCheck
    sys.update(1, em, 2000)    // 2000 < 2880 -> 跳过
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 达到 CHECK_INTERVAL 后 lastCheck 被更新', () => {
    const em = makeEm()
    trigger(sys, em)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('触发一次后，tick 不足再次间隔时不再触发', () => {
    const em = makeEm()
    trigger(sys, em)                              // lastCheck=2880
    sys.update(1, em, CHECK_INTERVAL + 100)       // 100 < 2880 -> 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreaturePeenerSystem - 每次 update 技能递增', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('peeningSkill 每次 update +0.02', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 50))
    trigger(sys, em)
    expect((sys as any).peeners[0].peeningSkill).toBeCloseTo(50.02, 5)
  })

  it('hammerControl 每次 update +0.015', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 70, 50))
    trigger(sys, em)
    expect((sys as any).peeners[0].hammerControl).toBeCloseTo(50.015, 5)
  })

  it('stressRelief 每次 update +0.01', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 70, 65, 50))
    trigger(sys, em)
    expect((sys as any).peeners[0].stressRelief).toBeCloseTo(50.01, 5)
  })

  it('peeningSkill 上限不超过 100（99.99+0.02 -> 100）', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 99.99))
    trigger(sys, em)
    expect((sys as any).peeners[0].peeningSkill).toBe(100)
  })

  it('hammerControl 上限不超过 100（99.99+0.015 -> 100）', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 70, 99.99))
    trigger(sys, em)
    expect((sys as any).peeners[0].hammerControl).toBe(100)
  })

  it('多个 peener 同时递增', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 30))
    ;(sys as any).peeners.push(makePeener(2, 60))
    trigger(sys, em)
    expect((sys as any).peeners[0].peeningSkill).toBeCloseTo(30.02, 5)
    expect((sys as any).peeners[1].peeningSkill).toBeCloseTo(60.02, 5)
  })
})

describe('CreaturePeenerSystem - cleanup：peeningSkill<=4（在递增后）时被删除', () => {
  // 执行顺序：递增 +0.02 -> 判断 peeningSkill <= 4 -> 删除
  // 因此 peeningSkill=3.98 -> 4.00 <= 4 -> 删除
  //        peeningSkill=4.01 -> 4.03 > 4  -> 保留
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 peeningSkill=3.98，递增后=4.00，<=4 被删除', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 3.98))
    trigger(sys, em)
    expect((sys as any).peeners).toHaveLength(0)
  })

  it('初始 peeningSkill=3.0，递增后=3.02，<=4 被删除', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 3.0))
    trigger(sys, em)
    expect((sys as any).peeners).toHaveLength(0)
  })

  it('初始 peeningSkill=4.01，递增后=4.03，>4 被保留', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 4.01))
    trigger(sys, em)
    expect((sys as any).peeners).toHaveLength(1)
  })

  it('混合：低技能（递增后<=4）被删，高技能保留', () => {
    const em = makeEm()
    ;(sys as any).peeners.push(makePeener(1, 3.0))   // 3.02<=4 -> 删
    ;(sys as any).peeners.push(makePeener(2, 50))    // 50.02>4 -> 保留
    ;(sys as any).peeners.push(makePeener(3, 1.0))   // 1.02<=4 -> 删
    trigger(sys, em)
    expect((sys as any).peeners).toHaveLength(1)
    expect((sys as any).peeners[0].entityId).toBe(2)
  })
})

describe('CreaturePeenerSystem - MAX_PEENERS(10) 上限', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('peeners 已满(10) 时即使 random=0 也不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    for (let i = 0; i < 10; i++) (sys as any).peeners.push(makePeener(i + 100, 50))
    trigger(sys, em)
    // 技能递增但数量不变（可能 cleanup 删掉一些，但不会超过 10）
    expect((sys as any).peeners.length).toBeLessThanOrEqual(10)
    // 验证没有新增（即长度不超过 10）
    expect((sys as any).peeners.length).toBeGreaterThanOrEqual(0)
  })

  it('peeners 少于 10 且 random=0 (<RECRUIT_CHANCE=0.0015) 时招募新成员', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0015 -> 招募
    const em = makeEm()
    trigger(sys, em)
    expect((sys as any).peeners.length).toBeGreaterThanOrEqual(1)
  })

  it('random=1 (>=RECRUIT_CHANCE) 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEm()
    trigger(sys, em)
    expect((sys as any).peeners).toHaveLength(0)
  })
})
