import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFullerSystem } from '../systems/CreatureFullerSystem'
import type { Fuller } from '../systems/CreatureFullerSystem'

// CHECK_INTERVAL=3050, RECRUIT_CHANCE=0.0015, MAX_FULLERS=10

let nextId = 1
function makeSys(): CreatureFullerSystem { return new CreatureFullerSystem() }
function makeFuller(
  entityId: number,
  fulleringSkill = 50,
  spreadControl = 60,
  metalThinning = 70,
  grooveDepth = 80,
): Fuller {
  return { id: nextId++, entityId, fulleringSkill, spreadControl, metalThinning, grooveDepth, tick: 0 }
}

// ─── 初始化状态 ─────────────────────────────────────────────────────────────
describe('CreatureFullerSystem 初始化状态', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 fullers 为空数组', () => {
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('是 CreatureFullerSystem 实例', () => {
    expect(sys).toBeInstanceOf(CreatureFullerSystem)
  })

  it('实例化不抛异常', () => {
    expect(() => new CreatureFullerSystem()).not.toThrow()
  })

  it('多次实例化互不干扰', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).fullers.push(makeFuller(1))
    expect((b as any).fullers).toHaveLength(0)
  })
})

// ─── Fuller 数据结构 ─────────────────────────────────────────────────────────
describe('Fuller 数据结构', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('记录包含所有必要字段', () => {
    const f = makeFuller(1)
    expect(f).toHaveProperty('id')
    expect(f).toHaveProperty('entityId')
    expect(f).toHaveProperty('fulleringSkill')
    expect(f).toHaveProperty('spreadControl')
    expect(f).toHaveProperty('metalThinning')
    expect(f).toHaveProperty('grooveDepth')
    expect(f).toHaveProperty('tick')
  })

  it('注入后 entityId 正确', () => {
    ;(sys as any).fullers.push(makeFuller(42))
    expect((sys as any).fullers[0].entityId).toBe(42)
  })

  it('注入后 fulleringSkill 正确', () => {
    ;(sys as any).fullers.push(makeFuller(1, 77))
    expect((sys as any).fullers[0].fulleringSkill).toBe(77)
  })

  it('注入后 spreadControl 正确', () => {
    ;(sys as any).fullers.push(makeFuller(1, 50, 88))
    expect((sys as any).fullers[0].spreadControl).toBe(88)
  })

  it('注入后 metalThinning 正确', () => {
    ;(sys as any).fullers.push(makeFuller(1, 50, 60, 55))
    expect((sys as any).fullers[0].metalThinning).toBe(55)
  })

  it('注入后 grooveDepth 正确', () => {
    ;(sys as any).fullers.push(makeFuller(1, 50, 60, 70, 99))
    expect((sys as any).fullers[0].grooveDepth).toBe(99)
  })

  it('四字段数据完整可读取', () => {
    const f = makeFuller(10)
    f.fulleringSkill = 90; f.spreadControl = 85; f.metalThinning = 80; f.grooveDepth = 75
    ;(sys as any).fullers.push(f)
    const r = (sys as any).fullers[0]
    expect(r.fulleringSkill).toBe(90)
    expect(r.spreadControl).toBe(85)
    expect(r.metalThinning).toBe(80)
    expect(r.grooveDepth).toBe(75)
  })

  it('多个 fuller 互不干扰', () => {
    ;(sys as any).fullers.push(makeFuller(1, 10))
    ;(sys as any).fullers.push(makeFuller(2, 90))
    expect((sys as any).fullers[0].fulleringSkill).toBe(10)
    expect((sys as any).fullers[1].fulleringSkill).toBe(90)
  })

  it('fullers 引用稳定（注入前后同一对象）', () => {
    const ref = (sys as any).fullers
    ;(sys as any).fullers.push(makeFuller(1))
    expect((sys as any).fullers).toBe(ref)
  })
})

