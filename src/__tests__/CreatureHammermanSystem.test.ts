import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHammermanSystem } from '../systems/CreatureHammermanSystem'
import type { Hammerman } from '../systems/CreatureHammermanSystem'

let nextId = 1
function makeSys(): CreatureHammermanSystem { return new CreatureHammermanSystem() }
function makeHammerman(
  entityId: number,
  hammeringSkill = 70,
  rhythmControl = 60,
  strikeForce = 80,
  metalShaping = 65,
  tick = 0
): Hammerman {
  return { id: nextId++, entityId, hammeringSkill, rhythmControl, strikeForce, metalShaping, tick }
}

function makeEmStub() {
  return {} as any
}

describe('CreatureHammermanSystem — 初始化状态', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无锤工', () => {
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('hammermen 初始为空数组', () => {
    expect(Array.isArray((sys as any).hammermen)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).hammermen.push(makeHammerman(1))
    expect((s2 as any).hammermen).toHaveLength(0)
  })
})

describe('CreatureHammermanSystem — 数据结构', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查��', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    expect((sys as any).hammermen[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    ;(sys as any).hammermen.push(makeHammerman(2))
    expect((sys as any).hammermen).toHaveLength(2)
  })

  it('四字段完整性验证', () => {
    ;(sys as any).hammermen.push(makeHammerman(5))
    const h = (sys as any).hammermen[0]
    expect(h.hammeringSkill).toBe(70)
    expect(h.rhythmControl).toBe(60)
    expect(h.strikeForce).toBe(80)
    expect(h.metalShaping).toBe(65)
  })

  it('tick 字段正确保存', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 70, 60, 80, 65, 9000))
    expect((sys as any).hammermen[0].tick).toBe(9000)
  })

  it('id 字段为数字类型', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    expect(typeof (sys as any).hammermen[0].id).toBe('number')
  })

  it('注入 10 个锤工全部存在', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).hammermen.push(makeHammerman(i))
    }
    expect((sys as any).hammermen).toHaveLength(10)
  })

  it('不同实体 entityId 各自独立存储', () => {
    ;(sys as any).hammermen.push(makeHammerman(100, 20))
    ;(sys as any).hammermen.push(makeHammerman(200, 80))
    expect((sys as any).hammermen[0].hammeringSkill).toBe(20)
    expect((sys as any).hammermen[1].hammeringSkill).toBe(80)
  })

  it('顺序保持正确', () => {
    ;(sys as any).hammermen.push(makeHammerman(10))
    ;(sys as any).hammermen.push(makeHammerman(20))
    ;(sys as any).hammermen.push(makeHammerman(30))
    const ids = (sys as any).hammermen.map((h: Hammerman) => h.entityId)
    expect(ids).toEqual([10, 20, 30])
  })
})

describe('CreatureHammermanSystem — CHECK_INTERVAL 节流 (2910)', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 2910 时不更新 lastCheck', () => {
    const em = makeEmStub()
    sys.update(0, em, 0)
    const before = (sys as any).lastCheck
    sys.update(0, em, 2909)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 2910 时更新 lastCheck', () => {
    const em = makeEmStub()
    sys.update(0, em, 0)
    sys.update(0, em, 2910)
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('连续触发两次 lastCheck 正确递进', () => {
    const em = makeEmStub()
    sys.update(0, em, 2910)
    sys.update(0, em, 5820)
    expect((sys as any).lastCheck).toBe(5820)
  })

  it('恰好 2910 时触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('2909 时不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2909)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 为负数时正 tick 可触发', () => {
    ;(sys as any).lastCheck = -5000
    sys.update(0, makeEmStub(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=0 时不触发（��始 lastCheck=0）', () => {
    sys.update(0, makeEmStub(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大 tick 值仍正确触发', () => {
    ;(sys as any).lastCheck = 1_000_000
    sys.update(0, makeEmStub(), 1_000_000 + 2910)
    expect((sys as any).lastCheck).toBe(1_002_910)
  })

  it('触发后短间隔不再触发', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    const skill = (sys as any).hammermen[0].hammeringSkill
    sys.update(0, makeEmStub(), 2911)
    expect((sys as any).hammermen[0].hammeringSkill).toBe(skill)
  })
})

describe('CreatureHammermanSystem — 技能递增', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 hammeringSkill +0.02', () => {
    const h = makeHammerman(1, 50)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(50.02, 5)
  })

  it('update 后 rhythmControl +0.015', () => {
    const h = makeHammerman(1, 50, 40)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].rhythmControl).toBeCloseTo(40.015, 5)
  })

  it('update 后 metalShaping +0.01', () => {
    const h = makeHammerman(1, 50, 60, 80, 30)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].metalShaping).toBeCloseTo(30.01, 5)
  })

  it('hammeringSkill 上限为 100（不超过）', () => {
    const h = makeHammerman(1, 99.99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBe(100)
  })

  it('rhythmControl 上限为 100', () => {
    const h = makeHammerman(1, 50, 99.99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].rhythmControl).toBe(100)
  })

  it('metalShaping 上限为 100', () => {
    const h = makeHammerman(1, 50, 60, 80, 99.99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].metalShaping).toBe(100)
  })

  it('hammeringSkill 恰好 100 保持 100', () => {
    const h = makeHammerman(1, 100)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBe(100)
  })

  it('rhythmControl 恰好 100 保持 100', () => {
    const h = makeHammerman(1, 50, 100)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].rhythmControl).toBe(100)
  })

  it('strikeForce 字段不被 update 修改（无递增逻辑）', () => {
    const h = makeHammerman(1, 50, 60, 77)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].strikeForce).toBe(77)
  })

  it('多个锤工技能同时增长', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 50))
    ;(sys as any).hammermen.push(makeHammerman(2, 70))
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(50.02)
    expect((sys as any).hammermen[1].hammeringSkill).toBeCloseTo(70.02)
  })

  it('多次 update 后技能累积', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 50))
    sys.update(0, makeEmStub(), 2910)
    sys.update(0, makeEmStub(), 5820)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(50.04)
  })

  it('低值技能（如 5）也正常递增', () => {
    const h = makeHammerman(1, 5, 5, 5, 5)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(5.02)
    expect((sys as any).hammermen[0].rhythmControl).toBeCloseTo(5.015)
    expect((sys as any).hammermen[0].metalShaping).toBeCloseTo(5.01)
  })
})

