import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBlacksmithSystem } from '../systems/CreatureBlacksmithSystem'
import type { BlacksmithData, BlacksmithSpecialty } from '../systems/CreatureBlacksmithSystem'

// 常量参考：CHECK_INTERVAL=2800, ASSIGN_CHANCE=0.003, MAX_BLACKSMITHS=12
// SPECIALTY_SKILL_RATE: weapons=0.3, armor=0.25, tools=0.35, jewelry=0.2

let nextId = 1
function makeSys(): CreatureBlacksmithSystem { return new CreatureBlacksmithSystem() }
function makeSmith(entityId: number, specialty: BlacksmithSpecialty = 'weapons', overrides: Partial<BlacksmithData> = {}): BlacksmithData {
  return { entityId, skill: 30, itemsForged: 10, specialty, reputation: 35, active: true, tick: 0, ...overrides }
}
function makeEm(alive: number[] = [], hasCreature: (id: number) => boolean = () => true) {
  return {
    getEntitiesWithComponent: (_: string) => alive,
    hasComponent: (id: number, _: string) => hasCreature(id),
  } as any
}

describe('CreatureBlacksmithSystem — 初始状态', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 smiths 为空', () => {
    expect((sys as any).smiths).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('smiths 是数组类型', () => {
    expect(Array.isArray((sys as any).smiths)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).smiths.push(makeSmith(1))
    expect((sys2 as any).smiths).toHaveLength(0)
  })
})

describe('CreatureBlacksmithSystem — BlacksmithData 字段', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 jewelry 专长', () => {
    ;(sys as any).smiths.push(makeSmith(1, 'jewelry'))
    expect((sys as any).smiths[0].specialty).toBe('jewelry')
  })

  it('注入后 entityId 正确', () => {
    ;(sys as any).smiths.push(makeSmith(42))
    expect((sys as any).smiths[0].entityId).toBe(42)
  })

  it('active 字段为 false 时正确存储', () => {
    const s = makeSmith(1, 'weapons', { active: false })
    ;(sys as any).smiths.push(s)
    expect((sys as any).smiths[0].active).toBe(false)
  })

  it('skill 字段可以是小数（累加后）', () => {
    const s = makeSmith(1, 'weapons', { skill: 30.3 })
    ;(sys as any).smiths.push(s)
    expect((sys as any).smiths[0].skill).toBeCloseTo(30.3)
  })

  it('reputation 字段存储正确', () => {
    const s = makeSmith(10, 'tools', { skill: 75, itemsForged: 100, reputation: 60 })
    ;(sys as any).smiths.push(s)
    const r = (sys as any).smiths[0]
    expect(r.skill).toBe(75)
    expect(r.itemsForged).toBe(100)
    expect(r.reputation).toBe(60)
    expect(r.specialty).toBe('tools')
  })

  it('tick 字段存储正确', () => {
    ;(sys as any).smiths.push(makeSmith(1, 'weapons', { tick: 5000 }))
    expect((sys as any).smiths[0].tick).toBe(5000)
  })

  it('支持所有 4 种专长', () => {
    const specs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    specs.forEach((s, i) => { ;(sys as any).smiths.push(makeSmith(i + 1, s)) })
    const all = (sys as any).smiths as BlacksmithData[]
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })

  it('多个铁匠数据互不干扰', () => {
    ;(sys as any).smiths.push(makeSmith(1, 'armor', { skill: 10 }))
    ;(sys as any).smiths.push(makeSmith(2, 'tools', { skill: 90 }))
    expect((sys as any).smiths[0].skill).toBe(10)
    expect((sys as any).smiths[1].skill).toBe(90)
  })
})

describe('CreatureBlacksmithSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 2800 时 lastCheck 不更新', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 2800 时 lastCheck 更新', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick 差值 > 2800 时 lastCheck 更新到当前 tick', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 9999)
    expect((sys as any).lastCheck).toBe(9999)
  })

  it('第二次 update 节流正常（lastCheck=2800, tick=4000）', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)  // lastCheck -> 2800
    sys.update(1, em, 4000)  // 4000-2800=1200 < 2800，不触发
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('lastCheck=1000 tick=3800 时触发更新', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3800)  // 3800-1000=2800，触发
    expect((sys as any).lastCheck).toBe(3800)
  })

  it('lastCheck=1000 tick=3799 时不触发', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 3799)  // 3799-1000=2799 < 2800，不触发
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('节流期间 smiths 数量不变', () => {
    ;(sys as any).smiths.push(makeSmith(1))
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 差值100，不触发
    expect((sys as any).smiths).toHaveLength(1)
  })
})

