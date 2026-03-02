import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBurnOuterSystem } from '../systems/CreatureBurnOuterSystem'
import type { BurnOuter } from '../systems/CreatureBurnOuterSystem'

let nextId = 1
function makeSys(): CreatureBurnOuterSystem { return new CreatureBurnOuterSystem() }
function makeBurnOuter(
  entityId: number,
  burnOutSkill: number = 30,
  thermalControl: number = 25,
  cutPrecision: number = 20,
  materialRemoval: number = 35,
  tickVal: number = 0
): BurnOuter {
  return { id: nextId++, entityId, burnOutSkill, thermalControl, cutPrecision, materialRemoval, tick: tickVal }
}

const EMPTY_EM = {} as any
const CHECK_INTERVAL = 3080

describe('CreatureBurnOuterSystem - 初始化状态', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无热切割师记录', () => {
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('burnOuters 是数组类型', () => {
    expect(Array.isArray((sys as any).burnOuters)).toBe(true)
  })

  it('两个独立实例不共享 burnOuters 数组', () => {
    const sys2 = makeSys()
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect((sys2 as any).burnOuters).toHaveLength(0)
  })
})

describe('CreatureBurnOuterSystem - 数据结构', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect((sys as any).burnOuters[0].entityId).toBe(1)
  })

  it('多个热切割师全部返回', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    ;(sys as any).burnOuters.push(makeBurnOuter(2))
    ;(sys as any).burnOuters.push(makeBurnOuter(3))
    expect((sys as any).burnOuters).toHaveLength(3)
  })

  it('四字段数据完整', () => {
    const b = makeBurnOuter(10, 80, 75, 70, 65)
    ;(sys as any).burnOuters.push(b)
    const r = (sys as any).burnOuters[0]
    expect(r.burnOutSkill).toBe(80)
    expect(r.thermalControl).toBe(75)
    expect(r.cutPrecision).toBe(70)
    expect(r.materialRemoval).toBe(65)
  })

  it('id 字段存在且为数字', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(5))
    expect(typeof (sys as any).burnOuters[0].id).toBe('number')
  })

  it('tick 字段被正确保存', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 30, 25, 20, 35, 888))
    expect((sys as any).burnOuters[0].tick).toBe(888)
  })

  it('同一实例返回同一内部数组引用', () => {
    const arr = (sys as any).burnOuters
    ;(sys as any).burnOuters.push(makeBurnOuter(1))
    expect((sys as any).burnOuters).toBe(arr)
  })

  it('不同 entityId 的记录可区分', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(10))
    ;(sys as any).burnOuters.push(makeBurnOuter(20))
    expect((sys as any).burnOuters[0].entityId).toBe(10)
    expect((sys as any).burnOuters[1].entityId).toBe(20)
  })

  it('注入 10 个热切割师，length=10', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).burnOuters.push(makeBurnOuter(i))
    }
    expect((sys as any).burnOuters).toHaveLength(10)
  })
})

describe('CreatureBurnOuterSystem - CHECK_INTERVAL 节流逻辑', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 3080 时 lastCheck 不变', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值 >= 3080 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).lastCheck).toBe(3080)
  })

  it('tick差值 = 3079（边界值 -1）时不触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 3079)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(50)
  })

  it('tick差值 = 3080（边界值）时触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  it('tick差值 = 3081（边界值 +1）时触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 3081)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck 非零时，相对差值计算正确', () => {
    ;(sys as any).lastCheck = 8000
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 8000 + 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck 非零时，差值 < 3080 不触发', () => {
    ;(sys as any).lastCheck = 8000
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 8000 + 3079)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(50)
  })

  it('连续两次 update，第二次 tick 差值不足时不重复执行', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 3080) // 第一次触发
    sys.update(16, EMPTY_EM, 3081) // 差值=1 < 3080，不触发
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  it('连续两次 update，第二次满足间隔时再次执行', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 3080)       // 第一次：+0.02
    sys.update(16, EMPTY_EM, 3080 * 2)   // 第二次：+0.02
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.04, 5)
  })

  it('update 触发后 lastCheck 更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 12345)
    expect((sys as any).lastCheck).toBe(12345)
  })

  it('CHECK_INTERVAL 与 Burnisher 的 2870 不同（3080 vs 2870）', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    // tick=2870 差值=2870 < 3080，不触发
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(50)
    // tick=3080 差值=3080 >= 3080，触发
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })
})

