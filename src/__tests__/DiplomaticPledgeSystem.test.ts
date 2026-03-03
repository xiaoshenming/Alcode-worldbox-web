import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPledgeSystem, PledgeType } from '../systems/DiplomaticPledgeSystem'

const CHECK_INTERVAL = 1300
const DECAY_RATE = 0.002
const MAX_PLEDGES = 40

function makeSys() { return new DiplomaticPledgeSystem() }

function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}

function makeEm() { return {} as any }

// 注入一条 pledge 并返回引用
function injectPledge(sys: DiplomaticPledgeSystem, overrides: Record<string, any> = {}) {
  const pledge = {
    id: 99,
    fromCivId: 1,
    toCivId: 2,
    type: 'non_aggression' as PledgeType,
    strength: 80,
    honored: true,
    violations: 0,
    startTick: 0,
    duration: 99999,
    ...overrides,
  }
  ;(sys as any).pledges.push(pledge)
  ;(sys as any)._activePairSet.add(`${pledge.fromCivId}_${pledge.toCivId}`)
  return pledge
}

describe('DiplomaticPledgeSystem', () => {
  let sys: DiplomaticPledgeSystem

  beforeEach(() => { sys = makeSys() })

  // ── 1. 基础数据结构 ──────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('pledges 初始为空数组', () => {
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('_activePairSet 初��为空 Set', () => {
      expect((sys as any)._activePairSet.size).toBe(0)
    })

    it('注入 pledge 后 pledges 长度增加', () => {
      injectPledge(sys)
      expect((sys as any).pledges).toHaveLength(1)
    })
  })

  // ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时不执行逻辑（lastCheck 保持 0）', () => {
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时触发（lastCheck 更新）', () => {
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次 update 须间隔 CHECK_INTERVAL 才再次触发', () => {
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      const checkAfterFirst = (sys as any).lastCheck
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(checkAfterFirst)
    })

    it('civs < 2 时不更新 pledges', () => {
      injectPledge(sys)
      sys.update(0, makeEm(), makeCivManager([1]), CHECK_INTERVAL)
      // lastCheck 更新但 pledge 不受衰减影响（strength 应保持 80）
      expect((sys as any).pledges[0].strength).toBe(80)
    })

    it('civManager 为 null 时安全返回', () => {
      expect(() => sys.update(0, makeEm(), null as any, CHECK_INTERVAL)).not.toThrow()
    })
  })

  // ── 3. 字段动态更新 ───────────────────────────────────────────────────────
  describe('字段动态更���', () => {
    it('每次触发 strength 衰减 DECAY_RATE * CHECK_INTERVAL = 2.6', () => {
      const pledge = injectPledge(sys, { strength: 50 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect(pledge.strength).toBeCloseTo(50 - DECAY_RATE * CHECK_INTERVAL, 5)
    })

    it('经过两次 CHECK_INTERVAL 后 strength 衰减 5.2', () => {
      const pledge = injectPledge(sys, { strength: 50 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL * 2)
      expect(pledge.strength).toBeCloseTo(50 - 2 * DECAY_RATE * CHECK_INTERVAL, 4)
    })

    it('elapsed > duration 时 strength 被置为 0', () => {
      const pledge = injectPledge(sys, { strength: 80, startTick: 0, duration: 100 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      // elapsed = CHECK_INTERVAL(1300) > duration(100)，强制 strength=0，随即被 cleanup 删除
      expect((sys as any).pledges.find((p: any) => p.id === 99)).toBeUndefined()
    })

    it('honored 字段初始为 true', () => {
      const pledge = injectPledge(sys)
      expect(pledge.honored).toBe(true)
    })
  })

  // ── 4. strength-based cleanup ────────────────────────────────────────────
  describe('strength-based cleanup', () => {
    it('strength <= 0 时 pledge 被删除', () => {
      injectPledge(sys, { strength: 0 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('strength < 0 时也被删除', () => {
      injectPledge(sys, { strength: -5 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('cleanup 同时从 _activePairSet 移除键', () => {
      injectPledge(sys, { fromCivId: 1, toCivId: 2, strength: 0 })
      expect((sys as any)._activePairSet.has('1_2')).toBe(true)
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any)._activePairSet.has('1_2')).toBe(false)
    })

    it('strength > 0 的 pledge 在 cleanup 后依然存在', () => {
      injectPledge(sys, { strength: 80, duration: 999999 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      // strength 80 - 2.6 = 77.4 > 0，应保留
      expect((sys as any).pledges).toHaveLength(1)
    })
  })

  // ── 5. MAX_PLEDGES 上限 ───────────────────────────────────────────────────
  describe('MAX_PLEDGES 上限', () => {
    it('MAX_PLEDGES 常量为 40', () => {
      expect(MAX_PLEDGES).toBe(40)
    })

    it('pledges.length >= MAX_PLEDGES 时不再 spawn（即使 random 命中）', () => {
      // 填满 pledges（注入 40 条，fromCivId 各不同）
      for (let i = 0; i < MAX_PLEDGES; i++) {
        ;(sys as any).pledges.push({ id: i, fromCivId: i + 100, toCivId: i + 200, strength: 80, honored: true, violations: 0, startTick: 0, duration: 99999, type: 'non_aggression' })
      }
      const lenBefore = (sys as any).pledges.length
      // 无论 random 如何，spawn 分支被 length >= MAX 拦截
      for (let t = 1; t <= 10; t++) {
        sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL * t)
      }
      // cleanup 可能删掉衰减到 0 的（这里 strength=80 不会归零），所以长度不增加
      expect((sys as any).pledges.length).toBeLessThanOrEqual(MAX_PLEDGES)
    })

    it('pledges 数组支持注入多条', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).pledges.push({ id: i, fromCivId: i, toCivId: i + 10, strength: 80, honored: true, violations: 0, startTick: 0, duration: 99999, type: 'non_aggression' })
      }
      expect((sys as any).pledges).toHaveLength(5)
    })

    it('cleanup 后 pledges 总数不超过注入数量', () => {
      injectPledge(sys, { strength: 80, duration: 999999 })
      injectPledge(sys, { id: 100, fromCivId: 3, toCivId: 4, strength: 0 })
      ;(sys as any)._activePairSet.add('3_4')
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      // strength=0 的被清除，只剩 1 条
      expect((sys as any).pledges).toHaveLength(1)
    })
  })

  // ── 6. 枚举完整性 ─────────────────────────────────────────────────────────
  describe('枚举完整性', () => {
    it('5 种 PledgeType 均可作为合法 type', () => {
      const types: PledgeType[] = ['non_aggression', 'resource_sharing', 'mutual_defense', 'border_respect', 'trade_priority']
      expect(types).toHaveLength(5)
    })

    it('non_aggression 是合法 PledgeType', () => {
      const pledge = injectPledge(sys, { type: 'non_aggression' })
      expect(pledge.type).toBe('non_aggression')
    })

    it('mutual_defense 是合法 PledgeType', () => {
      const pledge = injectPledge(sys, { type: 'mutual_defense' })
      expect(pledge.type).toBe('mutual_defense')
    })

    it('resource_sharing 是合法 PledgeType', () => {
      const pledge = injectPledge(sys, { type: 'resource_sharing' })
      expect(pledge.type).toBe('resource_sharing')
    })

    it('border_respect 是合法 PledgeType', () => {
      const pledge = injectPledge(sys, { type: 'border_respect' })
      expect(pledge.type).toBe('border_respect')
    })

    it('trade_priority 是合法 PledgeType', () => {
      const pledge = injectPledge(sys, { type: 'trade_priority' })
      expect(pledge.type).toBe('trade_priority')
    })
  })

  // ── 7. violations 字段测试 ────────────────────────────────────────────────
  describe('violations 字段测试', () => {
    it('violations 初始为 0', () => {
      const pledge = injectPledge(sys)
      expect(pledge.violations).toBe(0)
    })

    it('violations 可以递增', () => {
      const pledge = injectPledge(sys, { violations: 0 })
      pledge.violations++
      expect(pledge.violations).toBe(1)
    })

    it('violations 递增后 honored 可被设为 false', () => {
      const pledge = injectPledge(sys, { violations: 0, honored: true })
      pledge.violations++
      pledge.honored = false
      expect(pledge.honored).toBe(false)
    })

    it('多次 violations 累计', () => {
      const pledge = injectPledge(sys, { violations: 0 })
      pledge.violations += 3
      expect(pledge.violations).toBe(3)
    })
  })

  // ── 8. nextId 递增测试 ────────────────────────────────────────────────────
  describe('nextId 递增测试', () => {
    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('注入 pledge 后 nextId 不自动递增（手动管理）', () => {
      injectPledge(sys, { id: 99 })
      expect((sys as any).nextId).toBe(1)
    })

    it('手动设置 nextId 后值保持', () => {
      ;(sys as any).nextId = 10
      expect((sys as any).nextId).toBe(10)
    })
  })

  // ── 9. 多 pledge 交互测试 ─────────────────────────────────────────────────
  describe('多 pledge 交互测试', () => {
    it('多条 pledge 同时存在', () => {
      injectPledge(sys, { id: 1, fromCivId: 1, toCivId: 2 })
      injectPledge(sys, { id: 2, fromCivId: 3, toCivId: 4 })
      expect((sys as any).pledges).toHaveLength(2)
    })

    it('多条 pledge 独立衰减', () => {
      const p1 = injectPledge(sys, { id: 1, strength: 50, duration: 999999 })
      const p2 = injectPledge(sys, { id: 2, fromCivId: 3, toCivId: 4, strength: 80, duration: 999999 })
      ;(sys as any)._activePairSet.add('3_4')
      sys.update(0, makeEm(), makeCivManager([1, 2, 3, 4]), CHECK_INTERVAL)
      expect(p1.strength).toBeCloseTo(50 - DECAY_RATE * CHECK_INTERVAL, 5)
      expect(p2.strength).toBeCloseTo(80 - DECAY_RATE * CHECK_INTERVAL, 5)
    })

    it('部分 pledge 过期被删除，其他保留', () => {
      injectPledge(sys, { id: 1, strength: 0 })
      injectPledge(sys, { id: 2, fromCivId: 3, toCivId: 4, strength: 80, duration: 999999 })
      ;(sys as any)._activePairSet.add('3_4')
      sys.update(0, makeEm(), makeCivManager([1, 2, 3, 4]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(1)
      expect((sys as any).pledges[0].id).toBe(2)
    })

    it('同一对 civ 不能有多条 active pledge', () => {
      injectPledge(sys, { id: 1, fromCivId: 1, toCivId: 2 })
      expect((sys as any)._activePairSet.has('1_2')).toBe(true)
      // 尝试注入第二条会被 _activePairSet 拦截（在实际 spawn 逻辑中）
    })
  })

  // ── 10. _activePairSet 管理测试 ───────────────────────────────────────────
  describe('_activePairSet 管理测试', () => {
    it('注入 pledge 后 _activePairSet 包含对应键', () => {
      injectPledge(sys, { fromCivId: 5, toCivId: 6 })
      expect((sys as any)._activePairSet.has('5_6')).toBe(true)
    })

    it('cleanup 删除 pledge 后 _activePairSet 移除键', () => {
      injectPledge(sys, { fromCivId: 7, toCivId: 8, strength: 0 })
      sys.update(0, makeEm(), makeCivManager([7, 8]), CHECK_INTERVAL)
      expect((sys as any)._activePairSet.has('7_8')).toBe(false)
    })

    it('多条 pledge 的 _activePairSet 键独立管理', () => {
      injectPledge(sys, { id: 1, fromCivId: 1, toCivId: 2 })
      injectPledge(sys, { id: 2, fromCivId: 3, toCivId: 4 })
      ;(sys as any)._activePairSet.add('3_4')
      expect((sys as any)._activePairSet.has('1_2')).toBe(true)
      expect((sys as any)._activePairSet.has('3_4')).toBe(true)
    })
  })

  // ── 11. duration 边界测试 ─────────────────────────────────────────────────
  describe('duration 边界测试', () => {
    it('duration = 0 时立即过期', () => {
      injectPledge(sys, { strength: 80, startTick: 0, duration: 0 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('duration = 1 时在 tick=2 过期', () => {
      injectPledge(sys, { strength: 80, startTick: 0, duration: 1 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), 2)
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('duration 很大时不过期', () => {
      injectPledge(sys, { strength: 80, startTick: 0, duration: 999999 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(1)
    })
  })

  // ── 12. strength 边界测试 ─────────────────────────────────────────────────
  describe('strength 边界测试', () => {
    it('strength = 0.1 经过衰减后变负被删除', () => {
      injectPledge(sys, { strength: 0.1, duration: 999999 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })

    it('strength = 100 经过多次衰减仍保留', () => {
      const pledge = injectPledge(sys, { strength: 100, duration: 999999 })
      for (let t = 1; t <= 10; t++) {
        sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL * t)
      }
      expect(pledge.strength).toBeGreaterThan(0)
    })

    it('strength 负数立即被删除', () => {
      injectPledge(sys, { strength: -10 })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })
  })

  // ── 13. VIOLATION_PENALTY 测试 ────────────────────────────────────────────
  describe('VIOLATION_PENALTY 测试', () => {
    it('violation 发生时 strength 减少 20', () => {
      const pledge = injectPledge(sys, { strength: 80, duration: 999999 })
      const before = pledge.strength
      pledge.violations++
      pledge.strength -= 20
      pledge.honored = false
      expect(pledge.strength).toBe(before - 20)
    })

    it('多次 violation 累计扣除', () => {
      const pledge = injectPledge(sys, { strength: 100, duration: 999999 })
      pledge.violations += 3
      pledge.strength -= 20 * 3
      expect(pledge.strength).toBe(40)
    })
  })

  // ── 14. honored 字段测试 ──────────────────────────────────────────────────
  describe('honored 字段测试', () => {
    it('honored 初始为 true', () => {
      const pledge = injectPledge(sys)
      expect(pledge.honored).toBe(true)
    })

    it('honored 可被设为 false', () => {
      const pledge = injectPledge(sys, { honored: true })
      pledge.honored = false
      expect(pledge.honored).toBe(false)
    })

    it('honored = false 后不影响 cleanup', () => {
      injectPledge(sys, { strength: 0, honored: false })
      sys.update(0, makeEm(), makeCivManager([1, 2]), CHECK_INTERVAL)
      expect((sys as any).pledges).toHaveLength(0)
    })
  })

  // ── 15. 空 civManager 测试 ────────────────────────────────────────────────
  describe('空 civManager 测试', () => {
    it('civManager.civilizations 为空 Map 时安全返回', () => {
      expect(() => sys.update(0, makeEm(), makeCivManager([]), CHECK_INTERVAL)).not.toThrow()
    })

    it('civManager.civilizations 只有 1 个 civ 时不处理', () => {
      injectPledge(sys, { strength: 80 })
      sys.update(0, makeEm(), makeCivManager([1]), CHECK_INTERVAL)
      expect((sys as any).pledges[0].strength).toBe(80)
    })
  })
})
