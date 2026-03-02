import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBurnisherSystem } from '../systems/CreatureBurnisherSystem'
import type { Burnisher } from '../systems/CreatureBurnisherSystem'

let nextId = 1
function makeSys(): CreatureBurnisherSystem { return new CreatureBurnisherSystem() }
function makeBurnisher(
  entityId: number,
  burnishingSkill: number = 30,
  pressureTechnique: number = 25,
  surfaceSmoothness: number = 20,
  reflectiveFinish: number = 35,
  tickVal: number = 0
): Burnisher {
  return { id: nextId++, entityId, burnishingSkill, pressureTechnique, surfaceSmoothness, reflectiveFinish, tick: tickVal }
}

const EMPTY_EM = {} as any
const CHECK_INTERVAL = 2870

describe('CreatureBurnisherSystem - 初始化状态', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无抛光师记录', () => {
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('burnishers 是数组类型', () => {
    expect(Array.isArray((sys as any).burnishers)).toBe(true)
  })

  it('两个独立实例不共享 burnishers 数组', () => {
    const sys2 = makeSys()
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys2 as any).burnishers).toHaveLength(0)
  })
})

describe('CreatureBurnisherSystem - 数据结构', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers[0].entityId).toBe(1)
  })

  it('多个抛光师全部返回', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1))
    ;(sys as any).burnishers.push(makeBurnisher(2))
    ;(sys as any).burnishers.push(makeBurnisher(3))
    expect((sys as any).burnishers).toHaveLength(3)
  })

  it('四字段数据完整', () => {
    const b = makeBurnisher(10, 80, 75, 70, 65)
    ;(sys as any).burnishers.push(b)
    const r = (sys as any).burnishers[0]
    expect(r.burnishingSkill).toBe(80)
    expect(r.pressureTechnique).toBe(75)
    expect(r.surfaceSmoothness).toBe(70)
    expect(r.reflectiveFinish).toBe(65)
  })

  it('id 字段存在且为数字', () => {
    ;(sys as any).burnishers.push(makeBurnisher(5))
    expect(typeof (sys as any).burnishers[0].id).toBe('number')
  })

  it('tick 字段被正确保存', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 30, 25, 20, 35, 999))
    expect((sys as any).burnishers[0].tick).toBe(999)
  })

  it('同一实例返回同一内部数组引用', () => {
    const arr = (sys as any).burnishers
    ;(sys as any).burnishers.push(makeBurnisher(1))
    expect((sys as any).burnishers).toBe(arr)
  })

  it('不同 entityId 的记录可区分', () => {
    ;(sys as any).burnishers.push(makeBurnisher(10))
    ;(sys as any).burnishers.push(makeBurnisher(20))
    expect((sys as any).burnishers[0].entityId).toBe(10)
    expect((sys as any).burnishers[1].entityId).toBe(20)
  })

  it('注入10个抛光师，length=10', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).burnishers.push(makeBurnisher(i))
    }
    expect((sys as any).burnishers).toHaveLength(10)
  })
})

describe('CreatureBurnisherSystem - CHECK_INTERVAL 节流逻辑', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 2870 时 lastCheck 不变', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值 >= 2870 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).lastCheck).toBe(2870)
  })

  it('tick差值 = 2869（边界值 -1）时不触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 2869)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(50)
  })

  it('tick差值 = 2870（边界值）时触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  it('tick差值 = 2871（边界值 +1）时触发更新', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 2871)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck 非零时，相对差值计算正确', () => {
    ;(sys as any).lastCheck = 5000
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 5000 + 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck 非零时，差值 < 2870 不触发', () => {
    ;(sys as any).lastCheck = 5000
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 5000 + 2869)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(50)
  })

  it('连续两次 update，第二次 tick 差值不足时不重复执行', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 2870) // 第一次触发
    sys.update(16, EMPTY_EM, 2871) // 差值=2871-2870=1 < 2870，不触发
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  it('连续两次 update，第二次满足间隔时再次执行', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 2870)       // 第一次：+0.02
    sys.update(16, EMPTY_EM, 2870 * 2)   // 第二次：+0.02
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.04, 5)
  })

  it('update 触发后 lastCheck 更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 9999)
    expect((sys as any).lastCheck).toBe(9999)
  })
})