describe('CreatureBurnOuterSystem - 技能增长逻辑', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后 burnOutSkill 增加 0.02', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })

  it('update后 thermalControl 增加 0.015', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 40))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBeCloseTo(40.015, 5)
  })

  it('update后 materialRemoval 增加 0.01', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 60))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBeCloseTo(60.01, 5)
  })

  it('cutPrecision 在 update 后保持不变', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 55, 35))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].cutPrecision).toBe(55)
  })

  it('burnOutSkill 上限为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(100)
  })

  it('thermalControl 上限为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBe(100)
  })

  it('materialRemoval 上限为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBe(100)
  })

  it('burnOutSkill 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(100)
  })

  it('thermalControl 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBe(100)
  })

  it('materialRemoval 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBe(100)
  })

  it('多个热切割师各自独立增长', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 30, 20, 10, 15))
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 60, 50, 40, 55))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    const arr = (sys as any).burnOuters as BurnOuter[]
    expect(arr[0].burnOutSkill).toBeCloseTo(30.02, 5)
    expect(arr[1].burnOutSkill).toBeCloseTo(60.02, 5)
    expect(arr[0].thermalControl).toBeCloseTo(20.015, 5)
    expect(arr[1].thermalControl).toBeCloseTo(50.015, 5)
  })

  it('burnOutSkill = 0 时 update 后 0.02 <= 4 被 cleanup 删除', () => {
    // burnOutSkill=0 → 0+0.02=0.02 → cleanup: 0.02<=4 → 被删除
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 0))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('技能增长不受 dt 参数影响（固定增量）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(999, EMPTY_EM, 3080) // dt=999
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.02, 5)
  })
})

describe('CreatureBurnOuterSystem - cleanup 删除逻辑', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('cleanup：burnOutSkill=3.98 更新后=4.00 被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 3.98))
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    const remaining = (sys as any).burnOuters as BurnOuter[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('burnOutSkill=4.01 更新后=4.03 不被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 4.01))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(1)
  })

  it('cleanup 严格 <=4：burnOutSkill=3.98+0.02=4.00 被删除（边界验证���', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('burnOutSkill=4.00 更新后=4.02 的记录（起始4.00）不被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 4.00))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    // 4.00+0.02=4.02 > 4 → kept
    expect((sys as any).burnOuters).toHaveLength(1)
  })

  it('burnOutSkill=5 时不被删除（5.02 > 4）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 5))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(1)
  })

  it('burnOutSkill=3 时（3+0.02=3.02 <=4）被删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 3))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('多个需要删除时全部删除', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 1))    // deleted
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 2))    // deleted
    ;(sys as any).burnOuters.push(makeBurnOuter(3, 50))   // kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(1)
    expect((sys as any).burnOuters[0].entityId).toBe(3)
  })

  it('所有热切割师都满足删除条件时，数组清空', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 1))
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 2))
    ;(sys as any).burnOuters.push(makeBurnOuter(3, 3))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('cleanup 从末尾往前删除，不影响前面的记录顺序', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))   // kept
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 50))   // kept
    ;(sys as any).burnOuters.push(makeBurnOuter(3, 1))    // deleted
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    const arr = (sys as any).burnOuters as BurnOuter[]
    expect(arr).toHaveLength(2)
    expect(arr[0].entityId).toBe(1)
    expect(arr[1].entityId).toBe(2)
  })

  it('cleanup 删除中间元素，两端保留', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))   // kept
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 1))    // deleted
    ;(sys as any).burnOuters.push(makeBurnOuter(3, 50))   // kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    const arr = (sys as any).burnOuters as BurnOuter[]
    expect(arr).toHaveLength(2)
    expect(arr[0].entityId).toBe(1)
    expect(arr[1].entityId).toBe(3)
  })

  it('tick 差值不足时，不执行 cleanup', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 1)) // 本应被删除
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000) // 差值=2000 < 3080
    expect((sys as any).burnOuters).toHaveLength(1)
  })
})