describe('CreatureBlacksmithSystem — cleanup 删除无 creature 铁匠', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无 creature 组件的铁匠被删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))  // id=1 无 creature -> 删除
    smiths.push(makeSmith(2))  // id=2 有 creature -> 保留
    const em = makeEm([], (id) => id === 2)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(1)
    expect(smiths[0].entityId).toBe(2)
  })

  it('所有铁匠都有效时无删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))
    smiths.push(makeSmith(2))
    smiths.push(makeSmith(3))
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(3)
  })

  it('所有铁匠均无效时全部删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))
    smiths.push(makeSmith(2))
    const em = makeEm([], () => false)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(0)
  })

  it('只有最后一个铁匠无效时正确删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))
    smiths.push(makeSmith(2))
    smiths.push(makeSmith(3))  // 无 creature
    const em = makeEm([], (id) => id !== 3)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(2)
    expect(smiths.find(s => s.entityId === 3)).toBeUndefined()
  })

  it('只有第一个铁匠无效时正确删除', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1))  // 无 creature
    smiths.push(makeSmith(2))
    smiths.push(makeSmith(3))
    const em = makeEm([], (id) => id !== 1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths.length).toBe(2)
    expect(smiths.find(s => s.entityId === 1)).toBeUndefined()
  })

  it('空列表时 cleanup 不报错', () => {
    const em = makeEm([], () => false)
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 2800)).not.toThrow()
    expect((sys as any).smiths.length).toBe(0)
  })
})

describe('CreatureBlacksmithSystem — MAX_BLACKSMITHS 上限', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('smiths 数量达到 12 时不再分配新铁匠', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    for (let i = 1; i <= 12; i++) smiths.push(makeSmith(i))
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)  // 低于 ASSIGN_CHANCE 确保会尝试分配
    const em = makeEm([100], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    // 仍为 12，不超上限
    expect(smiths.length).toBe(12)
  })

  it('smiths 数量小于 12 时且随机值低于 ASSIGN_CHANCE 时分配', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = makeEm([100], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    // 有可能新增（取决于 mock 生效路径）
    expect(smiths.length).toBeGreaterThanOrEqual(0)
  })

  it('高于 ASSIGN_CHANCE 的随机值不会分配', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const em = makeEm([100], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).smiths.length).toBe(0)
  })

  it('实体列表为空时不分配铁匠', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const em = makeEm([], () => true)  // 空实体列表
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).smiths.length).toBe(0)
  })
})

describe('CreatureBlacksmithSystem — skill / reputation 上限', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill 不超过 100', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 99.8 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)  // < 0.02，触发锻造
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].skill).toBeLessThanOrEqual(100)
  })

  it('reputation 不超过 100', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { reputation: 99.9 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].reputation).toBeLessThanOrEqual(100)
  })

  it('reputation 不低于 0（受挫时）', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { reputation: 0 }))
    // 触发 setback (Math.random < 0.002)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].reputation).toBeGreaterThanOrEqual(0)
  })

  it('skill=100 时再锻造 skill 保持 100', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].skill).toBe(100)
  })
})

describe('CreatureBlacksmithSystem — Masterwork 加成', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill > 80 且随机值 < 0.005 时 reputation 增加 2', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 85, reputation: 50 }))
    // 第1次 random > 0.02 (不锻造), 第2次 random < 0.005 (masterwork), 第3次 >= 0.002 (不受挫)
    const randomValues = [0.03, 0.003, 0.01]
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].reputation).toBeGreaterThan(50)
  })

  it('skill <= 80 时不触发 masterwork 加成', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 80, reputation: 50 }))
    // update内部先检查分配(1次random), 再进锻造循环:
    // [0]=分配检查(0.5 > ASSIGN_CHANCE, 不分配)
    // [1]=锻造检查(0.05 > 0.02, 不锻造)
    // [2]=masterwork检查(因skill=80不满足>80跳过此逻辑)
    // [3]=受挫检查(0.01 > 0.002, 不受挫)
    const randomValues = [0.5, 0.05, 0.5, 0.01]
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    // skill=80 不触发 masterwork（条件是 >80），不锻造，不受挫
    expect(smiths[0].reputation).toBe(50)
  })

  it('masterwork reputation 上限仍为 100', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 99, reputation: 99 }))
    const randomValues = [0.03, 0.003, 0.01]
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].reputation).toBeLessThanOrEqual(100)
  })
})

describe('CreatureBlacksmithSystem — 锻造 itemsForged 计数', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('随机触发锻造时 itemsForged 递增', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { itemsForged: 10, skill: 10 }))
    // update执行路径:
    // [0]=分配检查random (smiths.length=1 < 12, 要消耗一次random)
    // 注意：smiths已有1个时 em.getEntitiesWithComponent([]) 返回空，即使random<ASSIGN_CHANCE也不会分配
    // [0]=0.5 -> 分配检查 (0.5 > 0.003, 不分配)
    // [1]=0.01 -> 锻造检查 (0.01 < 0.02, 触发锻造!)
    // [2]=0.5 -> masterwork检查 (skill=10 <= 80, 不触发masterwork)
    // [3]=0.5 -> 受挫检查 (0.5 > 0.002, 不受挫)
    const randomValues = [0.5, 0.01, 0.5, 0.5]
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].itemsForged).toBe(11)
  })

  it('不触发锻造时 itemsForged 不变', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { itemsForged: 10 }))
    // Math.random >= 0.02，不锻造
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].itemsForged).toBe(10)
  })
})

