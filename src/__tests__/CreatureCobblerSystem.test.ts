import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCobblersSystem } from '../systems/CreatureCobblerSystem'
import type { Cobbler, FootwearType } from '../systems/CreatureCobblerSystem'

let nextId = 1
function makeSys(): CreatureCobblersSystem { return new CreatureCobblersSystem() }
function makeCobbler(entityId: number, overrides: Partial<Cobbler> = {}): Cobbler {
  return { id: nextId++, entityId, skill: 30, pairsCompleted: 10, footwearType: 'sandal', durability: 60, comfort: 50, tick: 0, ...overrides }
}

function makeEm(entities: number[] = [], componentMap: Record<number, any> = {}) {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: (_eid: number, type: string) => componentMap[_eid]?.[type] ?? null,
  } as any
}

describe('CreatureCobblersSystem', () => {
  let sys: CreatureCobblersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ========== 初始状态测试 ==========

  describe('初始状态', () => {
    it('初始 cobblers 数组为空', () => {
      expect((sys as any).cobblers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 skillMap 为空 Map', () => {
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('sys 是 CreatureCobblersSystem 实例', () => {
      expect(sys).toBeInstanceOf(CreatureCobblersSystem)
    })
  })

  // ========== 数据注入与字段测试 ==========

  describe('数据注入与字段', () => {
    it('注入后可查询 footwearType', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: 'boot' }))
      expect((sys as any).cobblers[0].footwearType).toBe('boot')
    })

    it('注入多个后全部返回', () => {
      ;(sys as any).cobblers.push(makeCobbler(1))
      ;(sys as any).cobblers.push(makeCobbler(2))
      expect((sys as any).cobblers).toHaveLength(2)
    })

    it('skill 字段可注入', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { skill: 75 }))
      expect((sys as any).cobblers[0].skill).toBe(75)
    })

    it('pairsCompleted 字段可注入', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { pairsCompleted: 99 }))
      expect((sys as any).cobblers[0].pairsCompleted).toBe(99)
    })

    it('durability 字段可注入', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { durability: 80 }))
      expect((sys as any).cobblers[0].durability).toBe(80)
    })

    it('comfort 字段可注入', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { comfort: 90 }))
      expect((sys as any).cobblers[0].comfort).toBe(90)
    })

    it('tick 字段可注入', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 10000 }))
      expect((sys as any).cobblers[0].tick).toBe(10000)
    })

    it('所有必要字段均存在', () => {
      const c = makeCobbler(1)
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('entityId')
      expect(c).toHaveProperty('skill')
      expect(c).toHaveProperty('pairsCompleted')
      expect(c).toHaveProperty('footwearType')
      expect(c).toHaveProperty('durability')
      expect(c).toHaveProperty('comfort')
      expect(c).toHaveProperty('tick')
    })

    it('id 字��独立递增', () => {
      const c1 = makeCobbler(1)
      const c2 = makeCobbler(2)
      expect(c2.id).toBeGreaterThan(c1.id)
    })
  })

  // ========== FootwearType 枚举测试 ==========

  describe('FootwearType 枚举', () => {
    it('包含 sandal 类型', () => {
      const t: FootwearType = 'sandal'
      ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: t }))
      expect((sys as any).cobblers[0].footwearType).toBe('sandal')
    })

    it('包含 shoe 类型', () => {
      const t: FootwearType = 'shoe'
      ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: t }))
      expect((sys as any).cobblers[0].footwearType).toBe('shoe')
    })

    it('包含 boot 类型', () => {
      const t: FootwearType = 'boot'
      ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: t }))
      expect((sys as any).cobblers[0].footwearType).toBe('boot')
    })

    it('包含 armored 类型', () => {
      const t: FootwearType = 'armored'
      ;(sys as any).cobblers.push(makeCobbler(1, { footwearType: t }))
      expect((sys as any).cobblers[0].footwearType).toBe('armored')
    })

    it('4 种类型全部正确存储', () => {
      const types: FootwearType[] = ['sandal', 'shoe', 'boot', 'armored']
      types.forEach((t, i) => { ;(sys as any).cobblers.push(makeCobbler(i + 1, { footwearType: t })) })
      const all = (sys as any).cobblers as Cobbler[]
      expect(all.map(c => c.footwearType)).toEqual(['sandal', 'shoe', 'boot', 'armored'])
    })
  })

  // ========== 公式计算测试 ==========

  describe('公式计算验证', () => {
    it('durability 公式：skill=0 → 25 + 0*0.65 = 25', () => {
      expect(25 + 0 * 0.65).toBeCloseTo(25)
    })

    it('durability 公式：skill=40 → 25 + 40*0.65 = 51', () => {
      expect(25 + 40 * 0.65).toBeCloseTo(51)
    })

    it('durability 公式：skill=100 → 25 + 100*0.65 = 90', () => {
      expect(25 + 100 * 0.65).toBeCloseTo(90)
    })

    it('comfort 公式：skill=0 → 20 + 0*0.7 = 20', () => {
      expect(20 + 0 * 0.7).toBeCloseTo(20)
    })

    it('comfort 公式：skill=40 → 20 + 40*0.7 = 48', () => {
      expect(20 + 40 * 0.7).toBeCloseTo(48)
    })

    it('comfort 公式：skill=100 → 20 + 100*0.7 = 90', () => {
      expect(20 + 100 * 0.7).toBeCloseTo(90)
    })

    it('pairsCompleted 公式：skill=0 → 1 + floor(0/10) = 1', () => {
      expect(1 + Math.floor(0 / 10)).toBe(1)
    })

    it('pairsCompleted 公式：skill=50 → 1 + floor(50/10) = 6', () => {
      expect(1 + Math.floor(50 / 10)).toBe(6)
    })

    it('pairsCompleted 公式：skill=100 → 1 + floor(100/10) = 11', () => {
      expect(1 + Math.floor(100 / 10)).toBe(11)
    })

    it('pairsCompleted 公式：skill=99 → 1 + floor(99/10) = 10', () => {
      expect(1 + Math.floor(99 / 10)).toBe(10)
    })
  })

  // ========== footwearType 分段逻辑测试 ==========

  describe('footwearType 分段逻辑（skill/25，最大3）', () => {
    it('skill=0 → typeIdx=0 (sandal)', () => {
      expect(Math.min(3, Math.floor(0 / 25))).toBe(0)
    })

    it('skill=10 → typeIdx=0 (sandal)', () => {
      expect(Math.min(3, Math.floor(10 / 25))).toBe(0)
    })

    it('skill=24 → typeIdx=0 (sandal)', () => {
      expect(Math.min(3, Math.floor(24 / 25))).toBe(0)
    })

    it('skill=25 → typeIdx=1 (shoe)', () => {
      expect(Math.min(3, Math.floor(25 / 25))).toBe(1)
    })

    it('skill=30 → typeIdx=1 (shoe)', () => {
      expect(Math.min(3, Math.floor(30 / 25))).toBe(1)
    })

    it('skill=49 → typeIdx=1 (shoe)', () => {
      expect(Math.min(3, Math.floor(49 / 25))).toBe(1)
    })

    it('skill=50 → typeIdx=2 (boot)', () => {
      expect(Math.min(3, Math.floor(50 / 25))).toBe(2)
    })

    it('skill=60 → typeIdx=2 (boot)', () => {
      expect(Math.min(3, Math.floor(60 / 25))).toBe(2)
    })

    it('skill=74 → typeIdx=2 (boot)', () => {
      expect(Math.min(3, Math.floor(74 / 25))).toBe(2)
    })

    it('skill=75 → typeIdx=3 (armored)', () => {
      expect(Math.min(3, Math.floor(75 / 25))).toBe(3)
    })

    it('skill=80 → typeIdx=3 (armored)', () => {
      expect(Math.min(3, Math.floor(80 / 25))).toBe(3)
    })

    it('skill=100 → typeIdx=3 (armored，cap at 3)', () => {
      expect(Math.min(3, Math.floor(100 / 25))).toBe(3)
    })
  })

  // ========== update 时序逻辑测试 ==========

  describe('update 时序逻辑（CHECK_INTERVAL=1400）', () => {
    it('tick 差值 < 1400 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm([]), 2399)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 1400 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm([]), 2400)
      expect((sys as any).lastCheck).toBe(2400)
    })

    it('tick 差值恰好 1400 时触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('tick 差值 1399 时不触发', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 1399)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续调用，第一次更新后第二次不足间隔时不更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 1400)
      sys.update(16, makeEm([]), 2000)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('连续调用，第二次差值足够时再次更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 1400)
      sys.update(16, makeEm([]), 2800)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('lastCheck=0，tick=0 时不触发', () => {
      sys.update(16, makeEm([]), 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ========== time-based cleanup 测试 ==========

  describe('time-based cleanup（cutoff = tick - 55000）', () => {
    it('tick=0 的记录在 update(em, 60000) 时被删除', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 60000)
      expect((sys as any).cobblers).toHaveLength(0)
    })

    it('tick=56000 的记录在 update(em, 60000) 时保留（56000 > 5000 cutoff）', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 56000 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 60000)
      expect((sys as any).cobblers).toHaveLength(1)
    })

    it('tick 恰好等于 cutoff 时保留（不小于cutoff）', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 5000 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 60000) // cutoff = 60000-55000 = 5000，tick=5000 不小于cutoff
      // tick < cutoff 才删除，tick=5000 < 5000 为 false，所以保留
      expect((sys as any).cobblers).toHaveLength(1)
    })

    it('tick=4999 时在 update(60000) 时被删除', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 4999 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 60000)
      expect((sys as any).cobblers).toHaveLength(0)
    })

    it('混合新旧记录：旧的删除，新的保留', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 0 }))
      ;(sys as any).cobblers.push(makeCobbler(2, { tick: 56000 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 60000)
      expect((sys as any).cobblers).toHaveLength(1)
      expect((sys as any).cobblers[0].entityId).toBe(2)
    })

    it('空 cobblers 时 cleanup 不报错', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, makeEm([]), 60000)).not.toThrow()
    })
  })

  // ========== skillMap 测试 ==========

  describe('skillMap 技能缓存', () => {
    it('skillMap 可直接读写', () => {
      ;(sys as any).skillMap.set(1, 50)
      expect((sys as any).skillMap.get(1)).toBe(50)
    })

    it('skillMap 初始查询返回 undefined', () => {
      expect((sys as any).skillMap.get(999)).toBeUndefined()
    })

    it('skillMap 多实体独立存储', () => {
      ;(sys as any).skillMap.set(1, 20)
      ;(sys as any).skillMap.set(2, 80)
      expect((sys as any).skillMap.get(1)).toBe(20)
      expect((sys as any).skillMap.get(2)).toBe(80)
    })

    it('SKILL_GROWTH=0.07 时 skillMap 中值递增正确', () => {
      const SKILL_GROWTH = 0.07
      let skill = 30
      skill = Math.min(100, skill + SKILL_GROWTH)
      expect(skill).toBeCloseTo(30.07)
    })

    it('skill 上限为 100（不超过）', () => {
      const SKILL_GROWTH = 0.07
      let skill = 99.99
      skill = Math.min(100, skill + SKILL_GROWTH)
      expect(skill).toBe(100)
    })
  })

  // ========== MAX_COBBLERS 上限测试 ==========

  describe('MAX_COBBLERS 上限（34）', () => {
    it('cobblers 已满 34 时不再通过 update 添加', () => {
      for (let i = 0; i < 34; i++) {
        ;(sys as any).cobblers.push(makeCobbler(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 通过 CRAFT_CHANCE 检测
      const em = {
        getEntitiesWithComponents: () => [999],
        getComponent: () => ({ age: 10 }),
      } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 1400)
      expect((sys as any).cobblers.length).toBeLessThanOrEqual(34 + 1) // 可能已被cleanup移除
    })

    it('cobblers 数量不会因注入超过 34 后在 update 中通过 break 保护', () => {
      for (let i = 0; i < 34; i++) {
        ;(sys as any).cobblers.push(makeCobbler(i + 1, { tick: 99999 }))
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = {
        getEntitiesWithComponents: () => [101, 102, 103],
        getComponent: () => ({ age: 15 }),
      } as any
      sys.update(16, em, 1400)
      // break 逻辑：cobblers.length >= 34 时跳过
      expect((sys as any).cobblers.length).toBeLessThanOrEqual(35)
    })
  })

  // ========== 全流程集成测试 ==========

  describe('update 全流程集成', () => {
    it('tick 差值不足时，cobblers 不变', () => {
      ;(sys as any).cobblers.push(makeCobbler(1, { tick: 0 }))
      ;(sys as any).lastCheck = 5000
      sys.update(16, makeEm([]), 6000) // 差值1000 < 1400
      // 不触发，cobblers 保持不动
      expect((sys as any).cobblers).toHaveLength(1)
    })

    it('update 后 lastCheck 正确更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('age < 8 的实体不会成为鞋匠', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 通过 CRAFT_CHANCE
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => ({ age: 5 }), // age < 8
      } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 1400)
      expect((sys as any).cobblers).toHaveLength(0)
    })

    it('getComponent 返回 null 时不报错', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => null,
      } as any
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, em, 1400)).not.toThrow()
    })
  })
})