describe('CreatureBurnOuterSystem - 招募逻辑', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random < RECRUIT_CHANCE 且数量 < MAX 时新增记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters.length).toBeGreaterThanOrEqual(1)
  })

  it('Math.random >= RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('已满 MAX_BURNOUTERS(10) 时不招募新成员', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).burnOuters.push(makeBurnOuter(i, 50))
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters.length).toBeLessThanOrEqual(10)
  })

  it('招募时 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).nextId = 7
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    if ((sys as any).burnOuters.length > 0) {
      expect((sys as any).nextId).toBe(8)
    }
  })

  it('招募时新 burnOuter 的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 7777)
    if ((sys as any).burnOuters.length > 0) {
      expect((sys as any).burnOuters[0].tick).toBe(7777)
    }
  })

  it('招募的 burnOuter burnOutSkill 在 [10, 35) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    if ((sys as any).burnOuters.length > 0) {
      const skill = (sys as any).burnOuters[0].burnOutSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThan(35 + 0.02)
    }
  })

  it('招募的 burnOuter thermalControl 在 [15, 35) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    if ((sys as any).burnOuters.length > 0) {
      const tc = (sys as any).burnOuters[0].thermalControl
      expect(tc).toBeGreaterThanOrEqual(15)
      expect(tc).toBeLessThan(35 + 0.015)
    }
  })
})

describe('CreatureBurnOuterSystem - 边界值与精度', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('burnOutSkill=99.98+0.02=100.00 精确等于上限', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 99.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(100)
  })

  it('thermalControl=99.985+0.015=100.00 精确等于上限', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 99.985))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].thermalControl).toBe(100)
  })

  it('materialRemoval=99.99+0.01=100.00 精确等于上限', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].materialRemoval).toBe(100)
  })

  it('tick=0 时不触发（0-0=0 < 3080）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    sys.update(16, EMPTY_EM, 0)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(50)
  })

  it('三次满间隔 update 后 burnOutSkill 增长 0.06', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    sys.update(16, EMPTY_EM, 3080 * 2)
    sys.update(16, EMPTY_EM, 3080 * 3)
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.06, 5)
  })

  it('空 burnOuters 数组 update 不报错', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(16, EMPTY_EM, 3080)).not.toThrow()
  })

  it('burnOutSkill 极大值 9999 被 clamp 到 100', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 9999))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(100)
  })

  it('各字段增量精确（连续5次 update）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50, 40, 30, 20))
    ;(sys as any).lastCheck = 0
    for (let i = 1; i <= 5; i++) {
      sys.update(16, EMPTY_EM, 3080 * i)
    }
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.10, 4)
    expect((sys as any).burnOuters[0].thermalControl).toBeCloseTo(40.075, 4)
    expect((sys as any).burnOuters[0].materialRemoval).toBeCloseTo(20.05, 4)
    expect((sys as any).burnOuters[0].cutPrecision).toBe(30) // 不变
  })
})

describe('CreatureBurnOuterSystem - 多次 update 综合场景', () => {
  let sys: CreatureBurnOuterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('burnOutSkill=0 被删（0.02 <=4）', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 0))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('update 不触发时，burnOuters 内容不变', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).burnOuters.push(makeBurnOuter(2, 60))
    ;(sys as any).lastCheck = 9000
    sys.update(16, EMPTY_EM, 9000 + 100) // 差值=100 < 3080
    expect((sys as any).burnOuters).toHaveLength(2)
    expect((sys as any).burnOuters[0].burnOutSkill).toBe(50)
    expect((sys as any).burnOuters[1].burnOutSkill).toBe(60)
  })

  it('update 交替触发与不触发，记录正确积累', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)       // 触发 → 50.02
    sys.update(16, EMPTY_EM, 3500)       // 差值=420 < 3080，不触发
    sys.update(16, EMPTY_EM, 3080 * 2)   // 触发 → 50.04
    expect((sys as any).burnOuters[0].burnOutSkill).toBeCloseTo(50.04, 5)
  })

  it('cleanup 不影响 lastCheck 的更新', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(1, 1)) // 将被删除
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).lastCheck).toBe(3080)
    expect((sys as any).burnOuters).toHaveLength(0)
  })

  it('大量热切割师（9个）混合增长和 cleanup', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).burnOuters.push(makeBurnOuter(i, 1)) // deleted
    }
    for (let i = 4; i <= 9; i++) {
      ;(sys as any).burnOuters.push(makeBurnOuter(i, 50)) // kept
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters).toHaveLength(6)
  })

  it('实体 entityId 在 cleanup 后不影响其他实体', () => {
    ;(sys as any).burnOuters.push(makeBurnOuter(42, 1))  // deleted
    ;(sys as any).burnOuters.push(makeBurnOuter(99, 50)) // kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 3080)
    expect((sys as any).burnOuters[0].entityId).toBe(99)
  })
})