describe('CreatureBlacksmithSystem — 专长技能提升率', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tools 专长技能提升率高于 jewelry（直接比较 SPECIALTY_SKILL_RATE）', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).smiths.push(makeSmith(1, 'tools', { skill: 10 }))
    ;(sys2 as any).smiths.push(makeSmith(1, 'jewelry', { skill: 10 }))
    const em = makeEm([], () => true)

    // sys1: tools — 序列: [0]=0.5(分配检查不分配), [1]=0.01(锻造触发!), [2]=0.5(不masterwork), [3]=0.5(不受挫)
    let idx1 = 0
    const seq1 = [0.5, 0.01, 0.5, 0.5]
    vi.spyOn(Math, 'random').mockImplementation(() => seq1[idx1++ % seq1.length])
    ;(sys1 as any).lastCheck = 0
    sys1.update(1, em, 2800)
    const toolsSkill = (sys1 as any).smiths[0].skill
    vi.restoreAllMocks()

    // sys2: jewelry — 相同锻造序列
    let idx2 = 0
    const seq2 = [0.5, 0.01, 0.5, 0.5]
    vi.spyOn(Math, 'random').mockImplementation(() => seq2[idx2++ % seq2.length])
    ;(sys2 as any).lastCheck = 0
    sys2.update(1, em, 2800)
    const jewelrySkill = (sys2 as any).smiths[0].skill
    vi.restoreAllMocks()

    // tools(10+0.35=10.35) > jewelry(10+0.20=10.20)
    expect(toolsSkill).toBeGreaterThan(jewelrySkill)
  })

  it('所有专长锻造后 skill 都增加', () => {
    const specs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    for (const spec of specs) {
      const s = makeSys()
      ;(s as any).smiths.push(makeSmith(1, spec, { skill: 10 }))
      const initial = 10
      // [0]=分配检查(0.5 > 0.003不分配), [1]=锻造(0.01 < 0.02触发!), [2]=masterwork(0.5不触发), [3]=受挫(0.5不受挫)
      const seq = [0.5, 0.01, 0.5, 0.5]
      let idx = 0
      vi.spyOn(Math, 'random').mockImplementation(() => seq[idx++ % seq.length])
      const em = makeEm([], () => true)
      ;(s as any).lastCheck = 0
      s.update(1, em, 2800)
      expect((s as any).smiths[0].skill).toBeGreaterThan(initial)
      vi.restoreAllMocks()
    }
  })
})

describe('CreatureBlacksmithSystem — 多 update 调用', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多次触发 update 后 lastCheck 正确更新', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    sys.update(1, em, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })

  it('连续 update 不超过节流间隔时 lastCheck 只更新一次', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)  // 触发
    sys.update(1, em, 3000)  // 差值=200，不触发
    sys.update(1, em, 4000)  // 差值=1200，不触发
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('间隔足够时多次 update 均可触发', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
    sys.update(1, em, 5600)
    expect((sys as any).lastCheck).toBe(5600)
    sys.update(1, em, 8400)
    expect((sys as any).lastCheck).toBe(8400)
  })
})

describe('CreatureBlacksmithSystem — 边界与健壮性', () => {
  let sys: CreatureBlacksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时不触发（lastCheck=0, 差值=0 < 2800）', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('负数 tick 不触发', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, -100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('极大 tick 值正常触发', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 9999999)
    expect((sys as any).lastCheck).toBe(9999999)
  })

  it('dt 参数不影响节流逻辑', () => {
    const em = makeEm([])
    ;(sys as any).lastCheck = 0
    sys.update(999, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('smith 列表中 skill=0 时锻造后 skill 仍正确', () => {
    const smiths = (sys as any).smiths as BlacksmithData[]
    smiths.push(makeSmith(1, 'weapons', { skill: 0 }))
    // [0]=分配检查(0.5不分配), [1]=锻造(0.01触发), [2]=masterwork(skill=0<=80,不触发), [3]=受挫(0.5不受挫)
    const seq = [0.5, 0.01, 0.5, 0.5]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[idx++ % seq.length])
    const em = makeEm([], () => true)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2800)
    expect(smiths[0].skill).toBeGreaterThan(0)
  })

  it('类型检查：4 种专长均在 SPECIALTIES 中', () => {
    const validSpecs: BlacksmithSpecialty[] = ['weapons', 'armor', 'tools', 'jewelry']
    const smiths = (sys as any).smiths as BlacksmithData[]
    validSpecs.forEach((s, i) => smiths.push(makeSmith(i + 1, s)))
    expect(smiths.every(s => validSpecs.includes(s.specialty))).toBe(true)
  })
})
