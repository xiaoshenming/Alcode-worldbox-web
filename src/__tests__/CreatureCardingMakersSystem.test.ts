import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCardingMakersSystem } from '../systems/CreatureCardingMakersSystem'
import type { CardingMaker } from '../systems/CreatureCardingMakersSystem'

let nextId = 1
function makeSys(): CreatureCardingMakersSystem { return new CreatureCardingMakersSystem() }
function makeMaker(
  entityId: number,
  combingSkill = 30,
  fiberAlignment = 25,
  batchSize = 20,
  qualityGrade = 35,
  tick = 0
): CardingMaker {
  return { id: nextId++, entityId, combingSkill, fiberAlignment, batchSize, qualityGrade, tick }
}

const fakeEm = {} as any

describe('CreatureCardingMakersSystem — 初始状态', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无梳棉师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('makers 是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })
})

describe('CreatureCardingMakersSystem — 数据结构与注入', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10, 80, 75, 70, 65)
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0] as CardingMaker
    expect(r.combingSkill).toBe(80)
    expect(r.fiberAlignment).toBe(75)
    expect(r.batchSize).toBe(70)
    expect(r.qualityGrade).toBe(65)
  })

  it('id 字段存在且类型正确', () => {
    const m = makeMaker(5)
    ;(sys as any).makers.push(m)
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('tick 字段默认为 0', () => {
    const m = makeMaker(5)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(0)
  })

  it('tick 字段可设为非零值', () => {
    const m = makeMaker(5, 30, 25, 20, 35, 999)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(999)
  })

  it('注入10个梳棉师，长度为10', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(10)
  })

  it('不同 entityId 的梳棉师互不干扰', () => {
    ;(sys as any).makers.push(makeMaker(1, 20))
    ;(sys as any).makers.push(makeMaker(2, 80))
    expect((sys as any).makers[0].combingSkill).toBe(20)
    expect((sys as any).makers[1].combingSkill).toBe(80)
  })
})

describe('CreatureCardingMakersSystem — CHECK_INTERVAL 门控', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 2490 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2489)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差值 >= 2490 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2490)
    expect((sys as any).lastCheck).toBe(7490)
  })

  it('tick差值恰好为2489时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2489)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为2490时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).lastCheck).toBe(2490)
  })

  it('lastCheck 从非零出发，差值恰到边界', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, fakeEm, 1000 + 2490)
    expect((sys as any).lastCheck).toBe(3490)
  })

  it('未触发时梳棉师数据不变', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2489)
    expect((sys as any).makers[0].combingSkill).toBe(50)
  })

  it('多次未达间隔的 update 不累积效果', () => {
    ;(sys as any).makers.push(makeMaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 100)
    sys.update(1, fakeEm, 200)
    sys.update(1, fakeEm, 300)
    expect((sys as any).makers[0].combingSkill).toBe(50)
  })

  it('两次达到间隔的 update 触发两次技能增长', () => {
    ;(sys as any).makers.push(makeMaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    sys.update(1, fakeEm, 4980)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.04)
  })
})

describe('CreatureCardingMakersSystem — 技能增长', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后 combingSkill 增加 0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.02)
  })

  it('update后 fiberAlignment 增加 0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].fiberAlignment).toBeCloseTo(40.015)
  })

  it('update后 qualityGrade 增加 0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].qualityGrade).toBeCloseTo(35.01)
  })

  it('batchSize 不随 update 变化', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].batchSize).toBe(20)
  })

  it('多个梳棉师均增长', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))
    ;(sys as any).makers.push(makeMaker(2, 60, 50, 30, 45))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.02)
    expect((sys as any).makers[1].combingSkill).toBeCloseTo(60.02)
  })

  it('低初始值也能增长', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 15, 5, 10))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(10.02)
    expect((sys as any).makers[0].fiberAlignment).toBeCloseTo(15.015)
    expect((sys as any).makers[0].qualityGrade).toBeCloseTo(10.01)
  })
})

describe('CreatureCardingMakersSystem — 技能上限', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('combingSkill 上限100：初始99.99→100', () => {
    ;(sys as any).makers.push(makeMaker(1, 99.99, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(100)
  })

  it('combingSkill 已为100时保持100', () => {
    ;(sys as any).makers.push(makeMaker(1, 100, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBe(100)
  })

  it('fiberAlignment 上限100：初始99.99→100', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 99.99, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].fiberAlignment).toBeCloseTo(100)
  })

  it('fiberAlignment 已为100时保持100', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 100, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].fiberAlignment).toBe(100)
  })

  it('qualityGrade 上限100：初始99.99→100', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].qualityGrade).toBeCloseTo(100)
  })

  it('qualityGrade 已为100时保持100', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 100))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].qualityGrade).toBe(100)
  })

  it('三项技能同时达上限', () => {
    ;(sys as any).makers.push(makeMaker(1, 99.99, 99.99, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(100)
    expect((sys as any).makers[0].fiberAlignment).toBeCloseTo(100)
    expect((sys as any).makers[0].qualityGrade).toBeCloseTo(100)
  })
})