describe('CreatureBurnisherSystem - 技能增长逻辑', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后 burnishingSkill 增加 0.02', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后 pressureTechnique 增加 0.015', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 40))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBeCloseTo(40.015, 5)
  })

  it('update后 reflectiveFinish 增加 0.01', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 60))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBeCloseTo(60.01, 5)
  })

  it('surfaceSmoothness 在 update 后保持不变', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 55, 35))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].surfaceSmoothness).toBe(55)
  })

  it('burnishingSkill 上限为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(100)
  })

  it('pressureTechnique 上限为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBe(100)
  })

  it('reflectiveFinish 上限为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBe(100)
  })

  it('burnishingSkill 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(100)
  })

  it('pressureTechnique 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBe(100)
  })

  it('reflectiveFinish 已为 100 时 update 后仍为 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 100))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBe(100)
  })

  it('多个抛光师各自独立增长', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 30, 20, 10, 15))
    ;(sys as any).burnishers.push(makeBurnisher(2, 60, 50, 40, 55))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    const arr = (sys as any).burnishers as Burnisher[]
    expect(arr[0].burnishingSkill).toBeCloseTo(30.02, 5)
    expect(arr[1].burnishingSkill).toBeCloseTo(60.02, 5)
    expect(arr[0].pressureTechnique).toBeCloseTo(20.015, 5)
    expect(arr[1].pressureTechnique).toBeCloseTo(50.015, 5)
  })

  it('burnishingSkill = 0 时 update 后 0.02 <= 4 被 cleanup 删除', () => {
    // burnishingSkill=0 → 0+0.02=0.02 → cleanup: 0.02<=4 → 被删除
    ;(sys as any).burnishers.push(makeBurnisher(1, 0))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('技能增长不受 dt 参数影响（固定增量）', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(100, EMPTY_EM, 2870) // dt=100
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.02, 5)
  })
})

describe('CreatureBurnisherSystem - cleanup 删除逻辑', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('cleanup：burnishingSkill=3.98 更新后=4.00 被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98))
    ;(sys as any).burnishers.push(makeBurnisher(2, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    const remaining = (sys as any).burnishers as Burnisher[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('burnishingSkill=4.01 更新后=4.03 不被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 4.01))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(1)
  })

  it('cleanup 严格 <=4：burnishingSkill 起始=3.98+0.02=4.00 被删除（边界）', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('burnishingSkill=4.00 时（更新前=3.98+0.02=4.00）删除，entityId=1 消失', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    const ids = (sys as any).burnishers.map((b: Burnisher) => b.entityId)
    expect(ids).not.toContain(1)
  })

  it('burnishingSkill=5 时不被删除（5.02 > 4）', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 5))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(1)
  })

  it('burnishingSkill=3 时（3+0.02=3.02 <=4）被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('多个需要删除时全部删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 1))    // 1.02 <=4 → deleted
    ;(sys as any).burnishers.push(makeBurnisher(2, 2))    // 2.02 <=4 → deleted
    ;(sys as any).burnishers.push(makeBurnisher(3, 50))   // 50.02 > 4 → kept
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(1)
    expect((sys as any).burnishers[0].entityId).toBe(3)
  })

  it('所有抛光师都满足删除条件时，数组清空', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 1))
    ;(sys as any).burnishers.push(makeBurnisher(2, 2))
    ;(sys as any).burnishers.push(makeBurnisher(3, 3))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('cleanup 从末尾往前删除，不影响前面的记录顺序', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))   // kept
    ;(sys as any).burnishers.push(makeBurnisher(2, 50))   // kept
    ;(sys as any).burnishers.push(makeBurnisher(3, 1))    // deleted
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    const arr = (sys as any).burnishers as Burnisher[]
    expect(arr).toHaveLength(2)
    expect(arr[0].entityId).toBe(1)
    expect(arr[1].entityId).toBe(2)
  })

  it('burnishingSkill 精确=4.00（3.98+0.02）时被删除', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 3.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('tick 差值不足时，不执行 cleanup', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 1)) // 本应被删除
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 2000) // 差值=2000 < 2870，不触发
    expect((sys as any).burnishers).toHaveLength(1)
  })
})

