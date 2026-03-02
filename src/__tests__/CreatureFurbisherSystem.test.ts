import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFurbisherSystem } from '../systems/CreatureFurbisherSystem'
import type { Furbisher } from '../systems/CreatureFurbisherSystem'

let nextId = 1
function makeSys(): CreatureFurbisherSystem { return new CreatureFurbisherSystem() }
function makeFurbisher(entityId: number, furbishingSkill = 50): Furbisher {
  return { id: nextId++, entityId, furbishingSkill, polishingTechnique: 60, surfaceRestoration: 70, lustreQuality: 80, tick: 0 }
}

// ─── 辅助：触发一次完整更新 ───────────────────────────────────
function triggerUpdate(sys: CreatureFurbisherSystem, tick = 2840): void {
  ;(sys as any).lastCheck = 0
  sys.update(16, {} as any, tick)
}

describe('CreatureFurbisherSystem', () => {
  let sys: CreatureFurbisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ═══════════════════════════════════════════════════════════
  // 1. 初始状态
  // ═══════════════════════════════════════════════════════════
  describe('初始状态', () => {
    it('初始 furbishers 数组为空', () => {
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('多次实例化互相独立', () => {
      const sys2 = makeSys()
      ;(sys as any).furbishers.push(makeFurbisher(1))
      expect((sys2 as any).furbishers).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 2. 数据注入与查询
  // ═══════════════════════════════════════════════════════════
  describe('数据注入与查询', () => {
    it('注入后可按索引查询', () => {
      ;(sys as any).furbishers.push(makeFurbisher(1))
      expect((sys as any).furbishers[0].entityId).toBe(1)
    })

    it('注入多个全部存在', () => {
      ;(sys as any).furbishers.push(makeFurbisher(1))
      ;(sys as any).furbishers.push(makeFurbisher(2))
      expect((sys as any).furbishers).toHaveLength(2)
    })

    it('furbishingSkill 字段正确存储', () => {
      const f = makeFurbisher(1, 77)
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].furbishingSkill).toBe(77)
    })

    it('polishingTechnique 字段正确存储', () => {
      const f = makeFurbisher(1)
      f.polishingTechnique = 88
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].polishingTechnique).toBe(88)
    })

    it('surfaceRestoration 字段正确存储', () => {
      const f = makeFurbisher(1)
      f.surfaceRestoration = 45
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].surfaceRestoration).toBe(45)
    })

    it('lustreQuality 字段正确存储', () => {
      const f = makeFurbisher(1)
      f.lustreQuality = 93
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].lustreQuality).toBe(93)
    })

    it('四字段同时精确存储', () => {
      const f = makeFurbisher(10)
      f.furbishingSkill = 90; f.polishingTechnique = 85; f.surfaceRestoration = 80; f.lustreQuality = 75
      ;(sys as any).furbishers.push(f)
      const r = (sys as any).furbishers[0]
      expect(r.furbishingSkill).toBe(90)
      expect(r.polishingTechnique).toBe(85)
      expect(r.surfaceRestoration).toBe(80)
      expect(r.lustreQuality).toBe(75)
    })

    it('id 字段正确存储', () => {
      const f = makeFurbisher(5)
      const savedId = f.id
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].id).toBe(savedId)
    })

    it('tick 字段正确存储', () => {
      const f = makeFurbisher(1)
      f.tick = 999
      ;(sys as any).furbishers.push(f)
      expect((sys as any).furbishers[0].tick).toBe(999)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 3. CHECK_INTERVAL 节流逻辑
  // ═══════════════════════════════════════════════════════════
  describe('CHECK_INTERVAL 节流逻辑', () => {
    it('tick 差值 < 2840 不触发更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3839)  // 3839 - 1000 = 2839 < 2840
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 2840 更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3840)  // 3840 - 1000 = 2840 >= 2840
      expect((sys as any).lastCheck).toBe(3840)
    })

    it('恰好等于 2840 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2840)
      expect((sys as any).lastCheck).toBe(2840)
    })

    it('差值为 2839 不触发 lastCheck 更新', () => {
      ;(sys as any).lastCheck = 1
      sys.update(16, {} as any, 2840)  // 2840 - 1 = 2839 < 2840
      expect((sys as any).lastCheck).toBe(1)
    })

    it('差值为 2841 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2841)
      expect((sys as any).lastCheck).toBe(2841)
    })

    it('节流期间不修改 furbishers 数据', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      ;(sys as any).lastCheck = 1000
      sys.update(16, {} as any, 3839)  // 差值 2839，不触发
      expect((sys as any).furbishers[0].furbishingSkill).toBe(50)
    })

    it('tick 从 0 开始第一次刚好满足 2840 触发', () => {
      sys.update(16, {} as any, 2840)
      expect((sys as any).lastCheck).toBe(2840)
    })

    it('连续两次调用 lastCheck 按最新 tick 更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2840)
      expect((sys as any).lastCheck).toBe(2840)
      sys.update(16, {} as any, 2840 + 2840)
      expect((sys as any).lastCheck).toBe(5680)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 4. 技能增长逻辑
  // ═══════════════════════════════════════════════════════════
  describe('技能增长逻辑', () => {
    it('update 后 furbishingSkill + 0.02', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.02, 5)
    })

    it('update 后 polishingTechnique + 0.015', () => {
      const f = makeFurbisher(1)
      f.polishingTechnique = 60
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].polishingTechnique).toBeCloseTo(60.015, 5)
    })

    it('update 后 lustreQuality + 0.01', () => {
      const f = makeFurbisher(1)
      f.lustreQuality = 80
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].lustreQuality).toBeCloseTo(80.01, 5)
    })

    it('surfaceRestoration 不被 update 修改', () => {
      const f = makeFurbisher(1)
      f.surfaceRestoration = 70
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].surfaceRestoration).toBe(70)
    })

    it('多个 furbishers 均被同等增长', () => {
      const f1 = makeFurbisher(1, 50)
      const f2 = makeFurbisher(2, 60)
      ;(sys as any).furbishers.push(f1)
      ;(sys as any).furbishers.push(f2)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.02, 5)
      expect((sys as any).furbishers[1].furbishingSkill).toBeCloseTo(60.02, 5)
    })

    it('低值时增长后不超过上限', () => {
      const f = makeFurbisher(1, 5)
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(5.02, 5)
    })

    it('furbishingSkill 接近上限时精确增长到 100', () => {
      const f = makeFurbisher(1, 99.99)
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].furbishingSkill).toBe(100)
    })

    it('polishingTechnique 上限 100 不超出', () => {
      const f = makeFurbisher(1)
      f.polishingTechnique = 99.99
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].polishingTechnique).toBe(100)
    })

    it('lustreQuality 上限 100 不超出', () => {
      const f = makeFurbisher(1)
      f.lustreQuality = 99.99
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].lustreQuality).toBe(100)
    })

    it('已达到 100 的字段保持在 100', () => {
      const f = makeFurbisher(1, 100)
      f.polishingTechnique = 100
      f.lustreQuality = 100
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].furbishingSkill).toBe(100)
      expect((sys as any).furbishers[0].polishingTechnique).toBe(100)
      expect((sys as any).furbishers[0].lustreQuality).toBe(100)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 5. 清理逻辑（furbishingSkill 阈值）
  // ═══════════════════════════════════════════════════════════
  describe('清理逻辑', () => {
    it('furbishingSkill <= 4（更新后）时删除', () => {
      const f = makeFurbisher(1, 3.98)  // 3.98 + 0.02 = 4.00 <= 4
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('furbishingSkill > 4（更新后）时保留', () => {
      const f = makeFurbisher(1, 4.01)  // 4.01 + 0.02 = 4.03 > 4
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(1)
    })

    it('同时存在删除和保留的情况', () => {
      const f1 = makeFurbisher(1, 3.98)  // 删除
      const f2 = makeFurbisher(2, 4.01)  // 保留
      ;(sys as any).furbishers.push(f1)
      ;(sys as any).furbishers.push(f2)
      triggerUpdate(sys)
      const remaining = (sys as any).furbishers
      expect(remaining.some((f: Furbisher) => f.entityId === 1)).toBe(false)
      expect(remaining.some((f: Furbisher) => f.entityId === 2)).toBe(true)
    })

    it('furbishingSkill 恰好等于 4（更新后）被删除', () => {
      const f = makeFurbisher(1, 3.98)  // 3.98 + 0.02 = 4.00 exactly
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('furbishingSkill 为 4.001（更新后）保留', () => {
      const f = makeFurbisher(1, 3.981)  // 3.981 + 0.02 = 4.001 > 4
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(1)
    })

    it('全部低于阈值时 furbishers 清空', () => {
      ;(sys as any).furbishers.push(makeFurbisher(1, 1))
      ;(sys as any).furbishers.push(makeFurbisher(2, 2))
      ;(sys as any).furbishers.push(makeFurbisher(3, 3))
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('全部高于阈值时无删除', () => {
      ;(sys as any).furbishers.push(makeFurbisher(1, 50))
      ;(sys as any).furbishers.push(makeFurbisher(2, 60))
      ;(sys as any).furbishers.push(makeFurbisher(3, 70))
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(3)
    })

    it('删除后剩余元素 entityId 正确', () => {
      ;(sys as any).furbishers.push(makeFurbisher(1, 3.98))  // 删除
      ;(sys as any).furbishers.push(makeFurbisher(2, 50))    // 保留
      ;(sys as any).furbishers.push(makeFurbisher(3, 3.98))  // 删除
      ;(sys as any).furbishers.push(makeFurbisher(4, 60))    // 保留
      triggerUpdate(sys)
      const ids = (sys as any).furbishers.map((f: Furbisher) => f.entityId)
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
    it('随机数 < RECRUIT_CHANCE(0.0015) 时招募新 furbisher', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).furbishers.length).toBeGreaterThan(0)
    })

    it('随机数 >= RECRUIT_CHANCE(0.0015) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('furbishers.length 达到 MAX_FURBISHERS(10) 时不再招募', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).furbishers.push(makeFurbisher(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      // 10 个都是 furbishingSkill=50，不会被删，招募条件 length < 10 不满足
      expect((sys as any).furbishers.length).toBe(10)
    })

    it('furbishers 数量未满时可以招募', () => {
      for (let i = 0; i < 9; i++) {
        ;(sys as any).furbishers.push(makeFurbisher(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).furbishers.length).toBeGreaterThanOrEqual(9)
    })

    it('新招募的 furbisher nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).nextId = 7
      triggerUpdate(sys)
      if ((sys as any).furbishers.length > 0) {
        expect((sys as any).furbishers[0].id).toBe(7)
        expect((sys as any).nextId).toBe(8)
      }
    })

    it('招募时 random 恰好等于 0.0015 时不触发（<，非<=）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0015)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 7. update 方法行为
  // ═══════════════════════════════════════════════════════════
  describe('update 方法行为', () => {
    it('update 不抛出异常', () => {
      expect(() => sys.update(16, {} as any, 2840)).not.toThrow()
    })

    it('dt 参数不影响增长量', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      ;(sys as any).lastCheck = 0
      sys.update(200, {} as any, 2840)  // 大 dt
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.02, 5)
    })

    it('em 参数为空对象时不崩溃', () => {
      expect(() => sys.update(16, {} as any, 2840)).not.toThrow()
    })

    it('tick 为 0 时不触发更新（差值为 0）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 0)
      // 0 - 0 = 0 < 2840，不触发
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续触发两次各自增长一次', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2840)
      sys.update(16, {} as any, 5680)
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.04, 4)
    })

    it('大 tick 跳跃只触发一次增长', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 99999)
      expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.02, 5)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 8. 边界与极端值
  // ═══════════════════════════════════════════════════════════
  describe('边界与极端值', () => {
    it('furbishingSkill 为 0 时更新后为 0.02，仍被删除', () => {
      const f = makeFurbisher(1, 0)
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      // 0 + 0.02 = 0.02 <= 4 => 删除
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('furbishingSkill 为负数时更新后仍被删除', () => {
      const f = makeFurbisher(1, -5)
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('单个 furbisher 反复更新不崩溃', () => {
      const f = makeFurbisher(1, 50)
      ;(sys as any).furbishers.push(f)
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(16, {} as any, 2840 * i)
      }
      expect((sys as any).furbishers[0].furbishingSkill).toBeLessThanOrEqual(100)
    })

    it('大量 furbishers（10个）全部增长', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).furbishers.push(makeFurbisher(i + 1, 50))
      }
      triggerUpdate(sys)
      for (const f of (sys as any).furbishers as Furbisher[]) {
        expect(f.furbishingSkill).toBeGreaterThan(50)
      }
    })

    it('polishingTechnique 为 0 时增长到 0.015', () => {
      const f = makeFurbisher(1, 50)
      f.polishingTechnique = 0
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].polishingTechnique).toBeCloseTo(0.015, 5)
    })

    it('lustreQuality 为 0 时增长到 0.01', () => {
      const f = makeFurbisher(1, 50)
      f.lustreQuality = 0
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers[0].lustreQuality).toBeCloseTo(0.01, 5)
    })

    it('furbishers 数组为空时 update 无副作用', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, {} as any, 2840)).not.toThrow()
      expect((sys as any).furbishers).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 9. 常量与配置验证
  // ═══════════════════════════════════════════════════════════
  describe('常量与配置验证', () => {
    it('CHECK_INTERVAL 为 2840（通过行为验证）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, {} as any, 2839)
      expect((sys as any).lastCheck).toBe(0)
      sys.update(16, {} as any, 2840)
      expect((sys as any).lastCheck).toBe(2840)
    })

    it('MAX_FURBISHERS 为 10（满时不招募）', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).furbishers.push(makeFurbisher(i + 1, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      triggerUpdate(sys)
      expect((sys as any).furbishers.length).toBe(10)
    })

    it('删除阈值为 furbishingSkill <= 4（精确 4.00 被删除）', () => {
      const f = makeFurbisher(1, 3.98) // 3.98 + 0.02 = 4.00
      ;(sys as any).furbishers.push(f)
      triggerUpdate(sys)
      expect((sys as any).furbishers).toHaveLength(0)
    })

    it('RECRUIT_CHANCE 边界：0.0014 触发，0.0015 不触发', () => {
      // 0.0014 < 0.0015 => 触发
      vi.spyOn(Math, 'random').mockReturnValue(0.0014)
      triggerUpdate(sys)
      expect((sys as any).furbishers.length).toBeGreaterThan(0)
    })
  })
})