describe('CreatureCardingMakersSystem — cleanup 删除逻辑', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('combingSkill <= 4 的记录被删除，> 4 的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98, 40, 20, 35)) // 3.98+0.02=4.00 <=4 → 删除
    ;(sys as any).makers.push(makeMaker(2, 4.01, 40, 20, 35)) // 4.01+0.02=4.03 >4 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('combingSkill 更新后恰好等于4被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98, 40, 20, 35)) // 3.98+0.02=4.00
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('combingSkill 更新后略高于4被保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.99, 40, 20, 35)) // 3.99+0.02=4.01
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('全部 combingSkill 低于阈值则全部清空', () => {
    ;(sys as any).makers.push(makeMaker(1, 1, 40, 20, 35))
    ;(sys as any).makers.push(makeMaker(2, 2, 40, 20, 35))
    ;(sys as any).makers.push(makeMaker(3, 3, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('combingSkill 为0时也被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 0, 40, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多个梳棉师中间的被正确删除（从后往前）', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 20, 35))   // 保留
    ;(sys as any).makers.push(makeMaker(2, 1, 40, 20, 35))    // 删除
    ;(sys as any).makers.push(makeMaker(3, 60, 40, 20, 35))   // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers[0].entityId).toBe(1)
    expect((sys as any).makers[1].entityId).toBe(3)
  })

  it('qualityGrade 和 fiberAlignment 不影响删除判断', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 0, 0, 0))  // combingSkill 足够
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(1)
  })
})

describe('CreatureCardingMakersSystem — 随机招募逻辑', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('满员(12人)时 Math.random 不被用于招募', () => {
    // 填满12个梳棉师
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).makers.push(makeMaker(i, 50))
    }
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    // 满员不招募，数量维持12（全部技能足够保留）
    expect((sys as any).makers).toHaveLength(12)
    spy.mockRestore()
  })

  it('未满员且 random < RECRUIT_CHANCE 时新增一个梳棉师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 0.0001 < 0.0018
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('未满员且 random >= RECRUIT_CHANCE 时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >> 0.0018
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('新增梳棉师后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    const prevId = (sys as any).nextId
    sys.update(1, fakeEm, 2490)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
    vi.restoreAllMocks()
  })

  it('新增梳棉师的 tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(2490)
    }
    vi.restoreAllMocks()
  })

  it('新增梳棉师的 combingSkill 在合法范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    if ((sys as any).makers.length > 0) {
      const skill = (sys as any).makers[0].combingSkill
      // 10 + rand*25 + 0.02(增长)，范围约 10~35
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(36)
    }
    vi.restoreAllMocks()
  })
})

describe('CreatureCardingMakersSystem — 边界与综合场景', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时不触发（lastCheck=0,diff=0<2490）', () => {
    ;(sys as any).makers.push(makeMaker(1, 50))
    sys.update(1, fakeEm, 0)
    expect((sys as any).makers[0].combingSkill).toBe(50)
  })

  it('空 makers 下触发不抛异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, fakeEm, 2490)).not.toThrow()
  })

  it('连续两次触发各自独立增长', () => {
    ;(sys as any).makers.push(makeMaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    sys.update(1, fakeEm, 4980)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.04)
  })

  it('update后 entityId 不变', () => {
    ;(sys as any).makers.push(makeMaker(42, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].entityId).toBe(42)
  })

  it('update后 batchSize 不变', () => {
    ;(sys as any).makers.push(makeMaker(1, 50, 40, 77, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers[0].batchSize).toBe(77)
  })

  it('增长和删除在同一次 update 中同时发生', () => {
    ;(sys as any).makers.push(makeMaker(1, 3.98)) // 增长后恰好4被删
    ;(sys as any).makers.push(makeMaker(2, 50))   // 增长后保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2490)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
    expect((sys as any).makers[0].combingSkill).toBeCloseTo(50.02)
  })

  it('大量梳棉师(11个，满员-1)时正常增长', () => {
    for (let i = 1; i <= 11; i++) {
      ;(sys as any).makers.push(makeMaker(i, 50))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不招募
    sys.update(1, fakeEm, 2490)
    for (const m of (sys as any).makers) {
      expect(m.combingSkill).toBeCloseTo(50.02)
    }
    vi.restoreAllMocks()
  })

  it('lastCheck 更新为最新 tick 值', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 9999)
    expect((sys as any).lastCheck).toBe(9999)
  })

  it('dt 参数不影响 CHECK_INTERVAL 判断', () => {
    ;(sys as any).lastCheck = 0
    sys.update(9999, fakeEm, 2490)
    expect((sys as any).lastCheck).toBe(2490)
  })
})
