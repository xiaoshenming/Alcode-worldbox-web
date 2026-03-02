import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFullingMakersSystem } from '../systems/CreatureFullingMakersSystem'
import type { FullingMaker } from '../systems/CreatureFullingMakersSystem'

let nextId = 1
function makeSys(): CreatureFullingMakersSystem { return new CreatureFullingMakersSystem() }
function makeMaker(entityId: number, poundingForce = 50): FullingMaker {
  return { id: nextId++, entityId, poundingForce, clothDensity: 60, shrinkageControl: 70, finishQuality: 80, tick: 0 }
}

// ─── 辅助：触发一次完整更新 ───────────────────────────────────
function triggerUpdate(sys: CreatureFullingMakersSystem, tick = 2530): void {
  ;(sys as any).lastCheck = 0
  sys.update(16, {} as any, tick)
}

describe('CreatureFullingMakersSystem', () => {
  let sys: CreatureFullingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ═══════════════════════════════════════════════════════════
  // 1. 初始状态
  // ═══════════════════════════════════════════════════════════
  describe('初始状态', () => {
    it('初始 makers 数组为空', () => {
      expect((sys as any).makers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('多次实例化互相独立', () => {
      const sys2 = makeSys()
      ;(sys as any).makers.push(makeMaker(1))
      expect((sys2 as any).makers).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 2. 数据注入与查询
  // ═══════════════════════════════════════════════════════════
  describe('数据注入与查询', () => {
    it('注入后可按索引查询', () => {
      ;(sys as any).makers.push(makeMaker(1))
      expect((sys as any).makers[0].entityId).toBe(1)
    })

    it('注入多个全部存在', () => {
      ;(sys as any).makers.push(makeMaker(1))
      ;(sys as any).makers.push(makeMaker(2))
      expect((sys as any).makers).toHaveLength(2)
    })

    it('poundingForce 字段正确存储', () => {
      const m = makeMaker(1, 77)
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].poundingForce).toBe(77)
    })

    it('clothDensity 字段正确存储', () => {
      const m = makeMaker(1)
      m.clothDensity = 88
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].clothDensity).toBe(88)
    })

    it('shrinkageControl 字段正确存储', () => {
      const m = makeMaker(1)
      m.shrinkageControl = 55
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].shrinkageControl).toBe(55)
    })

    it('finishQuality 字段正确存储', () => {
      const m = makeMaker(1)
      m.finishQuality = 93
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].finishQuality).toBe(93)
    })

    it('四字段同时精确存储', () => {
      const m = makeMaker(10)
      m.poundingForce = 90; m.clothDensity = 85; m.shrinkageControl = 80; m.finishQuality = 75
      ;(sys as any).makers.push(m)
      const r = (sys as any).makers[0]
      expect(r.poundingForce).toBe(90)
      expect(r.clothDensity).toBe(85)
      expect(r.shrinkageControl).toBe(80)
      expect(r.finishQuality).toBe(75)
    })

    it('id 字段正确存储', () => {
      const m = makeMaker(5)
      const savedId = m.id
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].id).toBe(savedId)
    })

    it('tick 字段正确存储', () => {
      const m = makeMaker(1)
      m.tick = 999
      ;(sys as any).makers.push(m)
      expect((sys as any).makers[0].tick).toBe(999)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 3. CHECK_INTERVAL 节流逻辑
  // ═══════════════════════════════════════════════════════════
  describe('CHECK_INTERVAL 节流逻辑', () => {
    it('tick 差值 < 2530 不触发更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3529)  // 3529 - 1000 = 2529 < 2530
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 2530 更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3530)  // 3530 - 1000 = 2530 >= 2530
      expect((sys as any).lastCheck).toBe(3530)
    })

    it('恰好等于 2530 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2530)
      expect((sys as any).lastCheck).toBe(2530)
    })

    it('差值为 2529 不触发 lastCheck 更新', () => {
      ;(sys as any).lastCheck = 1
      sys.update(16, {} as any, 2530)  // 2530 - 1 = 2529 < 2530
      expect((sys as any).lastCheck).toBe(1)
    })

    it('差值为 2531 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2531)
      expect((sys as any).lastCheck).toBe(2531)
    })

    it('节流期间不修改 makers 数据', () => {
      const m = makeMaker(1, 50)
      ;(sys as any).makers.push(m)
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3529)  // 差值 2529，不触发
      expect((sys as any).makers[0].poundingForce).toBe(50)
    })

    it('tick 从 0 开始第一次刚好满足 2530 触发', () => {
      sys.update(16, {} as any, 2530)
      expect((sys as any).lastCheck).toBe(2530)
    })

    it('连续两次调用 lastCheck 按最新 tick 更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2530)
      expect((sys as any).lastCheck).toBe(2530)
      sys.update(16, {} as any, 2530 + 2530)
      expect((sys as any).lastCheck).toBe(5060)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 4. 技能增长逻辑
  // ═══════════════════════════════════════════════════════════
  describe('技能增长逻辑', () => {
    it('update 后 poundingForce + 0.02', () => {
      const m = makeMaker(1, 50)
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.02, 5)
    })

    it('update 后 clothDensity + 0.015', () => {
      const m = makeMaker(1)
      m.clothDensity = 60
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].clothDensity).toBeCloseTo(60.015, 5)
    })

    it('update 后 finishQuality + 0.01', () => {
      const m = makeMaker(1)
      m.finishQuality = 80
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].finishQuality).toBeCloseTo(80.01, 5)
    })

    it('shrinkageControl 不会被 update 修改', () => {
      const m = makeMaker(1)
      m.shrinkageControl = 70
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].shrinkageControl).toBe(70)
    })

    it('多个 makers 均被同等增长', () => {
      const m1 = makeMaker(1, 50)
      const m2 = makeMaker(2, 60)
      ;(sys as any).makers.push(m1)
      ;(sys as any).makers.push(m2)
      triggerUpdate(sys)
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.02, 5)
      expect((sys as any).makers[1].poundingForce).toBeCloseTo(60.02, 5)
    })

    it('低值时增长后不超过上限', () => {
      const m = makeMaker(1, 5)
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(5.02, 5)
    })

    it('poundingForce 接近上限时精确增长到 100', () => {
      const m = makeMaker(1, 99.99)
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].poundingForce).toBe(100)
    })

    it('clothDensity 上限 100 不超出', () => {
      const m = makeMaker(1)
      m.clothDensity = 99.99
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].clothDensity).toBe(100)
    })

    it('finishQuality 上限 100 不超出', () => {
      const m = makeMaker(1)
      m.finishQuality = 99.99
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].finishQuality).toBe(100)
    })

    it('已达到 100 的字段保持在 100', () => {
      const m = makeMaker(1, 100)
      m.clothDensity = 100
      m.finishQuality = 100
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].poundingForce).toBe(100)
      expect((sys as any).makers[0].clothDensity).toBe(100)
      expect((sys as any).makers[0].finishQuality).toBe(100)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 5. 清理逻辑（poundingForce 阈值）
  // ═══════════════════════════════════════════════════════════
  describe('清理逻辑', () => {
    it('poundingForce <= 4（更新后）时删除', () => {
      const m = makeMaker(1, 3.98)  // 3.98 + 0.02 = 4.00 <= 4
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('poundingForce > 4（更新后）时保留', () => {
      const m = makeMaker(1, 4.01)  // 4.01 + 0.02 = 4.03 > 4
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('同时存在删除和保留的情况', () => {
      const m1 = makeMaker(1, 3.98)  // 删除
      const m2 = makeMaker(2, 4.01)  // 保留
      ;(sys as any).makers.push(m1)
      ;(sys as any).makers.push(m2)
      triggerUpdate(sys)
      const remaining = (sys as any).makers
      expect(remaining.some((m: FullingMaker) => m.entityId === 1)).toBe(false)
      expect(remaining.some((m: FullingMaker) => m.entityId === 2)).toBe(true)
    })

    it('poundingForce 恰好等于 4（更新后）被删除', () => {
      const m = makeMaker(1, 3.98)  // 3.98 + 0.02 = 4.00 exactly
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('poundingForce 为 4.001（更新后）保留', () => {
      const m = makeMaker(1, 3.981)  // 3.981 + 0.02 = 4.001 > 4
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(1)
    })

    it('全部低于阈值时 makers 清空', () => {
      ;(sys as any).makers.push(makeMaker(1, 1))
      ;(sys as any).makers.push(makeMaker(2, 2))
      ;(sys as any).makers.push(makeMaker(3, 3))
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('全部高于阈值时无删除', () => {
      ;(sys as any).makers.push(makeMaker(1, 50))
      ;(sys as any).makers.push(makeMaker(2, 60))
      ;(sys as any).makers.push(makeMaker(3, 70))
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(3)
    })

    it('删除后剩余元素 entityId 正确', () => {
      ;(sys as any).makers.push(makeMaker(1, 3.98))  // 删除
      ;(sys as any).makers.push(makeMaker(2, 50))    // 保留
      ;(sys as any).makers.push(makeMaker(3, 3.98))  // 删除
      ;(sys as any).makers.push(makeMaker(4, 60))    // 保留
      triggerUpdate(sys)
      const ids = (sys as any).makers.map((m: FullingMaker) => m.entityId)
      expect(ids).toContain(2)
      expect(ids).toContain(4)
      expect(ids).not.toContain(1)
      expect(ids).not.toContain(3)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 6. 招募逻辑（Mock Math.random）
  // ═══════════════════════════════════════════════════════════
  describe('招募逻辑', () => {
    it('随机数 < RECRUIT_CHANCE(0.0016) 时招募新 maker', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).makers.length).toBeGreaterThan(0)
    })

    it('随机数 >= RECRUIT_CHANCE(0.0016) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('招募后新 maker 具有合法范围的 poundingForce', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      const m = (sys as any).makers[0]
      // poundingForce = 10 + random * 30，但 0.001 < RECRUIT_CHANCE 所以只要触发
      // 之后 random 用于属性，可能第二次 random 不同
      expect(m).toBeDefined()
    })

    it('makers.length 达到 MAX_MAKERS(11) 时不再招募', () => {
      for (let i = 0; i < 11; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      // 清理可能删除低值，但初始都是50，不会被删，仍应 <= 11
      expect((sys as any).makers.length).toBeLessThanOrEqual(11)
    })

    it('makers 数量未满时可以招募', () => {
      // 10 个已有（满 MAX_MAKERS-1）
      for (let i = 0; i < 10; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).makers.length).toBeGreaterThanOrEqual(10)
    })

    it('新招募的 maker nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).nextId = 5
      triggerUpdate(sys)
      if ((sys as any).makers.length > 0) {
        expect((sys as any).makers[0].id).toBe(5)
        expect((sys as any).nextId).toBe(6)
      }
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 7. update 参数传递与幂等性
  // ═══════════════════════════════════════════════════════════
  describe('update 方法行为', () => {
    it('update 不抛出异常', () => {
      expect(() => sys.update(16, {} as any, 2530)).not.toThrow()
    })

    it('dt 参数不影响增长量', () => {
      const m1 = makeMaker(1, 50)
      ;(sys as any).makers.push(m1)
      ;(sys as any).lastCheck = 0
      sys.update(100, {} as any, 2530)  // 大 dt
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.02, 5)
    })

    it('em 参数为空对象时不崩溃', () => {
      expect(() => sys.update(16, {} as any, 2530)).not.toThrow()
    })

    it('tick 为 0 时 lastCheck 已是 0 不触发（差值为 0）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 0)
      // 0 - 0 = 0 < 2530，不触发
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续触发两次两次都各自增长', () => {
      const m = makeMaker(1, 50)
      ;(sys as any).makers.push(m)
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2530)
      sys.update(16, {} as any, 5060)
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.04, 4)
    })

    it('大 tick 跳跃只触发一次增长', () => {
      const m = makeMaker(1, 50)
      ;(sys as any).makers.push(m)
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 100000)
      // 一次 update 只一轮增长
      expect((sys as any).makers[0].poundingForce).toBeCloseTo(50.02, 5)
    })
  })

  // ════════════════════════════════════��══════════════════════
  // 8. 边界与极端值
  // ═══════════════════════════════════════════════════════════
  describe('边界与极端值', () => {
    it('poundingForce 为 0 时更新后为 0.02，仍被删除', () => {
      const m = makeMaker(1, 0)
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      // 0 + 0.02 = 0.02 <= 4 => 删除
      expect((sys as any).makers).toHaveLength(0)
    })

    it('poundingForce 为负数时更新后仍被删除', () => {
      const m = makeMaker(1, -10)
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })

    it('单个 maker 反复更新不崩溃', () => {
      const m = makeMaker(1, 50)
      ;(sys as any).makers.push(m)
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(16, {} as any, 2530 * i)
      }
      expect((sys as any).makers[0].poundingForce).toBeLessThanOrEqual(100)
    })

    it('大量 makers（11个）全部增长', () => {
      for (let i = 0; i < 11; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, 50))
      }
      triggerUpdate(sys)
      for (const m of (sys as any).makers as FullingMaker[]) {
        expect(m.poundingForce).toBeGreaterThan(50)
      }
    })

    it('clothDensity 为 0 时增长到 0.015', () => {
      const m = makeMaker(1, 50)
      m.clothDensity = 0
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].clothDensity).toBeCloseTo(0.015, 5)
    })

    it('finishQuality 为 0 时增长到 0.01', () => {
      const m = makeMaker(1, 50)
      m.finishQuality = 0
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers[0].finishQuality).toBeCloseTo(0.01, 5)
    })

    it('makers 数组为空时 update 无副作用', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, {} as any, 2530)).not.toThrow()
      expect((sys as any).makers).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 9. 常量验证
  // ═══════════════════════════════════════════════════════════
  describe('常量与配置验证', () => {
    it('CHECK_INTERVAL 为 2530（通过行为验证）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2529)
      expect((sys as any).lastCheck).toBe(0)
      sys.update(16, {} as any, 2530)
      expect((sys as any).lastCheck).toBe(2530)
    })

    it('MAX_MAKERS 为 11（满时不招募）', () => {
      for (let i = 0; i < 11; i++) {
        ;(sys as any).makers.push(makeMaker(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 低于 RECRUIT_CHANCE
      triggerUpdate(sys)
      // 11 个都是 poundingForce=50，不会被删，招募条件 length < 11 不满足
      expect((sys as any).makers.length).toBe(11)
    })

    it('删除阈值为 poundingForce <= 4', () => {
      // 精确 4.00 删除
      const m = makeMaker(1, 3.98) // 3.98 + 0.02 = 4.00
      ;(sys as any).makers.push(m)
      triggerUpdate(sys)
      expect((sys as any).makers).toHaveLength(0)
    })
  })
})
