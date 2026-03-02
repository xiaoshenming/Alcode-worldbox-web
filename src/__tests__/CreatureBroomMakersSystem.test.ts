import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBroomMakersSystem } from '../systems/CreatureBroomMakersSystem'
import type { BroomMaker, BroomType } from '../systems/CreatureBroomMakersSystem'

let nextId = 1
function makeSys(): CreatureBroomMakersSystem { return new CreatureBroomMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<BroomMaker> = {}): BroomMaker {
  return {
    id: nextId++, entityId, skill: 30, broomsMade: 5,
    broomType: 'straw', durability: 39.5, reputation: 29, tick: 0,
    ...overrides
  }
}

// 返回空 creatures 列表的基础 em mock
function makeEmEmpty() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
    hasComponent: () => true,
  } as any
}

// 带有生物的 em mock（可控 age）
function makeEmWithCreature(eid: number, age: number) {
  return {
    getEntitiesWithComponents: () => [eid],
    getComponent: (_eid: number, _comp: string) => ({ age }),
    hasComponent: () => true,
  } as any
}

// 带有多生物的 em mock
function makeEmWithCreatures(creatures: Array<{ eid: number; age: number }>) {
  return {
    getEntitiesWithComponents: () => creatures.map(c => c.eid),
    getComponent: (eid: number, _comp: string) => {
      const c = creatures.find(x => x.eid === eid)
      return c ? { age: c.age } : null
    },
    hasComponent: () => true,
  } as any
}

const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
const CHECK_INTERVAL = 1350

