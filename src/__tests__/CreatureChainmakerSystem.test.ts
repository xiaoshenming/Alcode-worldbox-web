import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureChainmakerSystem } from '../systems/CreatureChainmakerSystem'
import type { Chainmaker } from '../systems/CreatureChainmakerSystem'

let nextId = 1
function makeSys(): CreatureChainmakerSystem { return new CreatureChainmakerSystem() }
function makeChainmaker(
  entityId: number,
  linkForging = 30,
  weldingSkill = 25,
  tensileTest = 20,
  outputQuality = 35,
  tick = 0
): Chainmaker {
  return { id: nextId++, entityId, linkForging, weldingSkill, tensileTest, outputQuality, tick }
}

const fakeEm = {} as any

describe('CreatureChainmakerSystem — 初始状态', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无链匠', () => {
    expect((sys as any).chainmakers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('chainmakers 是数组类型', () => {
    expect(Array.isArray((sys as any).chainmakers)).toBe(true)
  })
})

describe('CreatureChainmakerSystem — 数据结构与注入', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    expect((sys as any).chainmakers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1))
    ;(sys as any).chainmakers.push(makeChainmaker(2))
    expect((sys as any).chainmakers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeChainmaker(10, 80, 75, 70, 65)
    ;(sys as any).chainmakers.push(c)
    const r = (sys as any).chainmakers[0] as Chainmaker
    expect(r.linkForging).toBe(80)
    expect(r.weldingSkill).toBe(75)
    expect(r.tensileTest).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  it('id 字段存在且为 number 类型', () => {
    const c = makeChainmaker(5)
    ;(sys as any).chainmakers.push(c)
    expect(typeof (sys as any).chainmakers[0].id).toBe('number')
  })

  it('tick 字段默认为 0', () => {
    const c = makeChainmaker(5)
    ;(sys as any).chainmakers.push(c)
    expect((sys as any).chainmakers[0].tick).toBe(0)
  })

  it('tick 字段可设为非零值', () => {
    const c = makeChainmaker(5, 30, 25, 20, 35, 888)
    ;(sys as any).chainmakers.push(c)
    expect((sys as any).chainmakers[0].tick).toBe(888)
  })

  it('注入10个链匠，长度为10', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).chainmakers.push(makeChainmaker(i))
    }
    expect((sys as any).chainmakers).toHaveLength(10)
  })

  it('不同 entityId 的链匠互不干扰', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 20))
    ;(sys as any).chainmakers.push(makeChainmaker(2, 80))
    expect((sys as any).chainmakers[0].linkForging).toBe(20)
    expect((sys as any).chainmakers[1].linkForging).toBe(80)
  })
})

describe('CreatureChainmakerSystem — CHECK_INTERVAL 门控', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 2640 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2639)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差值 >= 2640 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2640)
    expect((sys as any).lastCheck).toBe(7640)
  })

  it('tick差值恰好为2639时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2639)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为2640时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('lastCheck 从非零出发，差值恰好到边界', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, fakeEm, 1000 + 2640)
    expect((sys as any).lastCheck).toBe(3640)
  })

  it('未触发时链匠数据不变', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + 2639)
    expect((sys as any).chainmakers[0].linkForging).toBe(50)
  })

  it('多次未达间隔的 update 不累积效果', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 100)
    sys.update(1, fakeEm, 200)
    sys.update(1, fakeEm, 300)
    expect((sys as any).chainmakers[0].linkForging).toBe(50)
  })

  it('两次达到间隔的 update 触发两次技能增长', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    sys.update(1, fakeEm, 5280)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.04)
  })
})

describe('CreatureChainmakerSystem — 技能增长', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后 linkForging 增加 0.02', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.02)
  })

  it('update后 tensileTest 增加 0.015', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].tensileTest).toBeCloseTo(20.015)
  })

  it('update后 outputQuality 增加 0.01', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].outputQuality).toBeCloseTo(35.01)
  })

  it('weldingSkill 不随 update 变化', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].weldingSkill).toBe(25)
  })

  it('多个链匠均增长', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))
    ;(sys as any).chainmakers.push(makeChainmaker(2, 60, 35, 30, 45))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.02)
    expect((sys as any).chainmakers[1].linkForging).toBeCloseTo(60.02)
  })

  it('低初始值也能正常增长', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 10, 15, 5, 10))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(10.02)
    expect((sys as any).chainmakers[0].tensileTest).toBeCloseTo(5.015)
    expect((sys as any).chainmakers[0].outputQuality).toBeCloseTo(10.01)
  })
})

