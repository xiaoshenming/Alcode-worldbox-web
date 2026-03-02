import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureKnittingMakersSystem, KnittingMaker } from '../systems/CreatureKnittingMakersSystem'

// ── 工厂函数 ─────────────────────────────────────────────────────────────────
function makeEM() { return {} as any }

function injectMaker(sys: CreatureKnittingMakersSystem, overrides: Partial<KnittingMaker> = {}): KnittingMaker {
  const maker: KnittingMaker = {
    id: 1, entityId: 100,
    skillLevel: 20, yarnQuality: 30,
    patternComplexity: 10, outputRate: 0.5,
    tick: 0, ...overrides,
  }
  ;(sys as any).makers.push(maker)
  return maker
}

function triggerUpdate(sys: CreatureKnittingMakersSystem, tick = 2520) {
  ;(sys as any).lastCheck = 0
  sys.update(1, makeEM(), tick)
}

// ── 源码常量镜像 ─────────────────────────────────────────────────────────────
const CHECK_INTERVAL = 2520
const MAX_MAKERS = 14
const RECRUIT_CHANCE = 0.0019

describe('CreatureKnittingMakersSystem', () => {
  let sys: CreatureKnittingMakersSystem

  beforeEach(() => { sys = new CreatureKnittingMakersSystem() })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化 ──────────────────────────────────────────────────────────────
  describe('初始化', () => {
    it('初始 makers 列表为空', () => {
      expect((sys as any).makers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('实例类型正确', () => {
      expect(sys).toBeInstanceOf(CreatureKnittingMakersSystem)
    })

    it('makers 是数组类型', () => {
      expect(Array.isArray((sys as any).makers)).toBe(true)
    })
  })

  // ── 2. 数据注入与读取 ──────────────────────────────────────────────────────
  describe('数据注入与读取', () => {
    it('注入 maker 后可从列表查询', () => {
      injectMaker(sys, { entityId: 42 })
      expect((sys as any).makers).toHaveLength(1)
      expect((sys as any).makers[0].entityId).toBe(42)
    })

    it('注入多个 maker 全部可查询', () => {
      injectMaker(sys, { id: 1, entityId: 1 })
      injectMaker(sys, { id: 2, entityId: 2 })
      injectMaker(sys, { id: 3, entityId: 3 })
      expect((sys as any).makers).toHaveLength(3)
    })

    it('KnittingMaker 具备 skillLevel/yarnQuality/patternComplexity/outputRate 字段', () => {
      injectMaker(sys)
      const m: KnittingMaker = (sys as any).makers[0]
      expect(m).toHaveProperty('skillLevel')
      expect(m).toHaveProperty('yarnQuality')
      expect(m).toHaveProperty('patternComplexity')
      expect(m).toHaveProperty('outputRate')
    })

    it('注入后 id 字段存在', () => {
      injectMaker(sys, { id: 77 })
      expect((sys as any).makers[0].id).toBe(77)
    })

    it('注入后 tick 字段存在', () => {
      injectMaker(sys, { tick: 500 })
      expect((sys as any).makers[0].tick).toBe(500)
    })

    it('注入 entityId=0 也合法', () => {
      injectMaker(sys, { entityId: 0 })
      expect((sys as any).makers[0].entityId).toBe(0)
    })

    it('注入后列表引用一致', () => {
      const m = injectMaker(sys)
      expect((sys as any).makers[0]).toBe(m)
    })

    it('patternComplexity 字段为数值类型', () => {
      injectMaker(sys, { patternComplexity: 15 })
      expect(typeof (sys as any).makers[0].patternComplexity).toBe('number')
    })
  })

  // ── 3. CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值 < CHECK_INTERVAL(2520) 时 lastCheck 保持 0', () => {
      sys.update(1, makeEM(), CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值 === CHECK_INTERVAL 时 lastCheck 更新', () => {
      sys.update(1, makeEM(), CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 差值 > CHECK_INTERVAL 时 lastCheck 也更新', () => {
      sys.update(1, makeEM(), CHECK_INTERVAL + 500)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
    })

    it('未到阈值时 makers 不变（空列表保持空）', () => {
      sys.update(1, makeEM(), CHECK_INTERVAL - 1)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('连续两次 update：第一次满足，第二次差值不足，lastCheck 固定于第一次 tick', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEM(), CHECK_INTERVAL)
      sys.update(1, makeEM(), CHECK_INTERVAL + 100) // 差值 100 < 2520
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick=0 不触发更新', () => {
      sys.update(1, makeEM(), 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('从较大 lastCheck 值开始，差值不足不触发', () => {
      ;(sys as any).lastCheck = 10000
      sys.update(1, makeEM(), 10000 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(10000)
    })
  })

  // ── 4. 技能增长逻辑 ────────────────────────────────────────────────────────
  describe('技能增长逻辑', () => {
    it('update 后 skillLevel 精确增加 0.02', () => {
      injectMaker(sys, { skillLevel: 20 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].skillLevel).toBeCloseTo(20.02, 5)
    })

    it('update 后 yarnQuality 精确增加 0.01', () => {
      injectMaker(sys, { yarnQuality: 30 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].yarnQuality).toBeCloseTo(30.01, 5)
    })

    it('update 后 outputRate 精确增加 0.005', () => {
      injectMaker(sys, { skillLevel: 20, outputRate: 0.5 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].outputRate).toBeCloseTo(0.505, 5)
    })

    it('patternComplexity 不被 update 修改', () => {
      injectMaker(sys, { patternComplexity: 15 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].patternComplexity).toBe(15)
    })

    it('多个 maker 都被同等增长', () => {
      injectMaker(sys, { id: 1, entityId: 1, skillLevel: 20 })
      injectMaker(sys, { id: 2, entityId: 2, skillLevel: 40 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].skillLevel).toBeCloseTo(20.02, 5)
      expect((sys as any).makers[1].skillLevel).toBeCloseTo(40.02, 5)
    })

    it('tick 字段在 maker 上 update 后不变', () => {
      injectMaker(sys, { tick: 0 })
      triggerUpdate(sys, 9999)
      expect((sys as any).makers[0].tick).toBe(0)
    })
  })

  // ── 5. 上限钳制 ────────────────────────────────────────────────────────────
  describe('上限钳制', () => {
    it('skillLevel 不超过 100', () => {
      injectMaker(sys, { skillLevel: 99.99 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].skillLevel).toBeLessThanOrEqual(100)
    })

    it('yarnQuality 不超过 100', () => {
      injectMaker(sys, { skillLevel: 20, yarnQuality: 99.995 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].yarnQuality).toBeLessThanOrEqual(100)
    })

    it('outputRate 不超过 1', () => {
      injectMaker(sys, { skillLevel: 20, outputRate: 0.999 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].outputRate).toBeLessThanOrEqual(1)
    })

    it('skillLevel 已为 100 时保持 100', () => {
      injectMaker(sys, { skillLevel: 100 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].skillLevel).toBe(100)
    })

    it('yarnQuality 已为 100 时保持 100', () => {
      injectMaker(sys, { skillLevel: 20, yarnQuality: 100 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].yarnQuality).toBe(100)
    })

    it('outputRate 已为 1 时保持 1', () => {
      injectMaker(sys, { skillLevel: 20, outputRate: 1 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].outputRate).toBe(1)
    })

    it('skillLevel=99.98 增长后精确钳制到 100', () => {
      injectMaker(sys, { skillLevel: 99.98 })
      triggerUpdate(sys)
      expect((sys as any).makers[0].skillLevel).toBeCloseTo(100, 5)
    })
  })

  // ── 6. cleanup 逻辑 ────────────────────────────────────────────────────────
  describe('cleanup: skillLevel <= 5 时删除', () => {
    it('skillLevel=4.98 增长后 5.00 → 被删（等于阈值）', () => {
      injectMaker(sys, { skillLevel: 4.98 })
      sys.update(1, makeEM(), CHECK_INTERVAL)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('skillLevel=4.99 增长后 5.01 > 5 → 保留', () => {
      injectMaker(sys, { skillLevel: 4.99 })
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('skillLevel=3 时删除（明显低于阈值）', () => {
      injectMaker(sys, { skillLevel: 3 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('skillLevel=10 时保留（明显高于阈值）', () => {
      injectMaker(sys, { skillLevel: 10 })
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('cleanup 后剩余条目的 skillLevel 均 > 5', () => {
      injectMaker(sys, { id: 1, entityId: 1, skillLevel: 2 })
      injectMaker(sys, { id: 2, entityId: 2, skillLevel: 20 })
      injectMaker(sys, { id: 3, entityId: 3, skillLevel: 1 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      const remaining = (sys as any).makers as KnittingMaker[]
      expect(remaining.every(m => m.skillLevel > 5)).toBe(true)
    })

    it('cleanup 正确减少列表长度', () => {
      for (let i = 0; i < 5; i++) injectMaker(sys, { id: i, entityId: i, skillLevel: 2 })
      for (let i = 5; i < 8; i++) injectMaker(sys, { id: i, entityId: i, skillLevel: 50 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(3)
    })

    it('cleanup 从末尾向前遍历，entityId 高的低 skill 条目也被删除', () => {
      injectMaker(sys, { id: 1, entityId: 1, skillLevel: 50 })
      injectMaker(sys, { id: 2, entityId: 2, skillLevel: 2 })  // 末尾被删
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      const remaining = (sys as any).makers as KnittingMaker[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(1)
    })

    it('全部 skillLevel 高于 5 时无删除', () => {
      for (let i = 0; i < 5; i++) injectMaker(sys, { id: i, entityId: i, skillLevel: 30 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(5)
    })
  })

  // ── 7. 招募逻辑 ────────────────────────────────────────────────────────────
  describe('招募逻辑', () => {
    it('Math.random() < RECRUIT_CHANCE(0.0019) 时招募新 maker', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('Math.random() >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('makers 达到 MAX_MAKERS(14) 时不招募', () => {
      for (let i = 0; i < MAX_MAKERS; i++) {
        injectMaker(sys, { id: i, entityId: i, skillLevel: 50 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(MAX_MAKERS)
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).nextId).toBe(2)
    })

    it('招募新 maker 包含所有必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      if ((sys as any).makers.length > 0) {
        const m = (sys as any).makers[0] as KnittingMaker
        expect(m).toHaveProperty('id')
        expect(m).toHaveProperty('entityId')
        expect(m).toHaveProperty('skillLevel')
        expect(m).toHaveProperty('yarnQuality')
        expect(m).toHaveProperty('patternComplexity')
        expect(m).toHaveProperty('outputRate')
        expect(m).toHaveProperty('tick')
      }
    })

    it('招募新 maker 的 skillLevel 在 [10, 40] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      if ((sys as any).makers.length > 0) {
        const m = (sys as any).makers[0] as KnittingMaker
        expect(m.skillLevel).toBeGreaterThanOrEqual(10)
        expect(m.skillLevel).toBeLessThanOrEqual(40)
      }
    })

    it('招募新 maker 的 outputRate 在 [0.3, 0.7] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      if ((sys as any).makers.length > 0) {
        const m = (sys as any).makers[0] as KnittingMaker
        expect(m.outputRate).toBeGreaterThanOrEqual(0.3)
        expect(m.outputRate).toBeLessThanOrEqual(0.7)
      }
    })

    it('招募新 maker 的 tick 等于传入当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEM(), 8888)
      if ((sys as any).makers.length > 0) {
        expect((sys as any).makers[0].tick).toBe(8888)
      }
    })
  })

  // ── 8. 边界条件 ────────────────────────────────────────────────────────────
  describe('边界条件', () => {
    it('空列表调用 update 不崩溃', () => {
      expect(() => triggerUpdate(sys)).not.toThrow()
    })

    it('dt 参数不影响逻辑（传不同 dt 结果一致）', () => {
      injectMaker(sys, { skillLevel: 20 })
      ;(sys as any).lastCheck = 0
      sys.update(999, makeEM(), CHECK_INTERVAL)
      expect((sys as any).makers[0].skillLevel).toBeCloseTo(20.02, 5)
    })

    it('skillLevel 精确等于 5 时被删除', () => {
      injectMaker(sys, { skillLevel: 4.98 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeEM(), CHECK_INTERVAL)
      // 4.98 + 0.02 = 5.00, 5.00 <= 5 → 删除
      expect((sys as any).makers).toHaveLength(0)
    })

    it('多次 update 后 skillLevel 累积增长', () => {
      injectMaker(sys, { skillLevel: 20 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys, CHECK_INTERVAL)
      ;(sys as any).lastCheck = 0
      triggerUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).makers[0].skillLevel).toBeCloseTo(20.04, 4)
    })

    it('单次 update 后 lastCheck 精确等于传入 tick', () => {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEM(), 7777)
      expect((sys as any).lastCheck).toBe(7777)
    })
  })

  // ── 9. 多实例独立性 ─────────────────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例的 makers 互不干扰', () => {
      const sys2 = new CreatureKnittingMakersSystem()
      injectMaker(sys, { entityId: 1 })
      expect((sys2 as any).makers).toHaveLength(0)
    })

    it('两个 sys 实例的 lastCheck 互不干扰', () => {
      const sys2 = new CreatureKnittingMakersSystem()
      ;(sys as any).lastCheck = 5000
      expect((sys2 as any).lastCheck).toBe(0)
    })

    it('两个 sys 实例 update 互不影响', () => {
      const sys2 = new CreatureKnittingMakersSystem()
      injectMaker(sys, { skillLevel: 20 })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys2 as any).makers).toHaveLength(0)
    })
  })
})