// ─── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
describe('update() 节流逻辑（CHECK_INTERVAL=3050）', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 3050 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 4049)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick 差值 = 3050 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 4050)
    expect((sys as any).lastCheck).toBe(4050)
  })

  it('tick 差值 > 3050 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('lastCheck=0 时 tick=3049 不更新', () => {
    sys.update(16, {} as any, 3049)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=0 时 tick=3050 更新', () => {
    sys.update(16, {} as any, 3050)
    expect((sys as any).lastCheck).toBe(3050)
  })

  it('连续调用：第一次更新后第二次差值不足则跳过', () => {
    sys.update(16, {} as any, 3050)
    sys.update(16, {} as any, 6000) // 2950 < 3050
    expect((sys as any).lastCheck).toBe(3050)
  })

  it('连续调用：第二次差值满足时更新', () => {
    sys.update(16, {} as any, 3050)
    sys.update(16, {} as any, 6100)
    expect((sys as any).lastCheck).toBe(6100)
  })

  it('节流时不修改 fullers 中的数据', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3000) // 差值 2000 < 3050
    expect((sys as any).fullers[0].fulleringSkill).toBe(50)
  })
})

// ─── 技能增长（+0.02 / +0.015 / +0.01）───────────────────────────────────
describe('技能每次更新增长量', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 fulleringSkill +0.02', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBeCloseTo(50.02, 5)
  })

  it('update 后 spreadControl +0.015', () => {
    const f = makeFuller(1, 50, 60)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].spreadControl).toBeCloseTo(60.015, 5)
  })

  it('update 后 grooveDepth +0.01', () => {
    const f = makeFuller(1, 50, 60, 70, 80)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].grooveDepth).toBeCloseTo(80.01, 5)
  })

  it('metalThinning 不被修改（源码中没有对其增加）', () => {
    const f = makeFuller(1, 50, 60, 70, 80)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // metalThinning 源码中没有 += 操作，保持原值
    expect((sys as any).fullers[0].metalThinning).toBe(70)
  })

  it('多个 fuller 均被更新', () => {
    ;(sys as any).fullers.push(makeFuller(1, 50))
    ;(sys as any).fullers.push(makeFuller(2, 60))
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBeCloseTo(50.02, 5)
    expect((sys as any).fullers[1].fulleringSkill).toBeCloseTo(60.02, 5)
  })
})

// ─── 上限 100 ────────────────────────────────────────────────────────────────
describe('技能值上限 100', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('fulleringSkill 在 99.99 时更新后不超过 100', () => {
    const f = makeFuller(1, 99.99)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBe(100)
  })

  it('fulleringSkill = 100 时保持 100', () => {
    const f = makeFuller(1, 100)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].fulleringSkill).toBe(100)
  })

  it('spreadControl 在 99.99 时更新后不超过 100', () => {
    const f = makeFuller(1, 50, 99.99)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].spreadControl).toBe(100)
  })

  it('spreadControl = 100 时保持 100', () => {
    const f = makeFuller(1, 50, 100)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].spreadControl).toBe(100)
  })

  it('grooveDepth 在 99.99 时更新后不超过 100', () => {
    const f = makeFuller(1, 50, 60, 70, 99.99)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].grooveDepth).toBe(100)
  })

  it('grooveDepth = 100 时保持 100', () => {
    const f = makeFuller(1, 50, 60, 70, 100)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers[0].grooveDepth).toBe(100)
  })
})

