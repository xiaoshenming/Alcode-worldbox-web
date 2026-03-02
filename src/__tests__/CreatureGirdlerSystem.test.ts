import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGirdlerSystem } from '../systems/CreatureGirdlerSystem'
import type { Girdler } from '../systems/CreatureGirdlerSystem'

let nextId = 1
function makeSys(): CreatureGirdlerSystem { return new CreatureGirdlerSystem() }
function makeGirdler(entityId: number, overrides: Partial<Girdler> = {}): Girdler {
  return {
    id: nextId++,
    entityId,
    leatherCutting: 50,
    buckleMaking: 60,
    stitchWork: 70,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}
const em = {} as any

describe('CreatureGirdlerSystem — 初始化状态', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无腰带匠', () => {
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('girdlers 初始为空数组', () => {
    expect(Array.isArray((sys as any).girdlers)).toBe(true)
  })

  it('多个实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).girdlers.push(makeGirdler(1))
    expect((s2 as any).girdlers).toHaveLength(0)
  })
})

describe('CreatureGirdlerSystem — 数据注入与查询', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).girdlers.push(makeGirdler(42))
    expect((sys as any).girdlers[0].entityId).toBe(42)
  })

  it('多个腰带匠全部返回', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    ;(sys as any).girdlers.push(makeGirdler(2))
    ;(sys as any).girdlers.push(makeGirdler(3))
    expect((sys as any).girdlers).toHaveLength(3)
  })

  it('四字段数据完整（leatherCutting/stitchWork/buckleMaking/outputQuality）', () => {
    const g = makeGirdler(10, { leatherCutting: 90, buckleMaking: 85, stitchWork: 80, outputQuality: 75 })
    ;(sys as any).girdlers.push(g)
    const r = (sys as any).girdlers[0]
    expect(r.leatherCutting).toBe(90)
    expect(r.buckleMaking).toBe(85)
    expect(r.stitchWork).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  it('tick 字段正确保存', () => {
    const g = makeGirdler(1, { tick: 9999 })
    ;(sys as any).girdlers.push(g)
    expect((sys as any).girdlers[0].tick).toBe(9999)
  })

  it('id 字段为数字', () => {
    const g = makeGirdler(1)
    ;(sys as any).girdlers.push(g)
    expect(typeof (sys as any).girdlers[0].id).toBe('number')
  })

  it('注入 10 个腰带匠全部存在', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).girdlers.push(makeGirdler(i))
    }
    expect((sys as any).girdlers).toHaveLength(10)
  })

  it('不同 entityId 腰带匠各自独立', () => {
    ;(sys as any).girdlers.push(makeGirdler(100, { leatherCutting: 20 }))
    ;(sys as any).girdlers.push(makeGirdler(200, { leatherCutting: 80 }))
    expect((sys as any).girdlers[0].leatherCutting).toBe(20)
    expect((sys as any).girdlers[1].leatherCutting).toBe(80)
  })
})

describe('CreatureGirdlerSystem — CHECK_INTERVAL 节流 (2610)', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 2610 不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5000 + 2609)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick 差值 >= 2610 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 1000 + 2610)
    expect((sys as any).lastCheck).toBe(3610)
  })

  it('tick 差值恰好 = 2610 时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).lastCheck).toBe(2610)
  })

  it('tick 差值 = 2609 时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2609)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续两次满足间隔，lastCheck 递进两次', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).lastCheck).toBe(2610)
    sys.update(0, em, 5220)
    expect((sys as any).lastCheck).toBe(5220)
  })

  it('lastCheck 为负数时，正 tick 满足间隔', () => {
    ;(sys as any).lastCheck = -5000
    sys.update(0, em, 0)
    // 0 - (-5000) = 5000 >= 2610 => 触发
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=0 时不触发（初始 lastCheck=0，差值=0）', () => {
    sys.update(0, em, 0)
    // 0 - 0 = 0 < 2610，不触发
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大 tick 值仍正确触发', () => {
    ;(sys as any).lastCheck = 1_000_000
    sys.update(0, em, 1_000_000 + 2610)
    expect((sys as any).lastCheck).toBe(1_002_610)
  })
})

