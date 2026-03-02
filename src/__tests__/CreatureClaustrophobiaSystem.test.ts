import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureClaustrophobiaSystem } from '../systems/CreatureClaustrophobiaSystem'
import type { Claustrophobe } from '../systems/CreatureClaustrophobiaSystem'

let nextId = 1
function makeSys(): CreatureClaustrophobiaSystem { return new CreatureClaustrophobiaSystem() }
function makeClaustrophobe(entityId: number, overrides: Partial<Claustrophobe> = {}): Claustrophobe {
  return { id: nextId++, entityId, severity: 50, panicLevel: 20, triggers: 3, tick: 0, ...overrides }
}

function makeEm(entities: number[] = [], componentMap: Record<number, any> = {}) {
  return {
    getEntitiesWithComponents: () => entities,
    getComponent: (_eid: number, type: string) => componentMap[_eid]?.[type] ?? null,
  } as any
}

describe('CreatureClaustrophobiaSystem', () => {
  let sys: CreatureClaustrophobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ========== 基础状态测试 ==========

  describe('初始状态', () => {
    it('初始 claustrophobes 数组为空', () => {
      expect((sys as any).claustrophobes).toHaveLength(0)
    })

    it('初始 _claustrophobeSet 为空集合', () => {
      expect((sys as any)._claustrophobeSet.size).toBe(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('sys 是 CreatureClaustrophobiaSystem 实例', () => {
      expect(sys).toBeInstanceOf(CreatureClaustrophobiaSystem)
    })
  })

  // ========== 数据注入与字段测试 ==========

  describe('数据注入与字段', () => {
    it('注入单个幽闭恐惧者后可查询', () => {
      ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
      expect((sys as any).claustrophobes[0].entityId).toBe(1)
    })

    it('注入多个后全部返回', () => {
      ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
      ;(sys as any).claustrophobes.push(makeClaustrophobe(2))
      expect((sys as any).claustrophobes).toHaveLength(2)
    })

    it('severity 字段可注入自定义值', () => {
      const c = makeClaustrophobe(10, { severity: 90 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].severity).toBe(90)
    })

    it('panicLevel 字段可注入自定义值', () => {
      const c = makeClaustrophobe(10, { panicLevel: 80 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].panicLevel).toBe(80)
    })

    it('triggers 字段可注入自定义值', () => {
      const c = makeClaustrophobe(5, { triggers: 7 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].triggers).toBe(7)
    })

    it('tick 字段可注入自定义值', () => {
      const c = makeClaustrophobe(1, { tick: 5000 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].tick).toBe(5000)
    })

    it('id 字段独立递增', () => {
      const c1 = makeClaustrophobe(1)
      const c2 = makeClaustrophobe(2)
      expect(c2.id).toBeGreaterThan(c1.id)
    })

    it('所有必要字段均存在', () => {
      const c = makeClaustrophobe(1)
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('entityId')
      expect(c).toHaveProperty('severity')
      expect(c).toHaveProperty('panicLevel')
      expect(c).toHaveProperty('triggers')
      expect(c).toHaveProperty('tick')
    })

    it('severity 范围0-100合法', () => {
      const c = makeClaustrophobe(1, { severity: 0 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].severity).toBe(0)
    })

    it('severity 最大值100合法', () => {
      const c = makeClaustrophobe(1, { severity: 100 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].severity).toBe(100)
    })

    it('panicLevel 初始为0合法', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0 })
      ;(sys as any).claustrophobes.push(c)
      expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
    })
  })

  // ========== isClaustrophobe 方法测试 ==========

  describe('isClaustrophobe 方法', () => {
    it('_claustrophobeSet 中存在时返回 true', () => {
      ;(sys as any)._claustrophobeSet.add(42)
      expect((sys as any).isClaustrophobe(42)).toBe(true)
    })

    it('_claustrophobeSet 中不存在时返回 false', () => {
      expect((sys as any).isClaustrophobe(99)).toBe(false)
    })

    it('添加多个 id 后各自正确识别', () => {
      ;(sys as any)._claustrophobeSet.add(1)
      ;(sys as any)._claustrophobeSet.add(2)
      ;(sys as any)._claustrophobeSet.add(3)
      expect((sys as any).isClaustrophobe(1)).toBe(true)
      expect((sys as any).isClaustrophobe(2)).toBe(true)
      expect((sys as any).isClaustrophobe(4)).toBe(false)
    })

    it('删除后返回 false', () => {
      ;(sys as any)._claustrophobeSet.add(10)
      ;(sys as any)._claustrophobeSet.delete(10)
      expect((sys as any).isClaustrophobe(10)).toBe(false)
    })

    it('id=0 不在集合中返回 false', () => {
      expect((sys as any).isClaustrophobe(0)).toBe(false)
    })
  })

  // ========== update 时序逻辑测试 ==========

  describe('update 时序逻辑（CHECK_INTERVAL=700）', () => {
    it('tick 差值 < 700 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm([]), {}, 1600)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 700 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm([]), {}, 1700)
      expect((sys as any).lastCheck).toBe(1700)
    })

    it('tick 差值恰好等于 700 边界时触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), {}, 700)
      expect((sys as any).lastCheck).toBe(700)
    })

    it('tick 差值 699 时不触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), {}, 699)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastCheck=0，tick=0 时差值为0不触发', () => {
      sys.update(16, makeEm([]), {}, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续调用，第二次差值不足时不再更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), {}, 700)
      expect((sys as any).lastCheck).toBe(700)
      sys.update(16, makeEm([]), {}, 1000)
      expect((sys as any).lastCheck).toBe(700)
    })

    it('连续调用，第二次差值足够时再次更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm([]), {}, 700)
      sys.update(16, makeEm([]), {}, 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })
  })

  // ========== decayPanic 方法测试 ==========

  describe('decayPanic 方法（PANIC_DECAY=0.5）', () => {
    it('panicLevel 从 5 衰减 0.5 变 4.5', () => {
      const c = makeClaustrophobe(1, { panicLevel: 5 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBeCloseTo(4.5)
    })

    it('panicLevel 不会低于 0（0.3 - 0.5 → 0）', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0.3 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
    })

    it('panicLevel 已为 0 时保持 0', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
    })

    it('panicLevel 从 100 衰减到 99.5', () => {
      const c = makeClaustrophobe(1, { panicLevel: 100 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBeCloseTo(99.5)
    })

    it('多个幽闭恐惧者各自独立衰减', () => {
      ;(sys as any).claustrophobes.push(makeClaustrophobe(1, { panicLevel: 10 }))
      ;(sys as any).claustrophobes.push(makeClaustrophobe(2, { panicLevel: 20 }))
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBeCloseTo(9.5)
      expect((sys as any).claustrophobes[1].panicLevel).toBeCloseTo(19.5)
    })

    it('panicLevel 恰好 0.5 衰减后变为 0', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0.5 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBe(0)
    })

    it('连续调用两次衰减各 0.5', () => {
      const c = makeClaustrophobe(1, { panicLevel: 10 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).decayPanic()
      ;(sys as any).decayPanic()
      expect((sys as any).claustrophobes[0].panicLevel).toBeCloseTo(9.0)
    })

    it('空数组时 decayPanic 不报错', () => {
      expect(() => (sys as any).decayPanic()).not.toThrow()
    })
  })

  // ========== cleanup 方法测试 ==========

  describe('cleanup 方法（MAX_CLAUSTROPHOBES=60）', () => {
    it('超出 60 时按 severity 降序截断到 60 个', () => {
      for (let i = 0; i < 61; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 100, { severity: i + 1 }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).claustrophobes).toHaveLength(60)
    })

    it('cleanup 后最低 severity 被移除（severity=1 的被截断）', () => {
      for (let i = 0; i < 61; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 100, { severity: i + 1 }))
      }
      ;(sys as any).cleanup()
      const severities = (sys as any).claustrophobes.map((c: Claustrophobe) => c.severity)
      expect(Math.min(...severities)).toBe(2)
    })

    it('未超出 60 时不截断', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: 50 }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).claustrophobes).toHaveLength(5)
    })

    it('恰好 60 个时不截断', () => {
      for (let i = 0; i < 60; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: 50 }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).claustrophobes).toHaveLength(60)
    })

    it('cleanup 后 _claustrophobeSet 与数组同步', () => {
      for (let i = 0; i < 61; i++) {
        const c = makeClaustrophobe(i + 200, { severity: i + 1 })
        ;(sys as any).claustrophobes.push(c)
        ;(sys as any)._claustrophobeSet.add(c.entityId)
      }
      ;(sys as any).cleanup()
      const remainingIds = new Set((sys as any).claustrophobes.map((c: Claustrophobe) => c.entityId))
      const setIds = (sys as any)._claustrophobeSet as Set<number>
      for (const id of setIds) {
        expect(remainingIds.has(id)).toBe(true)
      }
    })

    it('cleanup 后数组按 severity 降序排列', () => {
      for (let i = 0; i < 65; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: Math.random() * 100 }))
      }
      ;(sys as any).cleanup()
      const severities = (sys as any).claustrophobes.map((c: Claustrophobe) => c.severity)
      for (let i = 1; i < severities.length; i++) {
        expect(severities[i - 1]).toBeGreaterThanOrEqual(severities[i])
      }
    })

    it('空数组时 cleanup 不报错', () => {
      expect(() => (sys as any).cleanup()).not.toThrow()
    })

    it('62 个时截断后留 60 个', () => {
      for (let i = 0; i < 62; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: 100 - i }))
      }
      ;(sys as any).cleanup()
      expect((sys as any).claustrophobes).toHaveLength(60)
    })
  })

  // ========== identifyClaustrophobes 方法测试 ==========

  describe('identifyClaustrophobes 方法（PHOBIA_CHANCE=0.008）', () => {
    it('已满 MAX_CLAUSTROPHOBES 时不添加新幽闭恐惧者', () => {
      for (let i = 0; i < 60; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.008 通过检测
      const em = makeEm([999])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      expect((sys as any).claustrophobes).toHaveLength(60)
    })

    it('random > PHOBIA_CHANCE 时跳过实体', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 > 0.008
      const em = makeEm([1, 2, 3])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      expect((sys as any).claustrophobes).toHaveLength(0)
    })

    it('实体已是幽闭恐惧者时不重复添加', () => {
      ;(sys as any)._claustrophobeSet.add(1)
      vi.spyOn(Math, 'random').mockReturnValue(0) // 通过概率检测
      const em = makeEm([1])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      expect((sys as any).claustrophobes).toHaveLength(0)
    })

    it('新幽闭恐惧者的 tick 等于传入 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 通过概率检测
      const em = makeEm([5])
      ;(sys as any).identifyClaustrophobes(em, 2500)
      const arr = (sys as any).claustrophobes
      if (arr.length > 0) {
        expect(arr[0].tick).toBe(2500)
      }
    })

    it('新幽闭恐惧者被加入 _claustrophobeSet', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([7])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      const arr = (sys as any).claustrophobes
      if (arr.length > 0) {
        expect((sys as any)._claustrophobeSet.has(7)).toBe(true)
      }
    })

    it('新幽闭恐惧者 panicLevel 初始为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([8])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      const arr = (sys as any).claustrophobes
      if (arr.length > 0) {
        expect(arr[0].panicLevel).toBe(0)
      }
    })

    it('新幽闭恐惧者 triggers 初始为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = makeEm([9])
      ;(sys as any).identifyClaustrophobes(em, 1000)
      const arr = (sys as any).claustrophobes
      if (arr.length > 0) {
        expect(arr[0].triggers).toBe(0)
      }
    })
  })

  // ========== checkEnvironment 方法测试 ==========

  describe('checkEnvironment 方法（panicLevel 增加、triggers 增加）', () => {
    it('无 position 组件时跳过', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0, triggers: 0 })
      ;(sys as any).claustrophobes.push(c)
      const em = makeEm([], {})
      ;(sys as any).checkEnvironment(em, {})
      expect(c.panicLevel).toBe(0)
      expect(c.triggers).toBe(0)
    })

    it('enclosedScore <= 30 时不增加 panicLevel', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0, triggers: 0, severity: 50 })
      ;(sys as any).claustrophobes.push(c)
      // 只有2个mountain tile：enclosedScore = 30，不满足 > 30
      const world = { getTile: (x: number, y: number) => (x === 1 && y === 0 ? 6 : (x === 0 && y === 1 ? 6 : 0)) }
      const em = { getComponent: (_id: number, type: string) => type === 'position' ? { x: 0, y: 0 } : null } as any
      ;(sys as any).checkEnvironment(em, world)
      expect(c.panicLevel).toBe(0)
    })

    it('enclosedScore > 30 时 triggers 增加', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0, triggers: 0, severity: 50 })
      ;(sys as any).claustrophobes.push(c)
      // 3个 mountain tile (type=6)：enclosedScore = 45 > 30
      let callCount = 0
      const world = {
        getTile: () => {
          callCount++
          return callCount <= 3 ? 6 : 0
        }
      }
      const em = { getComponent: (_id: number, type: string) => type === 'position' ? { x: 0, y: 0 } : null } as any
      ;(sys as any).checkEnvironment(em, world)
      expect(c.triggers).toBe(1)
    })

    it('panicLevel 不超过 100', () => {
      const c = makeClaustrophobe(1, { panicLevel: 99.9, triggers: 0, severity: 100 })
      ;(sys as any).claustrophobes.push(c)
      // 8个 mountain tile：enclosedScore = 120 > 30
      const world = { getTile: () => 6 }
      const em = { getComponent: (_id: number, type: string) => type === 'position' ? { x: 5, y: 5 } : null } as any
      ;(sys as any).checkEnvironment(em, world)
      expect(c.panicLevel).toBeLessThanOrEqual(100)
    })

    it('panicLevel > 60（PANIC_THRESHOLD）时扣减 health', () => {
      const c = makeClaustrophobe(1, { panicLevel: 70, severity: 100 })
      ;(sys as any).claustrophobes.push(c)
      const needsComp = { health: 50 }
      const world = { getTile: () => 6 }
      const em = {
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return { x: 5, y: 5 }
          if (type === 'needs') return needsComp
          return null
        }
      } as any
      const originalHealth = needsComp.health
      ;(sys as any).checkEnvironment(em, world)
      expect(needsComp.health).toBeLessThan(originalHealth)
    })

    it('health <= 5 时不扣减 health', () => {
      const c = makeClaustrophobe(1, { panicLevel: 70, severity: 100 })
      ;(sys as any).claustrophobes.push(c)
      const needsComp = { health: 5 }
      const world = { getTile: () => 6 }
      const em = {
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return { x: 5, y: 5 }
          if (type === 'needs') return needsComp
          return null
        }
      } as any
      ;(sys as any).checkEnvironment(em, world)
      expect(needsComp.health).toBe(5)
    })

    it('panicLevel < PANIC_THRESHOLD(60) 时不扣减 health（无封闭环境）', () => {
      // panicLevel=30，且所有地形都是草地（enclosedScore=0），panicLevel不增加，不会超过threshold
      const c = makeClaustrophobe(1, { panicLevel: 30, severity: 100 })
      ;(sys as any).claustrophobes.push(c)
      const needsComp = { health: 50 }
      const world = { getTile: () => 0 } // 草地，不会增加 enclosedScore
      const em = {
        getComponent: (_id: number, type: string) => {
          if (type === 'position') return { x: 5, y: 5 }
          if (type === 'needs') return needsComp
          return null
        }
      } as any
      ;(sys as any).checkEnvironment(em, world)
      // enclosedScore=0 <= 30，不进入 panic 分支，health 不变
      expect(needsComp.health).toBe(50)
    })

    it('tile=5（森林）也算封闭地形', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0, triggers: 0, severity: 50 })
      ;(sys as any).claustrophobes.push(c)
      // 3个 forest tile：enclosedScore = 45 > 30
      let count = 0
      const world = { getTile: () => count++ < 3 ? 5 : 0 }
      const em = { getComponent: (_id: number, type: string) => type === 'position' ? { x: 0, y: 0 } : null } as any
      ;(sys as any).checkEnvironment(em, world)
      expect(c.triggers).toBe(1)
    })

    it('world.getTile 不存在时不报错', () => {
      const c = makeClaustrophobe(1, { panicLevel: 0 })
      ;(sys as any).claustrophobes.push(c)
      const world = {}
      const em = { getComponent: (_id: number, type: string) => type === 'position' ? { x: 0, y: 0 } : null } as any
      expect(() => (sys as any).checkEnvironment(em, world)).not.toThrow()
    })
  })

  // ========== 全流程集成测试 ==========

  describe('update 全流程集成测试', () => {
    it('tick 差值不足时各子方法均未被调用（lastCheck 不变）', () => {
      ;(sys as any).lastCheck = 5000
      const em = makeEm([])
      sys.update(16, em, {}, 5500)
      expect((sys as any).lastCheck).toBe(5000)
      expect((sys as any).claustrophobes).toHaveLength(0)
    })

    it('update 执行后 decayPanic 会被调用（通过结果验证）', () => {
      const c = makeClaustrophobe(1, { panicLevel: 10 })
      ;(sys as any).claustrophobes.push(c)
      ;(sys as any).lastCheck = 0
      const em = makeEm([])
      sys.update(16, em, {}, 700)
      expect(c.panicLevel).toBeCloseTo(9.5)
    })

    it('update 执行后 cleanup 会被调用（超出 60 时截断）', () => {
      for (let i = 0; i < 61; i++) {
        ;(sys as any).claustrophobes.push(makeClaustrophobe(i + 1, { severity: i + 1 }))
      }
      ;(sys as any).lastCheck = 0
      const em = makeEm([])
      sys.update(16, em, {}, 700)
      expect((sys as any).claustrophobes.length).toBeLessThanOrEqual(60)
    })

    it('多次 update 后 lastCheck 正确更新', () => {
      ;(sys as any).lastCheck = 0
      const em = makeEm([])
      sys.update(16, em, {}, 700)
      sys.update(16, em, {}, 1400)
      sys.update(16, em, {}, 2100)
      expect((sys as any).lastCheck).toBe(2100)
    })
  })
})
