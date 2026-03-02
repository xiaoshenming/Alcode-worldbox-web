import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureKnurlerSystem, Knurler } from '../systems/CreatureKnurlerSystem'

function makeEM() {
  return {} as any
}

function injectKnurler(sys: CreatureKnurlerSystem, overrides: Partial<Knurler> = {}): Knurler {
  const knurler: Knurler = {
    id: 1,
    entityId: 100,
    knurlingSkill: 20,
    patternPrecision: 25,
    surfaceTexture: 10,
    gripQuality: 20,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).knurlers.push(knurler)
  return knurler
}

function triggerUpdate(sys: CreatureKnurlerSystem, tick = 2930) {
  sys.update(1, makeEM(), tick)
}

describe('CreatureKnurlerSystem', () => {
  let sys: CreatureKnurlerSystem

  beforeEach(() => {
    sys = new CreatureKnurlerSystem()
  })
  afterEach(() => vi.restoreAllMocks())

  // ===== 初始化状态 =====
  describe('初始化状态', () => {
    it('初始 knurlers 列表为空', () => {
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('knurlers 是数组类型', () => {
      expect(Array.isArray((sys as any).knurlers)).toBe(true)
    })

    it('多次实例化彼此独立', () => {
      const sys2 = new CreatureKnurlerSystem()
      injectKnurler(sys)
      expect((sys2 as any).knurlers).toHaveLength(0)
    })
  })

  // ===== 数据注入与查询 =====
  describe('数据注入与查询', () => {
    it('注入 knurler 后可从列表查询', () => {
      injectKnurler(sys, { entityId: 77 })
      expect((sys as any).knurlers).toHaveLength(1)
      expect((sys as any).knurlers[0].entityId).toBe(77)
    })

    it('注入多个 knurler 全部可查询', () => {
      injectKnurler(sys, { id: 1, entityId: 1 })
      injectKnurler(sys, { id: 2, entityId: 2 })
      injectKnurler(sys, { id: 3, entityId: 3 })
      expect((sys as any).knurlers).toHaveLength(3)
    })

    it('Knurler 具备 knurlingSkill/patternPrecision/surfaceTexture/gripQuality 字段', () => {
      injectKnurler(sys)
      const k: Knurler = (sys as any).knurlers[0]
      expect(k).toHaveProperty('knurlingSkill')
      expect(k).toHaveProperty('patternPrecision')
      expect(k).toHaveProperty('surfaceTexture')
      expect(k).toHaveProperty('gripQuality')
    })

    it('Knurler 包含 id 字段', () => {
      injectKnurler(sys, { id: 42 })
      expect((sys as any).knurlers[0].id).toBe(42)
    })

    it('Knurler 包含 entityId 字段', () => {
      injectKnurler(sys, { entityId: 999 })
      expect((sys as any).knurlers[0].entityId).toBe(999)
    })

    it('Knurler 包含 tick 字段', () => {
      injectKnurler(sys, { tick: 5000 })
      expect((sys as any).knurlers[0].tick).toBe(5000)
    })

    it('自定义字段覆盖默认值', () => {
      injectKnurler(sys, { knurlingSkill: 88 })
      expect((sys as any).knurlers[0].knurlingSkill).toBe(88)
    })

    it('可以注入 10 个 knurler（MAX_KNURLERS 上限）', () => {
      for (let i = 0; i < 10; i++) {
        injectKnurler(sys, { id: i + 1, entityId: i + 1 })
      }
      expect((sys as any).knurlers).toHaveLength(10)
    })
  })

  // ===== tick 间隔控制（CHECK_INTERVAL = 2930）=====
  describe('tick 间隔控制（CHECK_INTERVAL = 2930）', () => {
    it('tick 差值 < 2930 时 lastCheck 保持 0', () => {
      sys.update(1, makeEM(), 2929)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick >= 2930 时 lastCheck 更新', () => {
      sys.update(1, makeEM(), 2930)
      expect((sys as any).lastCheck).toBe(2930)
    })

    it('差值恰好 2929 时不更新', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2929)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('差值恰好 2930 时更新', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2930)
      expect((sys as any).lastCheck).toBe(2930)
    })

    it('lastCheck 已设定后，差值不足 2930 时不再更新', () => {
      sys.update(1, makeEM(), 2930)
      sys.update(1, makeEM(), 4000)
      expect((sys as any).lastCheck).toBe(2930)
    })

    it('lastCheck 已设定后差值满足时再次更新', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2930)
      sys.update(1, makeEM(), 5860)
      expect((sys as any).lastCheck).toBe(5860)
    })

    it('tick = 0 时触发首次更新', () => {
      sys.update(1, makeEM(), 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续三次满足间隔 lastCheck 逐步推进', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2930)
      sys.update(1, makeEM(), 5860)
      sys.update(1, makeEM(), 8790)
      expect((sys as any).lastCheck).toBe(8790)
    })

    it('极大 tick 时 lastCheck 正确更新', () => {
      sys.update(1, makeEM(), 2_000_000)
      expect((sys as any).lastCheck).toBe(2_000_000)
    })
  })

  // ===== 技能递增逻辑 =====
  describe('技能递增逻辑', () => {
    it('update 后 knurlingSkill 精确增加 0.02', () => {
      injectKnurler(sys, { knurlingSkill: 20 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(20.02, 5)
    })

    it('update 后 patternPrecision 精确增加 0.015', () => {
      injectKnurler(sys, { patternPrecision: 25 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].patternPrecision).toBeCloseTo(25.015, 5)
    })

    it('update 后 gripQuality 精确增加 0.01', () => {
      injectKnurler(sys, { gripQuality: 20 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].gripQuality).toBeCloseTo(20.01, 5)
    })

    it('surfaceTexture 在 update 中不变（源码不递增）', () => {
      injectKnurler(sys, { surfaceTexture: 55 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].surfaceTexture).toBe(55)
    })

    it('多个 knurler 同时递增', () => {
      injectKnurler(sys, { id: 1, knurlingSkill: 10 })
      injectKnurler(sys, { id: 2, knurlingSkill: 20 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(10.02, 5)
      expect((sys as any).knurlers[1].knurlingSkill).toBeCloseTo(20.02, 5)
    })

    it('连续两次 update 后 knurlingSkill 增加 0.04', () => {
      injectKnurler(sys, { knurlingSkill: 50 })
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(50.04, 5)
    })

    it('连续两次 update 后 patternPrecision 增加 0.03', () => {
      injectKnurler(sys, { patternPrecision: 50 })
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      expect((sys as any).knurlers[0].patternPrecision).toBeCloseTo(50.03, 5)
    })

    it('连续两次 update 后 gripQuality 增加 0.02', () => {
      injectKnurler(sys, { gripQuality: 50 })
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      ;(sys as any).lastCheck = -2930
      sys.update(1, makeEM(), 0)
      expect((sys as any).knurlers[0].gripQuality).toBeCloseTo(50.02, 5)
    })
  })

  // ===== 技能上限（100）=====
  describe('技能上限（100）', () => {
    it('knurlingSkill 不超过 100', () => {
      injectKnurler(sys, { knurlingSkill: 99.99 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBeLessThanOrEqual(100)
    })

    it('patternPrecision 不超过 100', () => {
      injectKnurler(sys, { patternPrecision: 99.99 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].patternPrecision).toBeLessThanOrEqual(100)
    })

    it('gripQuality 不超过 100', () => {
      injectKnurler(sys, { gripQuality: 99.99 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].gripQuality).toBeLessThanOrEqual(100)
    })

    it('knurlingSkill 已为 100 时保持 100', () => {
      injectKnurler(sys, { knurlingSkill: 100 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBe(100)
    })

    it('patternPrecision 已为 100 时保持 100', () => {
      injectKnurler(sys, { patternPrecision: 100 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].patternPrecision).toBe(100)
    })

    it('gripQuality 已为 100 时保持 100', () => {
      injectKnurler(sys, { gripQuality: 100 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].gripQuality).toBe(100)
    })

    it('knurlingSkill 超过 100 时强制 clamp 到 100', () => {
      injectKnurler(sys, { knurlingSkill: 105 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBe(100)
    })

    it('patternPrecision 超过 100 时强制 clamp 到 100', () => {
      injectKnurler(sys, { patternPrecision: 110 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].patternPrecision).toBe(100)
    })
  })

  // ===== cleanup 边界逻辑 =====
  describe('cleanup 边界逻辑（knurlingSkill <= 4 删除）', () => {
    it('cleanup: knurlingSkill <= 4 时 knurler 被删除（边界 3.98）', () => {
      injectKnurler(sys, { knurlingSkill: 3.98 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('cleanup: knurlingSkill > 4 时 knurler 保留', () => {
      injectKnurler(sys, { knurlingSkill: 10 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(1)
    })

    it('cleanup: knurlingSkill = 4.00（递增后）时删除', () => {
      injectKnurler(sys, { knurlingSkill: 3.98 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('cleanup: knurlingSkill = 4.02（递增后）时保留', () => {
      injectKnurler(sys, { knurlingSkill: 4.00 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(1)
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(4.02, 5)
    })

    it('cleanup: knurlingSkill = 0 时被删除', () => {
      injectKnurler(sys, { knurlingSkill: 0 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('cleanup: knurlingSkill 负数时被删除', () => {
      injectKnurler(sys, { knurlingSkill: -5 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('cleanup: knurlingSkill = 5 时保留', () => {
      injectKnurler(sys, { knurlingSkill: 5 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(1)
    })

    it('cleanup: 混合状态，低技能被删、高技能保留', () => {
      injectKnurler(sys, { id: 1, entityId: 1, knurlingSkill: 3 })
      injectKnurler(sys, { id: 2, entityId: 2, knurlingSkill: 50 })
      injectKnurler(sys, { id: 3, entityId: 3, knurlingSkill: 2 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(1)
      expect((sys as any).knurlers[0].entityId).toBe(2)
    })

    it('cleanup: 全部低技能时列表清空', () => {
      for (let i = 0; i < 5; i++) {
        injectKnurler(sys, { id: i + 1, entityId: i + 1, knurlingSkill: 1 })
      }
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('cleanup 使用逆序遍历，删除不影响其他元素顺序', () => {
      injectKnurler(sys, { id: 1, entityId: 1, knurlingSkill: 3 })
      injectKnurler(sys, { id: 2, entityId: 2, knurlingSkill: 50 })
      injectKnurler(sys, { id: 3, entityId: 3, knurlingSkill: 3 })
      injectKnurler(sys, { id: 4, entityId: 4, knurlingSkill: 60 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(2)
      const remaining = (sys as any).knurlers.map((k: Knurler) => k.entityId)
      expect(remaining).toContain(2)
      expect(remaining).toContain(4)
    })
  })

  // ===== 招募逻辑（Math.random mock）=====
  describe('招募逻辑（RECRUIT_CHANCE = 0.0015，MAX_KNURLERS = 10）', () => {
    it('Math.random < RECRUIT_CHANCE 时招募新 knurler', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      expect((sys as any).knurlers.length).toBeGreaterThanOrEqual(1)
    })

    it('Math.random >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, makeEM(), 2930)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('已达 MAX_KNURLERS=10 时不招募', () => {
      for (let i = 0; i < 10; i++) {
        injectKnurler(sys, { id: i + 1, entityId: i + 1 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      expect((sys as any).knurlers.length).toBeLessThanOrEqual(10)
    })

    it('招募时 nextId 自增', () => {
      const before = (sys as any).nextId
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        expect((sys as any).nextId).toBe(before + 1)
      }
    })

    it('招募的 knurler knurlingSkill 在 10-35 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        const k = (sys as any).knurlers[0]
        expect(k.knurlingSkill).toBeGreaterThanOrEqual(10)
        expect(k.knurlingSkill).toBeLessThanOrEqual(35)
      }
    })

    it('招募的 knurler entityId 在 0-499 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        const k = (sys as any).knurlers[0]
        expect(k.entityId).toBeGreaterThanOrEqual(0)
        expect(k.entityId).toBeLessThan(500)
      }
    })

    it('新招募的 knurler tick 字段等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        expect((sys as any).knurlers[0].tick).toBe(2930)
      }
    })

    it('招募时 id 从 nextId 分配', () => {
      ;(sys as any).nextId = 5
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        expect((sys as any).knurlers[0].id).toBe(5)
      }
    })

    it('招募的 knurler patternPrecision 在 15-35 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        const k = (sys as any).knurlers[0]
        expect(k.patternPrecision).toBeGreaterThanOrEqual(15)
        expect(k.patternPrecision).toBeLessThanOrEqual(35)
      }
    })

    it('招募的 knurler gripQuality 在 10-35 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM(), 2930)
      if ((sys as any).knurlers.length > 0) {
        const k = (sys as any).knurlers[0]
        expect(k.gripQuality).toBeGreaterThanOrEqual(10)
        expect(k.gripQuality).toBeLessThanOrEqual(35)
      }
    })
  })

  // ===== 边界值与稳定性 =====
  describe('边界值与稳定性', () => {
    it('update 在列表为空时不报错', () => {
      expect(() => triggerUpdate(sys)).not.toThrow()
    })

    it('连续调用 update 不报错', () => {
      injectKnurler(sys)
      expect(() => {
        for (let t = 0; t < 30000; t += 2930) {
          sys.update(1, makeEM(), t)
        }
      }).not.toThrow()
    })

    it('dt 参数不影响 tick 间隔判断', () => {
      sys.update(9999, makeEM(), 2930)
      expect((sys as any).lastCheck).toBe(2930)
    })

    it('knurlingSkill = 4.001 时不被删除（递增后 > 4）', () => {
      injectKnurler(sys, { knurlingSkill: 4.001 })
      triggerUpdate(sys)
      expect((sys as any).knurlers).toHaveLength(1)
    })

    it('每次 update 只在满足间隔后执行逻辑', () => {
      injectKnurler(sys, { knurlingSkill: 50 })
      sys.update(1, makeEM(), 100)   // 不触发
      expect((sys as any).knurlers[0].knurlingSkill).toBe(50)
      sys.update(1, makeEM(), 2930)  // 触发
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(50.02, 5)
    })

    it('knurler 数量为 0 时 cleanup 无副作用', () => {
      sys.update(1, makeEM(), 2930)
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('极小 knurlingSkill（如 0.01）在递增后仍被删除', () => {
      injectKnurler(sys, { knurlingSkill: 0.01 })
      triggerUpdate(sys)
      // 0.01 + 0.02 = 0.03 <= 4，被删除
      expect((sys as any).knurlers).toHaveLength(0)
    })

    it('各字段独立递增不互相干扰', () => {
      injectKnurler(sys, { knurlingSkill: 30, patternPrecision: 40, gripQuality: 50 })
      triggerUpdate(sys)
      expect((sys as any).knurlers[0].knurlingSkill).toBeCloseTo(30.02, 5)
      expect((sys as any).knurlers[0].patternPrecision).toBeCloseTo(40.015, 5)
      expect((sys as any).knurlers[0].gripQuality).toBeCloseTo(50.01, 5)
    })
  })
})