describe('CreatureGirdlerSystem — 技能递增', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 leatherCutting +0.02', () => {
    const g = makeGirdler(1, { leatherCutting: 50 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.02)
  })

  it('update 后 stitchWork +0.015', () => {
    const g = makeGirdler(1, { stitchWork: 60 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].stitchWork).toBeCloseTo(60.015)
  })

  it('update 后 outputQuality +0.01', () => {
    const g = makeGirdler(1, { outputQuality: 40 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].outputQuality).toBeCloseTo(40.01)
  })

  it('leatherCutting 上限 100（钳制）', () => {
    const g = makeGirdler(1, { leatherCutting: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBe(100)
  })

  it('stitchWork 上限 100（钳制）', () => {
    const g = makeGirdler(1, { stitchWork: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].stitchWork).toBe(100)
  })

  it('outputQuality 上限 100（钳制）', () => {
    const g = makeGirdler(1, { outputQuality: 99.99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].outputQuality).toBe(100)
  })

  it('leatherCutting 恰好 100 保持 100', () => {
    const g = makeGirdler(1, { leatherCutting: 100 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBe(100)
  })

  it('stitchWork 恰好 100 保持 100', () => {
    const g = makeGirdler(1, { stitchWork: 100 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].stitchWork).toBe(100)
  })

  it('outputQuality 恰好 100 保持 100', () => {
    const g = makeGirdler(1, { outputQuality: 100 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].outputQuality).toBe(100)
  })

  it('buckleMaking 字段不被 update 修改（无递增逻辑）', () => {
    const g = makeGirdler(1, { buckleMaking: 55 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].buckleMaking).toBe(55)
  })

  it('多个腰带匠的技能同时增长', () => {
    ;(sys as any).girdlers.push(makeGirdler(1, { leatherCutting: 50, stitchWork: 60 }))
    ;(sys as any).girdlers.push(makeGirdler(2, { leatherCutting: 70, stitchWork: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.02)
    expect((sys as any).girdlers[1].leatherCutting).toBeCloseTo(70.02)
  })

  it('技能低值（如 5）也能正常递增', () => {
    const g = makeGirdler(1, { leatherCutting: 5, stitchWork: 5, outputQuality: 5 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(5.02)
    expect((sys as any).girdlers[0].stitchWork).toBeCloseTo(5.015)
    expect((sys as any).girdlers[0].outputQuality).toBeCloseTo(5.01)
  })

  it('多次 update 后技能持续累积', () => {
    const g = makeGirdler(1, { leatherCutting: 50 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    sys.update(0, em, 5220)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.04)
  })
})

describe('CreatureGirdlerSystem — cleanup 逻辑', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('cleanup: leatherCutting 3.98+0.02=4.00 恰好 <= 4 被删除', () => {
    const g = makeGirdler(1, { leatherCutting: 3.98 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('cleanup: leatherCutting 4.02+0.02=4.04 > 4 保留', () => {
    const g1 = makeGirdler(1, { leatherCutting: 3.98 }) // 删除
    const g2 = makeGirdler(2, { leatherCutting: 4.02 }) // 保留
    ;(sys as any).girdlers.push(g1, g2)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
    expect((sys as any).girdlers[0].entityId).toBe(2)
  })

  it('leatherCutting 4.0 先 +0.02 => 4.02 > 4，不删', () => {
    const g = makeGirdler(1, { leatherCutting: 4.0 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(4.02)
  })

  it('leatherCutting = 3.0 递增后 = 3.02 <= 4，删除', () => {
    const g = makeGirdler(1, { leatherCutting: 3.0 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('leatherCutting = 0 被删除', () => {
    const g = makeGirdler(1, { leatherCutting: 0 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('leatherCutting 极高值不触发 cleanup', () => {
    const g = makeGirdler(1, { leatherCutting: 99 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
  })

  it('cleanup 从后往前遍历，不跳过元素', () => {
    // 三个元素，第一个和第三个应被删除
    ;(sys as any).girdlers.push(makeGirdler(1, { leatherCutting: 1 }))  // 删
    ;(sys as any).girdlers.push(makeGirdler(2, { leatherCutting: 50 })) // 留
    ;(sys as any).girdlers.push(makeGirdler(3, { leatherCutting: 2 }))  // 删
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
    expect((sys as any).girdlers[0].entityId).toBe(2)
  })

  it('全部腰带匠均低于阈值时清空数组', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).girdlers.push(makeGirdler(i, { leatherCutting: 1 }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('cleanup 后 update 继续正常工作', () => {
    ;(sys as any).girdlers.push(makeGirdler(1, { leatherCutting: 1 }))
    ;(sys as any).girdlers.push(makeGirdler(2, { leatherCutting: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    sys.update(0, em, 5220)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(50.04)
  })
})

describe('CreatureGirdlerSystem — 招募逻辑（Math.random mock）', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random < RECRUIT_CHANCE(0.0014) 时招募新腰带匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(1)
  })

  it('Math.random > RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('Math.random = RECRUIT_CHANCE(0.0014) 时不招募（条件为 < 而非 <=）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0014)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers).toHaveLength(0)
  })

  it('已达 MAX_GIRDLERS(10) 时不招募', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).girdlers.push(makeGirdler(i, { leatherCutting: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    // 招募被跳过（已达上限），但原有10个会被更新，leatherCutting 50.02 > 4，全部保留
    expect((sys as any).girdlers).toHaveLength(10)
  })

  it('招募时 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    expect((sys as any).nextId).toBe(1)
    sys.update(0, em, 2610)
    expect((sys as any).nextId).toBe(2)
  })

  it('招募时新腰带匠含有 leatherCutting/buckleMaking/stitchWork/outputQuality 字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    const g = (sys as any).girdlers[0]
    expect(g).toHaveProperty('leatherCutting')
    expect(g).toHaveProperty('buckleMaking')
    expect(g).toHaveProperty('stitchWork')
    expect(g).toHaveProperty('outputQuality')
  })

  it('招募的腰带匠 id 为 nextId 的值（1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].id).toBe(1)
  })

  it('招募的腰带匠 tick 记录当前 tick 值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].tick).toBe(2610)
  })

  it('连续两次满足条件且未达上限时可招募两次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    sys.update(0, em, 5220)
    // 第一次招募的 leatherCutting 在 [10,35] 范围，+0.02 后 >> 4，不会被 cleanup
    expect((sys as any).girdlers.length).toBeGreaterThanOrEqual(2)
  })
})

describe('CreatureGirdlerSystem — 边界与综合场景', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('不触发时技能不变', () => {
    const g = makeGirdler(1, { leatherCutting: 50 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2609) // 差值不足
    expect((sys as any).girdlers[0].leatherCutting).toBe(50)
  })

  it('不触发时 girdlers 数组不变', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 5001)
    expect((sys as any).girdlers).toHaveLength(1)
  })

  it('girdlers 数组为外部引用，可直接操作', () => {
    const arr = (sys as any).girdlers as Girdler[]
    arr.push(makeGirdler(1))
    expect((sys as any).girdlers).toHaveLength(1)
  })

  it('各技能字段均为数值型', () => {
    const g = makeGirdler(1)
    expect(typeof g.leatherCutting).toBe('number')
    expect(typeof g.buckleMaking).toBe('number')
    expect(typeof g.stitchWork).toBe('number')
    expect(typeof g.outputQuality).toBe('number')
  })

  it('先后插入的腰带匠顺序保持', () => {
    ;(sys as any).girdlers.push(makeGirdler(10))
    ;(sys as any).girdlers.push(makeGirdler(20))
    ;(sys as any).girdlers.push(makeGirdler(30))
    const ids = (sys as any).girdlers.map((g: Girdler) => g.entityId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('update 调用不会抛出异常', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, em, 2610)).not.toThrow()
  })

  it('空 girdlers 时 update 不抛异常', () => {
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, em, 2610)).not.toThrow()
  })

  it('10 个腰带匠循环更新所有字段', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).girdlers.push(makeGirdler(i, { leatherCutting: 50 + i }))
    }
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    for (const g of (sys as any).girdlers) {
      expect(g.leatherCutting).toBeGreaterThan(50)
    }
  })

  it('技能精确到小数（浮点运算）', () => {
    const g = makeGirdler(1, { leatherCutting: 10 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].leatherCutting).toBeCloseTo(10.02, 5)
  })

  it('outputQuality 从 0 出发也能正常增长', () => {
    const g = makeGirdler(1, { outputQuality: 0.5 })
    ;(sys as any).girdlers.push(g)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2610)
    expect((sys as any).girdlers[0].outputQuality).toBeCloseTo(0.51)
  })
})