describe('CreatureHammermanSystem — cleanup 逻辑', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('hammeringSkill <= 4 时锤工被删除', () => {
    const h = makeHammerman(1, 3.98)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('hammeringSkill > 4 时锤工保留', () => {
    const h = makeHammerman(1, 4.01)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
  })

  it('cleanup 在递增之后执行（先增后删）', () => {
    const h = makeHammerman(1, 4.0)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(4.02, 5)
  })

  it('hammeringSkill = 3.0 递增后 3.02 <= 4，被删除', () => {
    const h = makeHammerman(1, 3.0)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('hammeringSkill = 0 被删除', () => {
    const h = makeHammerman(1, 0)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('多个混合：低技能删、高技能留', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 1))   // 删
    ;(sys as any).hammermen.push(makeHammerman(2, 50))  // 留
    ;(sys as any).hammermen.push(makeHammerman(3, 2))   // 删
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
    expect((sys as any).hammermen[0].entityId).toBe(2)
  })

  it('全部低于阈值时清空数组', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).hammermen.push(makeHammerman(i, 1))
    }
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('cleanup 后继续 update 正常工作', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 1))
    ;(sys as any).hammermen.push(makeHammerman(2, 50))
    sys.update(0, makeEmStub(), 2910)
    sys.update(0, makeEmStub(), 5820)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(50.04)
  })

  it('高技能锤工不触发 cleanup', () => {
    const h = makeHammerman(1, 99)
    ;(sys as any).hammermen.push(h)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
  })
})

describe('CreatureHammermanSystem — 招募逻辑（Math.random mock）', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random < RECRUIT_CHANCE(0.0015) 时招募新锤工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(1)
  })

  it('Math.random > RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('Math.random = RECRUIT_CHANCE(0.0015) 时不招募（条件为 <）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0015)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(0)
  })

  it('已达 MAX_HAMMERMEN(10) 时不招募', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).hammermen.push(makeHammerman(i, 50))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen).toHaveLength(10)
  })

  it('招募时 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    expect((sys as any).nextId).toBe(1)
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).nextId).toBe(2)
  })

  it('招募的锤工含有四个技能字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    const h = (sys as any).hammermen[0]
    expect(h).toHaveProperty('hammeringSkill')
    expect(h).toHaveProperty('rhythmControl')
    expect(h).toHaveProperty('strikeForce')
    expect(h).toHaveProperty('metalShaping')
  })

  it('招募的锤工 id 为 1（初始 nextId）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].id).toBe(1)
  })

  it('招募的锤工 tick 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].tick).toBe(2910)
  })
})

describe('CreatureHammermanSystem — 边界与综合场景', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('不触发时技能不变', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmStub(), 2909)
    expect((sys as any).hammermen[0].hammeringSkill).toBe(50)
  })

  it('不触发时数组不变', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    ;(sys as any).lastCheck = 5000
    sys.update(0, makeEmStub(), 5001)
    expect((sys as any).hammermen).toHaveLength(1)
  })

  it('update 不抛出异常', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 50))
    expect(() => sys.update(0, makeEmStub(), 2910)).not.toThrow()
  })

  it('空数组时 update 不抛出异常', () => {
    expect(() => sys.update(0, makeEmStub(), 2910)).not.toThrow()
  })

  it('技能字段均为数值类型', () => {
    const h = makeHammerman(1)
    expect(typeof h.hammeringSkill).toBe('number')
    expect(typeof h.rhythmControl).toBe('number')
    expect(typeof h.strikeForce).toBe('number')
    expect(typeof h.metalShaping).toBe('number')
  })

  it('10 个锤工循环更新所有字段', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).hammermen.push(makeHammerman(i, 50 + i))
    }
    sys.update(0, makeEmStub(), 2910)
    for (const h of (sys as any).hammermen) {
      expect(h.hammeringSkill).toBeGreaterThan(50)
    }
  })

  it('技能精确到小数（浮点运算正确）', () => {
    ;(sys as any).hammermen.push(makeHammerman(1, 10))
    sys.update(0, makeEmStub(), 2910)
    expect((sys as any).hammermen[0].hammeringSkill).toBeCloseTo(10.02, 5)
  })

  it('hammermen 数组为外部可访问引用', () => {
    const arr = (sys as any).hammermen as Hammerman[]
    arr.push(makeHammerman(1))
    expect((sys as any).hammermen).toHaveLength(1)
  })
})
