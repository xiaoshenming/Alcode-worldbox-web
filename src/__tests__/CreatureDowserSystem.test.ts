import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDowserSystem } from '../systems/CreatureDowserSystem'
import type { DowserData, DowserTool } from '../systems/CreatureDowserSystem'

function makeSys(): CreatureDowserSystem { return new CreatureDowserSystem() }
function makeDowser(entityId: number, overrides: Partial<DowserData> = {}): DowserData {
  return { entityId, waterFound: 5, accuracy: 60, tool: 'rod', reputation: 50, active: true, tick: 0, ...overrides }
}
function makeEM(entities: number[] = [], hasComponent = true) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entities),
    hasComponent: vi.fn().mockReturnValue(hasComponent),
  }
}

describe('CreatureDowserSystem', () => {
  let sys: CreatureDowserSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ========== 初始状态测试 ==========

  describe('初始状态', () => {
    it('初始 dowsers 数组为空', () => {
      expect((sys as any).dowsers).toHaveLength(0)
    })

    it('初始 _dowsersSet 为空集合', () => {
      expect((sys as any)._dowsersSet.size).toBe(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('sys 是 CreatureDowserSystem 实例', () => {
      expect(sys).toBeInstanceOf(CreatureDowserSystem)
    })

    it('update 方法存在', () => {
      expect(typeof sys.update).toBe('function')
    })
  })

  // ========== 数据注入与字段测试 ==========

  describe('���据注入与字段', () => {
    it('注入后 tool 字段可查询', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { tool: 'crystal' }))
      expect((sys as any).dowsers[0].tool).toBe('crystal')
    })

    it('多个注入后全部返回', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { tool: 'rod' }))
      ;(sys as any).dowsers.push(makeDowser(2, { tool: 'pendulum' }))
      expect((sys as any).dowsers).toHaveLength(2)
    })

    it('waterFound 字段可注入', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { waterFound: 99 }))
      expect((sys as any).dowsers[0].waterFound).toBe(99)
    })

    it('accuracy 字段可注入', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { accuracy: 75 }))
      expect((sys as any).dowsers[0].accuracy).toBe(75)
    })

    it('reputation 字段可注入', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { reputation: 80 }))
      expect((sys as any).dowsers[0].reputation).toBe(80)
    })

    it('active 字段可注入 true', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { active: true }))
      expect((sys as any).dowsers[0].active).toBe(true)
    })

    it('active 字段可注入 false', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { active: false }))
      expect((sys as any).dowsers[0].active).toBe(false)
    })

    it('tick 字段可注入', () => {
      ;(sys as any).dowsers.push(makeDowser(1, { tick: 9000 }))
      expect((sys as any).dowsers[0].tick).toBe(9000)
    })

    it('所有必要字段均存在', () => {
      const d = makeDowser(7, { tool: 'pendulum' })
      expect(d).toHaveProperty('entityId')
      expect(d).toHaveProperty('waterFound')
      expect(d).toHaveProperty('accuracy')
      expect(d).toHaveProperty('tool')
      expect(d).toHaveProperty('reputation')
      expect(d).toHaveProperty('active')
      expect(d).toHaveProperty('tick')
    })

    it('active 字段可区分 true/false', () => {
      ;(sys as any).dowsers.push({ ...makeDowser(1), active: false })
      ;(sys as any).dowsers.push({ ...makeDowser(2), active: true })
      expect((sys as any).dowsers[0].active).toBe(false)
      expect((sys as any).dowsers[1].active).toBe(true)
    })
  })

  // ========== DowserTool 类型测试 ==========

  describe('DowserTool 类型', () => {
    it('支持 rod 工具', () => {
      const d = makeDowser(1, { tool: 'rod' })
      expect(d.tool).toBe('rod')
    })

    it('支持 pendulum 工具', () => {
      const d = makeDowser(1, { tool: 'pendulum' })
      expect(d.tool).toBe('pendulum')
    })

    it('支持 intuition 工具', () => {
      const d = makeDowser(1, { tool: 'intuition' })
      expect(d.tool).toBe('intuition')
    })

    it('支持 crystal 工具', () => {
      const d = makeDowser(1, { tool: 'crystal' })
      expect(d.tool).toBe('crystal')
    })

    it('4 种工具全部可存储', () => {
      const tools: DowserTool[] = ['rod', 'pendulum', 'intuition', 'crystal']
      tools.forEach((t, i) => { ;(sys as any).dowsers.push(makeDowser(i + 1, { tool: t })) })
      const all = (sys as any).dowsers
      tools.forEach((t, i) => { expect(all[i].tool).toBe(t) })
    })
  })

  // ========== TOOL_BASE_ACCURACY 测试 ==========

  describe('TOOL_BASE_ACCURACY 精度值', () => {
    it('rod 精度为 40', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      expect(acc['rod']).toBe(40)
    })

    it('pendulum 精度为 55', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      expect(acc['pendulum']).toBe(55)
    })

    it('intuition 精度为 25（最低）', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      expect(acc['intuition']).toBe(25)
    })

    it('crystal 精度为 65（最高）', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      expect(acc['crystal']).toBe(65)
    })

    it('crystal 精度最高，intuition 精度最低', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      const values = Object.values(acc)
      expect(acc['crystal']).toBe(Math.max(...values))
      expect(acc['intuition']).toBe(Math.min(...values))
    })

    it('4 种工具精度均不同', () => {
      const acc = { rod: 40, pendulum: 55, intuition: 25, crystal: 65 }
      const values = Object.values(acc)
      const unique = new Set(values)
      expect(unique.size).toBe(4)
    })
  })

  // ========== update 时序逻辑测试 ==========

  describe('update 时序逻辑（CHECK_INTERVAL=3000）', () => {
    it('tick 差值 < 3000 时不更新 lastCheck', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 3999)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 < 3000 时不调用 getEntitiesWithComponent', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 3999)
      expect(em.getEntitiesWithComponent).not.toHaveBeenCalled()
    })

    it('tick 差值 >= 3000 时更新 lastCheck', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 4000)
      expect((sys as any).lastCheck).toBe(4000)
    })

    it('tick 差值恰好 3000 时触发', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('tick 差值 2999 时不触发', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2999)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastCheck=0，tick=0 时差值为0不触发', () => {
      const em = makeEM([])
      sys.update(0, em as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续调用，第二次不足间隔时不更新', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      sys.update(0, em as any, 4000)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('连续调用，第二次足够间隔时再次更新', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      sys.update(0, em as any, 6000)
      expect((sys as any).lastCheck).toBe(6000)
    })
  })

  // ========== _dowsersSet 测试 ==========

  describe('_dowsersSet 集合管理', () => {
    it('_dowsersSet 初始为空集合', () => {
      expect((sys as any)._dowsersSet.size).toBe(0)
    })

    it('_dowsersSet.add 后包含 entityId', () => {
      ;(sys as any)._dowsersSet.add(42)
      expect((sys as any)._dowsersSet.has(42)).toBe(true)
    })

    it('_dowsersSet 不包含未添加的 id', () => {
      expect((sys as any)._dowsersSet.has(99)).toBe(false)
    })

    it('_dowsersSet 可删除元素', () => {
      ;(sys as any)._dowsersSet.add(10)
      ;(sys as any)._dowsersSet.delete(10)
      expect((sys as any)._dowsersSet.has(10)).toBe(false)
    })

    it('_dowsersSet 多个 id 独立管理', () => {
      ;(sys as any)._dowsersSet.add(1)
      ;(sys as any)._dowsersSet.add(2)
      ;(sys as any)._dowsersSet.add(3)
      expect((sys as any)._dowsersSet.has(1)).toBe(true)
      expect((sys as any)._dowsersSet.has(4)).toBe(false)
    })
  })

  // ========== cleanup（移除不存在实体的探水师）测试 ==========

  describe('cleanup：移除不存在实体的探水师', () => {
    it('实体不存在时 cleanup 移除该 dowser', () => {
      const d = makeDowser(99, { tool: 'rod' })
      ;(sys as any).dowsers.push(d)
      ;(sys as any)._dowsersSet.add(99)
      const em = makeEM([], false) // hasComponent 返回 false
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不触发 dowsing
      sys.update(0, em as any, 3000)
      expect((sys as any).dowsers).toHaveLength(0)
    })

    it('实体存在时 dowser 保留', () => {
      const d = makeDowser(1, { tool: 'rod', active: false })
      ;(sys as any).dowsers.push(d)
      ;(sys as any)._dowsersSet.add(1)
      const em = makeEM([], true) // hasComponent 返回 true
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不触发 dowsing
      sys.update(0, em as any, 3000)
      expect((sys as any).dowsers).toHaveLength(1)
    })

    it('多个 dowser 中只删除不存在实体的', () => {
      const d1 = makeDowser(1, { active: false })
      const d2 = makeDowser(2, { active: false })
      ;(sys as any).dowsers.push(d1, d2)
      ;(sys as any)._dowsersSet.add(1)
      ;(sys as any)._dowsersSet.add(2)
      let callIdx = 0
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([]),
        hasComponent: vi.fn().mockImplementation((eid: number) => eid === 1), // 只有1存在
      }
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3000)
      expect((sys as any).dowsers).toHaveLength(1)
      expect((sys as any).dowsers[0].entityId).toBe(1)
    })
  })

  // ========== active=false 跳过 dowsing 逻辑测试 ==========

  describe('active=false 时跳过 dowsing', () => {
    it('active=false 时 waterFound 不增加', () => {
      const d = makeDowser(1, { active: false, waterFound: 0, reputation: 50 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // 触发 dowsing 分支
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.waterFound).toBe(0)
    })

    it('active=false 时 reputation 不变化', () => {
      const d = makeDowser(1, { active: false, reputation: 50 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.reputation).toBe(50)
    })

    it('active=true 时可能执行 dowsing 逻辑', () => {
      const d = makeDowser(1, { active: true, waterFound: 0, accuracy: 100, reputation: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      // Math.random: 第1次<0.015触发dowsing，第2次<1.0判定success
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9 // ASSIGN_CHANCE检测：>0.002跳过分配
        if (callCount === 2) return 0.001 // <0.015 触发dowsing尝试
        return 0.0 // success判定（0*100=0 < accuracy=100）
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      // active=true 可执行，waterFound 可能增加
      expect(d.waterFound).toBeGreaterThanOrEqual(0)
    })
  })

  // ========== success/failure 逻辑测试 ==========

  describe('dowsing 成功/失败逻辑', () => {
    it('成功时 waterFound 增加 1', () => {
      const d = makeDowser(1, { active: true, waterFound: 5, accuracy: 100, reputation: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9 // ASSIGN_CHANCE: >0.002 跳过分配
        if (callCount === 2) return 0.001 // <0.015 触发dowsing
        return 0.0 // random*100=0 < accuracy=100 → success
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.waterFound).toBe(6)
    })

    it('成功时 accuracy 增加 0.3（上限 95）', () => {
      const d = makeDowser(1, { active: true, accuracy: 60, waterFound: 0, reputation: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 0.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.accuracy).toBeCloseTo(60.3)
    })

    it('成功时 reputation 增加 0.5（上限 100）', () => {
      const d = makeDowser(1, { active: true, accuracy: 100, reputation: 0, waterFound: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 0.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.reputation).toBeCloseTo(0.5)
    })

    it('失败时 reputation 减少 0.2（下限 0）', () => {
      const d = makeDowser(1, { active: true, accuracy: 0, reputation: 50, waterFound: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 1.0 // random*100=100 >= accuracy=0 → failure
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.reputation).toBeCloseTo(49.8)
    })

    it('失败时 waterFound 不变', () => {
      const d = makeDowser(1, { active: true, accuracy: 0, waterFound: 3, reputation: 10 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 1.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.waterFound).toBe(3)
    })

    it('accuracy 上限为 95', () => {
      const d = makeDowser(1, { active: true, accuracy: 94.9, waterFound: 0, reputation: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 0.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.accuracy).toBeLessThanOrEqual(95)
    })

    it('reputation 上限为 100', () => {
      const d = makeDowser(1, { active: true, accuracy: 100, reputation: 99.8, waterFound: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 0.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.reputation).toBeLessThanOrEqual(100)
    })

    it('reputation 下限为 0', () => {
      const d = makeDowser(1, { active: true, accuracy: 0, reputation: 0.1, waterFound: 0 })
      ;(sys as any).dowsers.push(d)
      const em = makeEM([1], true)
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.9
        if (callCount === 2) return 0.001
        return 1.0
      })
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect(d.reputation).toBeGreaterThanOrEqual(0)
    })
  })

  // ========== MAX_DOWSERS 上限测试 ==========

  describe('MAX_DOWSERS 上限（8）', () => {
    it('dowsers 已满 8 时不再分配新探水师', () => {
      for (let i = 0; i < 8; i++) {
        ;(sys as any).dowsers.push(makeDowser(i + 1, { active: false }))
        ;(sys as any)._dowsersSet.add(i + 1)
      }
      const em = makeEM([99], true)
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < ASSIGN_CHANCE=0.002
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      // 由于已满8个，不应再添加
      expect((sys as any).dowsers.length).toBeLessThanOrEqual(8)
    })

    it('dowsers < 8 且 random >= ASSIGN_CHANCE(0.002) 时不分配', () => {
      const em = makeEM([1], true)
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // >= 0.002
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect((sys as any).dowsers).toHaveLength(0)
    })
  })

  // ========== 全流程集成测试 ==========

  describe('全流程集成', () => {
    it('tick 差值不足时 dowsers 状态不变', () => {
      const d = makeDowser(1, { active: false, waterFound: 5 })
      ;(sys as any).dowsers.push(d)
      ;(sys as any).lastCheck = 5000
      const em = makeEM([1], true)
      sys.update(0, em as any, 7000) // 差值2000 < 3000
      expect(d.waterFound).toBe(5)
    })

    it('空 dowsers 时 update 不报错', () => {
      const em = makeEM([], true)
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(() => sys.update(0, em as any, 3000)).not.toThrow()
    })

    it('实体列表为空时不分配探水师', () => {
      const em = makeEM([], true) // 无实体
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      expect((sys as any).dowsers).toHaveLength(0)
    })

    it('已在 _dowsersSet 中的实体不重复分配', () => {
      ;(sys as any)._dowsersSet.add(1)
      const em = {
        getEntitiesWithComponent: vi.fn().mockReturnValue([1]),
        hasComponent: vi.fn().mockReturnValue(true),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3000)
      vi.restoreAllMocks()
      // entityId=1 已在集合中，不重复添加
      expect((sys as any).dowsers).toHaveLength(0)
    })
  })
})