describe('CreatureBurnisherSystem - 招募逻辑', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random < RECRUIT_CHANCE 且数量 < MAX 时新增记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers.length).toBeGreaterThanOrEqual(1)
  })

  it('Math.random >= RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // >= 0.0015
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('已满 MAX_BURNISHERS(10) 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 低概率本应招募
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).burnishers.push(makeBurnisher(i, 50))
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    // 10个可能被删除（看skill值），但不会新增超过10个；skill=50都满足>4，保持10
    // 由于随机已mock，如果没被删除不会新增
    // 实际 10 个 skill=50，不会被cleanup删；random=0.001但length>=10不招募
    expect((sys as any).burnishers.length).toBeLessThanOrEqual(10)
  })

  it('招募时 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).nextId = 5
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    if ((sys as any).burnishers.length > 0) {
      expect((sys as any).nextId).toBe(6)
    }
  })

  it('招募时新 burnisher 的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 5000)
    if ((sys as any).burnishers.length > 0) {
      expect((sys as any).burnishers[0].tick).toBe(5000)
    }
  })

  it('招募的 burnisher burnishingSkill 在 [10, 35) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    if ((sys as any).burnishers.length > 0) {
      const skill = (sys as any).burnishers[0].burnishingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThan(35 + 0.02) // +0.02 因为 update 后增长了
    }
  })

  it('招募的 burnisher pressureTechnique 在 [15, 35) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    if ((sys as any).burnishers.length > 0) {
      const pt = (sys as any).burnishers[0].pressureTechnique
      expect(pt).toBeGreaterThanOrEqual(15)
      expect(pt).toBeLessThan(35 + 0.015)
    }
  })
})

describe('CreatureBurnisherSystem - 边界值与精度', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('burnishingSkill=99.98+0.02=100.00 精确等于上限', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 99.98))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(100)
  })

  it('pressureTechnique=99.985+0.015=100.00 精确等于上限', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 99.985))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].pressureTechnique).toBe(100)
  })

  it('reflectiveFinish=99.99+0.01=100.00 精确等于上限', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].reflectiveFinish).toBe(100)
  })

  it('tick=0 时不触发（0-0=0 < 2870）', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    sys.update(16, EMPTY_EM, 0)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(50)
  })

  it('三次满间隔 update 后 burnishingSkill 增长 0.06', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    sys.update(16, EMPTY_EM, 2870 * 2)
    sys.update(16, EMPTY_EM, 2870 * 3)
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.06, 5)
  })

  it('空 burnishers 数组 update 不报错', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(16, EMPTY_EM, 2870)).not.toThrow()
  })

  it('burnishingSkill 极大值 1000 被 clamp 到 100', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 1000))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(100)
  })

  it('各字段增量精确（连续5次 update）', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50, 40, 30, 20))
    ;(sys as any).lastCheck = 0
    for (let i = 1; i <= 5; i++) {
      sys.update(16, EMPTY_EM, 2870 * i)
    }
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.10, 4)
    expect((sys as any).burnishers[0].pressureTechnique).toBeCloseTo(40.075, 4)
    expect((sys as any).burnishers[0].reflectiveFinish).toBeCloseTo(20.05, 4)
    expect((sys as any).burnishers[0].surfaceSmoothness).toBe(30) // 不变
  })
})

describe('CreatureBurnisherSystem - 多次 update 综合场景', () => {
  let sys: CreatureBurnisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('抛光师从低 skill 被逐步 cleanup 直到全部删除', () => {
    // burnishingSkill=4, 每次+0.02，cleanup 判断 <=4，第一次后=4.02>4 不删
    ;(sys as any).burnishers.push(makeBurnisher(1, 0)) // 0+0.02=0.02 <=4 → 第一次被删
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('update 不触发时，burnishers 内容不变', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).burnishers.push(makeBurnisher(2, 60))
    ;(sys as any).lastCheck = 9000
    sys.update(16, EMPTY_EM, 9000 + 100) // 差值=100 < 2870
    expect((sys as any).burnishers).toHaveLength(2)
    expect((sys as any).burnishers[0].burnishingSkill).toBe(50)
    expect((sys as any).burnishers[1].burnishingSkill).toBe(60)
  })

  it('update 交替触发与不触发，记录正确积累', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)       // 触发 → 50.02
    sys.update(16, EMPTY_EM, 3000)       // 差值=130 < 2870，不触发
    sys.update(16, EMPTY_EM, 2870 * 2)   // 触发 → 50.04
    expect((sys as any).burnishers[0].burnishingSkill).toBeCloseTo(50.04, 5)
  })

  it('cleanup 不影响 lastCheck 的更新', () => {
    ;(sys as any).burnishers.push(makeBurnisher(1, 1)) // 将被删除
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).lastCheck).toBe(2870)
    expect((sys as any).burnishers).toHaveLength(0)
  })

  it('大量抛光师（9个）混合增长和 cleanup', () => {
    // 3个低 skill（将被删），6个高 skill（保留）
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).burnishers.push(makeBurnisher(i, 1)) // 1.02 <=4 → deleted
    }
    for (let i = 4; i <= 9; i++) {
      ;(sys as any).burnishers.push(makeBurnisher(i, 50)) // 保留
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 2870)
    expect((sys as any).burnishers).toHaveLength(6)
  })
})