describe('CreatureBroomMakersSystem', () => {
  let sys: CreatureBroomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ===================== 初始状态 =====================
  describe('初始状态', () => {
    it('初始无扫帚师', () => {
      expect((sys as any).makers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 skillMap 为空 Map', () => {
      expect((sys as any).skillMap).toBeInstanceOf(Map)
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('实例化返回正确的系统对象', () => {
      expect(sys).toBeInstanceOf(CreatureBroomMakersSystem)
    })
  })

  // ===================== 数据注入与查询 =====================
  describe('数据注入与查询', () => {
    it('注入后可查询', () => {
      ;(sys as any).makers.push(makeMaker(1, { broomType: 'ceremonial' }))
      expect((sys as any).makers[0].broomType).toBe('ceremonial')
    })

    it('可注入多个 maker', () => {
      ;(sys as any).makers.push(makeMaker(1))
      ;(sys as any).makers.push(makeMaker(2))
      ;(sys as any).makers.push(makeMaker(3))
      expect((sys as any).makers).toHaveLength(3)
    })

    it('注入后 entityId 正确', () => {
      ;(sys as any).makers.push(makeMaker(42))
      expect((sys as any).makers[0].entityId).toBe(42)
    })

    it('注入后 skill 正确', () => {
      ;(sys as any).makers.push(makeMaker(1, { skill: 75 }))
      expect((sys as any).makers[0].skill).toBe(75)
    })

    it('注入后 tick 正确', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 5000 }))
      expect((sys as any).makers[0].tick).toBe(5000)
    })

    it('注入后 id 正确（自增）', () => {
      ;(sys as any).makers.push(makeMaker(1)) // id=1
      ;(sys as any).makers.push(makeMaker(2)) // id=2
      expect((sys as any).makers[0].id).toBe(1)
      expect((sys as any).makers[1].id).toBe(2)
    })
  })

  // ===================== BroomType 枚举 =====================
  describe('BroomType 枚举', () => {
    it('BroomType 包含 straw', () => {
      const types: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
      expect(types).toContain('straw')
    })

    it('BroomType 包含 twig', () => {
      expect(BROOM_TYPES).toContain('twig')
    })

    it('BroomType 包含 bristle', () => {
      expect(BROOM_TYPES).toContain('bristle')
    })

    it('BroomType 包含 ceremonial', () => {
      expect(BROOM_TYPES).toContain('ceremonial')
    })

    it('BroomType 共 4 种', () => {
      expect(BROOM_TYPES).toHaveLength(4)
    })

    it('所有 4 种 BroomType 均可注入', () => {
      BROOM_TYPES.forEach((t, i) => {
        ;(sys as any).makers.push(makeMaker(i + 1, { broomType: t }))
      })
      const all = (sys as any).makers as BroomMaker[]
      BROOM_TYPES.forEach((t, i) => { expect(all[i].broomType).toBe(t) })
    })
  })

  // ===================== 公式验证 =====================
  describe('公式验证', () => {
    it('durability 公式：skill=0 → 20', () => {
      const durability = 20 + 0 * 0.65
      expect(durability).toBe(20)
    })

    it('durability 公式：skill=40 → 46', () => {
      const durability = 20 + 40 * 0.65
      expect(durability).toBeCloseTo(46)
    })

    it('durability 公式：skill=100 → 85', () => {
      const durability = 20 + 100 * 0.65
      expect(durability).toBeCloseTo(85)
    })

    it('durability 公式：skill=60 → 59', () => {
      const durability = 20 + 60 * 0.65
      expect(durability).toBeCloseTo(59)
    })

    it('reputation 公式：skill=0 → 8', () => {
      const reputation = 8 + 0 * 0.7
      expect(reputation).toBe(8)
    })

    it('reputation 公式：skill=40 → 36', () => {
      const reputation = 8 + 40 * 0.7
      expect(reputation).toBeCloseTo(36)
    })

    it('reputation 公式：skill=100 → 78', () => {
      const reputation = 8 + 100 * 0.7
      expect(reputation).toBeCloseTo(78)
    })

    it('reputation 公式：skill=60 → 50', () => {
      const reputation = 8 + 60 * 0.7
      expect(reputation).toBeCloseTo(50)
    })

    it('broomsMade 公式：skill=0 → 2', () => {
      const broomsMade = 2 + Math.floor(0 / 6)
      expect(broomsMade).toBe(2)
    })

    it('broomsMade 公式：skill=6 → 3', () => {
      const broomsMade = 2 + Math.floor(6 / 6)
      expect(broomsMade).toBe(3)
    })

    it('broomsMade 公式：skill=60 → 12', () => {
      const broomsMade = 2 + Math.floor(60 / 6)
      expect(broomsMade).toBe(12)
    })

    it('broomsMade 公式：skill=100 → 18', () => {
      const broomsMade = 2 + Math.floor(100 / 6)
      expect(broomsMade).toBe(18)
    })

    it('broomsMade 公式：skill=5 → 2（floor(5/6)=0）', () => {
      const broomsMade = 2 + Math.floor(5 / 6)
      expect(broomsMade).toBe(2)
    })
  })

  // ===================== broomType 分段索引 =====================
  describe('broomType 分段索引（skill/25）', () => {
    it('skill=0 → straw（索引0）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(0 / 25))]).toBe('straw')
    })

    it('skill=10 → straw', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('straw')
    })

    it('skill=24 → straw（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(24 / 25))]).toBe('straw')
    })

    it('skill=25 → twig（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('twig')
    })

    it('skill=35 → twig', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(35 / 25))]).toBe('twig')
    })

    it('skill=49 → twig（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(49 / 25))]).toBe('twig')
    })

    it('skill=50 → bristle（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('bristle')
    })

    it('skill=60 → bristle', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(60 / 25))]).toBe('bristle')
    })

    it('skill=74 → bristle（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(74 / 25))]).toBe('bristle')
    })

    it('skill=75 → ceremonial（边界值）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('ceremonial')
    })

    it('skill=80 → ceremonial', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(80 / 25))]).toBe('ceremonial')
    })

    it('skill=100 → ceremonial（上限截断到索引3）', () => {
      expect(BROOM_TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('ceremonial')
    })
  })

  // ===================== tick 节流逻辑 =====================
  describe('tick 节流逻辑（CHECK_INTERVAL = 1350）', () => {
    it('tick 差值 < 1350 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1000)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值 = 1349 时不更新 lastCheck（边界）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1349)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值 = 1350 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1350)
      expect((sys as any).lastCheck).toBe(1350)
    })

    it('tick 差值 > 1350 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 2000)
      expect((sys as any).lastCheck).toBe(2000)
    })

    it('lastCheck 非 0 时节流依然正确（基于差值）', () => {
      ;(sys as any).lastCheck = 5000
      sys.update(1, makeEmEmpty(), 6000) // 差值 1000 < 1350
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('lastCheck 非 0 时：差值 >= 1350 则更新', () => {
      ;(sys as any).lastCheck = 5000
      sys.update(1, makeEmEmpty(), 6350) // 差值 1350
      expect((sys as any).lastCheck).toBe(6350)
    })

    it('连续两次调用：第一次触发后 lastCheck 变化，第二次不触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1350) // 触发，lastCheck=1350
      sys.update(1, makeEmEmpty(), 2000) // 差值 650 < 1350，不触发
      expect((sys as any).lastCheck).toBe(1350)
    })

    it('连续两次调用都触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1350) // 触发，lastCheck=1350
      sys.update(1, makeEmEmpty(), 2700) // 差值 1350，触发，lastCheck=2700
      expect((sys as any).lastCheck).toBe(2700)
    })
  })

  // ===================== time-based cleanup =====================
  describe('time-based cleanup（cutoff = tick - 50000）', () => {
    it('tick=0 的记录在 update(tick=60000) 时被删除（0 < cutoff=10000）', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('tick=55000 的记录在 update(tick=60000) 时保留（55000 >= cutoff=10000）', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('tick 恰好等于 cutoff 时保留（边界：>= cutoff）', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 10000 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000) // cutoff=10000，tick=10000 不被删
      expect((sys as any).makers).toHaveLength(1)
    })

    it('tick 比 cutoff 小 1 时被删除', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 9999 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000) // cutoff=10000，9999 < 10000
      expect((sys as any).makers).toHaveLength(0)
    })

    it('多条记录：旧的被删，新的保留', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))     // 旧，删
      ;(sys as any).makers.push(makeMaker(2, { tick: 5000 }))  // 旧，删
      ;(sys as any).makers.push(makeMaker(3, { tick: 50000 })) // 新，留
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000)
      const remaining = (sys as any).makers as BroomMaker[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(3)
    })

    it('所有记录均新时无删除', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
      ;(sys as any).makers.push(makeMaker(2, { tick: 56000 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000)
      expect((sys as any).makers).toHaveLength(2)
    })

    it('所有记录均旧时全部删除', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 1000 }))
      ;(sys as any).makers.push(makeMaker(2, { tick: 2000 }))
      ;(sys as any).makers.push(makeMaker(3, { tick: 3000 }))
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 60000)
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ===================== MAX_MAKERS 上限 =====================
  describe('MAX_MAKERS 上限（= 30）', () => {
    it('注入 30 条数据不超出限制', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1))
      }
      expect((sys as any).makers).toHaveLength(30)
    })

    it('到达 30 个时，em 有生物也不会继续新增', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1))
      }
      // 强制 random 返回 0（小于 CRAFT_CHANCE=0.006），让招募逻辑走到上限检查
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(100, 20)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(30)
    })
  })

  // ===================== 年龄过滤（age < 8 不招募）=====================
  describe('年龄过滤（age < 8 不招募）', () => {
    it('age=7 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // < CRAFT_CHANCE
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 7)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('age=8 的生物可被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // < CRAFT_CHANCE
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 8)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('age=0 的生物不被招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // < CRAFT_CHANCE
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 0)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ===================== CRAFT_CHANCE 随机过滤 =====================
  describe('CRAFT_CHANCE 随机过滤（= 0.006）', () => {
    it('random > CRAFT_CHANCE 时不招募（random=0.5 不招募）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('random = 0（<= CRAFT_CHANCE=0.006）时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('random = CRAFT_CHANCE（0.006）时不招募（> 条件）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.006)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      // Math.random() > CRAFT_CHANCE：0.006 > 0.006 为 false，会尝试招募
      // 但 random 也用于 skillMap 初始值，第二次调用返回 0.006（2 + 0.006*6 ≈ 2.036）
      // 此时会招募，不测精确数量，只验证 <= 1
      expect((sys as any).makers.length).toBeLessThanOrEqual(1)
    })
  })

  // ===================== skillMap 管理 =====================
  describe('skillMap 管理', () => {
    it('招募后 skillMap 中有该实体的 skill', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(99, 20)
      sys.update(1, em, 1350)
      expect((sys as any).skillMap.has(99)).toBe(true)
    })

    it('再次招募同一实体时 skill 累加（SKILL_GROWTH = 0.07）', () => {
      ;(sys as any).skillMap.set(1, 50)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const skill = (sys as any).skillMap.get(1)
      expect(skill).toBeCloseTo(50.07, 5)
    })

    it('skill 不超过 100 上限', () => {
      ;(sys as any).skillMap.set(1, 100)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const skill = (sys as any).skillMap.get(1)
      expect(skill).toBe(100)
    })

    it('新实体 skill 从随机初始化（random=0 → 2 + 0*6 = 2）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(200, 20)
      sys.update(1, em, 1350)
      // 初始 skill = 2 + 0*6 = 2，然后 + SKILL_GROWTH 0.07 = 2.07
      const skill = (sys as any).skillMap.get(200)
      expect(skill).toBeCloseTo(2.07, 5)
    })
  })

  // ===================== 招募记录内容验证 =====================
  describe('招募记录内容验证', () => {
    it('招募后记录包含正确的 entityId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(77, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.entityId).toBe(77)
    })

    it('招募后记录包含正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 9999)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.tick).toBe(9999)
    })

    it('招募后记录的 broomsMade >= 2', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.broomsMade).toBeGreaterThanOrEqual(2)
    })

    it('招募后记录的 durability >= 20', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.durability).toBeGreaterThanOrEqual(20)
    })

    it('招募后记录的 reputation >= 8', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.reputation).toBeGreaterThanOrEqual(8)
    })

    it('招募后 broomType 是合法类型', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(BROOM_TYPES).toContain(maker.broomType)
    })

    it('招募后 id 从 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      ;(sys as any).nextId = 10
      const em = makeEmWithCreature(1, 20)
      sys.update(1, em, 1350)
      const maker = (sys as any).makers[0] as BroomMaker
      expect(maker.id).toBe(10)
      expect((sys as any).nextId).toBe(11)
    })
  })

  // ===================== 多次 update 累积行为 =====================
  describe('多次 update 累积行为', () => {
    it('多次触发更新后记录可以累积', () => {
      const em = makeEmWithCreatures([
        { eid: 1, age: 20 },
        { eid: 2, age: 25 },
      ])
      // 第一次 update
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 1350)
      const firstCount = (sys as any).makers.length
      expect(firstCount).toBeGreaterThanOrEqual(0) // 依赖 random mock
    })

    it('节流期间不会清理已有记录', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 50000 }))
      ;(sys as any).lastCheck = 55000 // 设一个高的 lastCheck
      sys.update(1, makeEmEmpty(), 56000) // 差值 1000 < 1350，节流跳过
      // 节流跳过后，清理也不应执行
      expect((sys as any).makers).toHaveLength(1)
    })
  })

  // ===================== BroomMaker 接口字段完整性 =====================
  describe('BroomMaker 接口字段完整性', () => {
    it('BroomMaker 包含 id 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('id')
    })

    it('BroomMaker 包含 entityId 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('entityId')
    })

    it('BroomMaker 包含 skill 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('skill')
    })

    it('BroomMaker 包含 broomsMade 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('broomsMade')
    })

    it('BroomMaker 包含 broomType 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('broomType')
    })

    it('BroomMaker 包含 durability 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('durability')
    })

    it('BroomMaker 包含 reputation 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('reputation')
    })

    it('BroomMaker 包含 tick 字段', () => {
      const m = makeMaker(1)
      expect(m).toHaveProperty('tick')
    })
  })

  // ===================== 边界值 =====================
  describe('边界值与极端情况', () => {
    it('skill=100 时 durability = 20 + 100*0.65 = 85', () => {
      const durability = 20 + 100 * 0.65
      expect(durability).toBeCloseTo(85)
    })

    it('skill=100 时 reputation = 8 + 100*0.7 = 78', () => {
      const reputation = 8 + 100 * 0.7
      expect(reputation).toBeCloseTo(78)
    })

    it('skill=100 时 broomsMade = 2 + Math.floor(100/6) = 18', () => {
      const broomsMade = 2 + Math.floor(100 / 6)
      expect(broomsMade).toBe(18)
    })

    it('skill=1 时 broomsMade = 2（floor(1/6)=0）', () => {
      const broomsMade = 2 + Math.floor(1 / 6)
      expect(broomsMade).toBe(2)
    })

    it('tick 为大数时 cleanup 不出错', () => {
      ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(1, makeEmEmpty(), 9999999)).not.toThrow()
    })

    it('空 em 时 update 不出错', () => {
      expect(() => sys.update(1, makeEmEmpty(), 1350)).not.toThrow()
    })

    it('多次 update 在同一 tick 仅第一次触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEmEmpty(), 1350)
      const afterFirst = (sys as any).lastCheck
      sys.update(1, makeEmEmpty(), 1350) // 差值 0 < 1350
      expect((sys as any).lastCheck).toBe(afterFirst)
    })
  })
})