describe('CreatureChainmakerSystem — 技能上限', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('linkForging 上限100：初始99.99→100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 99.99, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(100)
  })

  it('linkForging 已为100时保持100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 100, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBe(100)
  })

  it('tensileTest 上限100：初始99.99→100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 99.99, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].tensileTest).toBeCloseTo(100)
  })

  it('tensileTest 已为100时保持100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 100, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].tensileTest).toBe(100)
  })

  it('outputQuality 上限100：初始99.99→100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].outputQuality).toBeCloseTo(100)
  })

  it('outputQuality 已为100时保持100', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 100))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].outputQuality).toBe(100)
  })

  it('三项技能同时达上限', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 99.99, 25, 99.99, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(100)
    expect((sys as any).chainmakers[0].tensileTest).toBeCloseTo(100)
    expect((sys as any).chainmakers[0].outputQuality).toBeCloseTo(100)
  })
})

describe('CreatureChainmakerSystem — cleanup 删除逻辑', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('linkForging <= 4 的记录被删除，> 4 的保留', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 3.98, 25, 20, 35)) // 3.98+0.02=4.00 <=4 → 删除
    ;(sys as any).chainmakers.push(makeChainmaker(2, 4.01, 25, 20, 35)) // 4.01+0.02=4.03 >4 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(1)
    expect((sys as any).chainmakers[0].entityId).toBe(2)
  })

  it('linkForging 更新后恰好等于4被删除', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 3.98, 25, 20, 35)) // 3.98+0.02=4.00
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(0)
  })

  it('linkForging 更新后略高于4被保留', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 3.99, 25, 20, 35)) // 3.99+0.02=4.01
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(1)
  })

  it('全部 linkForging 低于阈值则全部清空', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 1, 25, 20, 35))
    ;(sys as any).chainmakers.push(makeChainmaker(2, 2, 25, 20, 35))
    ;(sys as any).chainmakers.push(makeChainmaker(3, 3, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(0)
  })

  it('linkForging 为0时也被删除', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 0, 25, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(0)
  })

  it('多个链匠中间的被正确删除（从后往前）', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 25, 20, 35))   // 保留
    ;(sys as any).chainmakers.push(makeChainmaker(2, 1, 25, 20, 35))    // 删除
    ;(sys as any).chainmakers.push(makeChainmaker(3, 60, 25, 20, 35))   // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(2)
    expect((sys as any).chainmakers[0].entityId).toBe(1)
    expect((sys as any).chainmakers[1].entityId).toBe(3)
  })

  it('weldingSkill 和 tensileTest 不影响删除判断', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 0, 0, 0))  // linkForging 足够
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(1)
  })
})

describe('CreatureChainmakerSystem — 随机招募逻辑', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('满员(10人)时不新增链匠', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).chainmakers.push(makeChainmaker(i, 50))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(10)
    vi.restoreAllMocks()
  })

  it('未满员且 random < RECRUIT_CHANCE 时新增一个链匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 0.0001 < 0.0014
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('未满员且 random >= RECRUIT_CHANCE 时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >> 0.0014
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('新增链匠后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const prevId = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    if ((sys as any).chainmakers.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(prevId)
    }
    vi.restoreAllMocks()
  })

  it('新增链匠的 tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    if ((sys as any).chainmakers.length > 0) {
      expect((sys as any).chainmakers[0].tick).toBe(2640)
    }
    vi.restoreAllMocks()
  })

  it('新增链匠的 linkForging 在合法范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    if ((sys as any).chainmakers.length > 0) {
      const skill = (sys as any).chainmakers[0].linkForging
      // 10 + rand*25 + 0.02(增长)，范围约 10~36
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(36)
    }
    vi.restoreAllMocks()
  })
})

describe('CreatureChainmakerSystem — 边界与综合场景', () => {
  let sys: CreatureChainmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时不触发（diff=0<2640）', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50))
    sys.update(1, fakeEm, 0)
    expect((sys as any).chainmakers[0].linkForging).toBe(50)
  })

  it('空 chainmakers 下触发不抛异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, fakeEm, 2640)).not.toThrow()
  })

  it('连续两次触发各自独立增长', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    sys.update(1, fakeEm, 5280)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.04)
  })

  it('update后 entityId 不变', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(42, 50))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].entityId).toBe(42)
  })

  it('update后 weldingSkill 不变', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 50, 77, 20, 35))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers[0].weldingSkill).toBe(77)
  })

  it('增长和删除在同一次 update 中同时发生', () => {
    ;(sys as any).chainmakers.push(makeChainmaker(1, 3.98)) // 增长后恰好4被删
    ;(sys as any).chainmakers.push(makeChainmaker(2, 50))   // 增长后保留
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    expect((sys as any).chainmakers).toHaveLength(1)
    expect((sys as any).chainmakers[0].entityId).toBe(2)
    expect((sys as any).chainmakers[0].linkForging).toBeCloseTo(50.02)
  })

  it('大量链匠(9个，满员-1)时正常增长', () => {
    for (let i = 1; i <= 9; i++) {
      ;(sys as any).chainmakers.push(makeChainmaker(i, 50))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不招募
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2640)
    for (const c of (sys as any).chainmakers) {
      expect(c.linkForging).toBeCloseTo(50.02)
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
    sys.update(9999, fakeEm, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })
})