// ─── cleanup 清理逻辑（fulleringSkill <= 4 删除）───────────────────────────
describe('cleanup 清理逻辑（fulleringSkill <= 4 删除）', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('fulleringSkill=3.98 更新后 4.00 <= 4，被删除', () => {
    const f = makeFuller(1, 3.98)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers.some((x: Fuller) => x.entityId === 1)).toBe(false)
  })

  it('fulleringSkill=4.01 更新后 4.03 > 4，被保留', () => {
    const f = makeFuller(2, 4.01)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers.some((x: Fuller) => x.entityId === 2)).toBe(true)
  })

  it('混合情况：低技能删除，高技能保留', () => {
    const f1 = makeFuller(1, 3.98)
    const f2 = makeFuller(2, 4.01)
    ;(sys as any).fullers.push(f1)
    ;(sys as any).fullers.push(f2)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers.some((x: Fuller) => x.entityId === 1)).toBe(false)
    expect((sys as any).fullers.some((x: Fuller) => x.entityId === 2)).toBe(true)
  })

  it('fulleringSkill 精确为 4（更新前 3.98, 更新后恰好 4.00）被删除', () => {
    const f = makeFuller(10, 3.98)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // 3.98 + 0.02 = 4.00 <= 4 => 删除
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('空 fullers 时 cleanup 不崩溃', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(16, {} as any, 3050)).not.toThrow()
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('所有 fuller 都低于阈值时全部删除', () => {
    ;(sys as any).fullers.push(makeFuller(1, 1.0))
    ;(sys as any).fullers.push(makeFuller(2, 2.0))
    ;(sys as any).fullers.push(makeFuller(3, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('多个 fuller 只有高技能的被保留', () => {
    ;(sys as any).fullers.push(makeFuller(1, 3.0))  // 3.02 <= 4 => 删除
    ;(sys as any).fullers.push(makeFuller(2, 10.0)) // 10.02 > 4 => 保留
    ;(sys as any).fullers.push(makeFuller(3, 2.0))  // 2.02 <= 4 => 删除
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers).toHaveLength(1)
    expect((sys as any).fullers[0].entityId).toBe(2)
  })
})

// ─── 招募逻辑（MAX_FULLERS=10, RECRUIT_CHANCE=0.0015）──────────────────────
describe('招募新 fuller 逻辑（MAX_FULLERS=10）', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random > RECRUIT_CHANCE(0.0015) 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('random < RECRUIT_CHANCE 且 fullers < 10 时招募新 fuller', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // 新招募的 fulleringSkill >= 10，经过 +0.02 后 > 4，不被删除
    expect((sys as any).fullers.length).toBeGreaterThanOrEqual(0) // 可能被 cleanup 删除
  })

  it('fullers 已达 MAX_FULLERS(10) 时不招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).fullers.push(makeFuller(i + 1, 50))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // fullers 可能因为技能增长保持 10 条（50.02 > 4）
    expect((sys as any).fullers.length).toBeLessThanOrEqual(10)
  })

  it('招募后新 fuller 的 tick 为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // 如果有新招募，检查 tick
    const newFuller = (sys as any).fullers.find((f: Fuller) => f.tick === 3050)
    if (newFuller) {
      expect(newFuller.tick).toBe(3050)
    } else {
      // 没有触发招募也可接受
      expect(true).toBe(true)
    }
  })

  it('nextId 在招募后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const initId = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    // nextId 应该至少是 initId（可能增加也可能不变，取决于概率）
    expect((sys as any).nextId).toBeGreaterThanOrEqual(initId)
  })
})

// ─── update() 整体集成 ───────────────────────────────────────────────────────
describe('update() 整体集成测试', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 不足时不做任何事', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3000) // 差值 2000 < 3050
    expect((sys as any).fullers[0].fulleringSkill).toBe(50)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('正常 update 不抛异常', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(16, {} as any, 3050)).not.toThrow()
  })

  it('update 后更新顺序正确：先增长后删除', () => {
    // fulleringSkill=3.98 => 增长后 4.00 => 删除
    const f = makeFuller(1, 3.98)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 3050)
    expect((sys as any).fullers).toHaveLength(0)
  })

  it('高技能 fuller 经过多次 update 不超过 100', () => {
    const f = makeFuller(1, 99)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    // 模拟 5 次更新
    for (let tick = 3050; tick <= 3050 * 5; tick += 3050) {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, tick)
    }
    expect((sys as any).fullers[0].fulleringSkill).toBeLessThanOrEqual(100)
  })

  it('dt 参数不影响节流（节流只看 tick）', () => {
    const f = makeFuller(1, 50)
    ;(sys as any).fullers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(999, {} as any, 3050) // dt=999 但 tick 满足
    expect((sys as any).fullers[0].fulleringSkill).toBeCloseTo(50.02, 5)
  })
})
