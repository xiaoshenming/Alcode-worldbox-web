import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticConcordatSystem } from '../systems/DiplomaticConcordatSystem'
import type { ConcordatProceeding, ConcordatForm } from '../systems/DiplomaticConcordatSystem'

const CHECK_INTERVAL = 2510
const MAX_PROCEEDINGS = 19
const PROCEED_CHANCE = 0.0022
const EXPIRE_TICKS = 89000

function makeSys() { return new DiplomaticConcordatSystem() }
function makeWorld() { return {} as any }
function makeEm() { return {} as any }

function runUpdate(sys: DiplomaticConcordatSystem, tick: number) {
  sys.update(0, makeWorld(), makeEm(), tick)
}

function forceProceeding(
  sys: DiplomaticConcordatSystem,
  overrides: Partial<ConcordatProceeding> = {}
): ConcordatProceeding {
  const p: ConcordatProceeding = {
    id: (sys as any).nextId++,
    civIdA: 1,
    civIdB: 2,
    form: 'trade_concordat',
    bindingStrength: 50,
    complianceRate: 40,
    mutualObligation: 35,
    enforcementLevel: 25,
    duration: 0,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).proceedings.push(p)
  return p
}

describe('DiplomaticConcordatSystem', () => {
  let sys: DiplomaticConcordatSystem

  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ─────────────────────────────────────────────────────────
  describe('1. 基础数据结构', () => {
    beforeEach(() => { sys = makeSys() })

    it('初始 proceedings 为空数组', () => {
      expect((sys as any).proceedings).toHaveLength(0)
    })

    it('proceedings 是数组类型', () => {
      expect(Array.isArray((sys as any).proceedings)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入后 proceedings 长度正确', () => {
      ;(sys as any).proceedings.push({ id: 1 })
      expect((sys as any).proceedings).toHaveLength(1)
    })

    it('ConcordatProceeding 拥有必要字段', () => {
      const p = forceProceeding(sys)
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('form')
      expect(p).toHaveProperty('bindingStrength')
      expect(p).toHaveProperty('complianceRate')
      expect(p).toHaveProperty('mutualObligation')
      expect(p).toHaveProperty('enforcementLevel')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })

    it('form 字段为合法的 ConcordatForm 类型之一', () => {
      const validForms: ConcordatForm[] = [
        'territorial_concordat', 'trade_concordat', 'cultural_concordat', 'military_concordat'
      ]
      const p = forceProceeding(sys, { form: 'trade_concordat' })
      expect(validForms).toContain(p.form)
    })
  })

  // ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────
  describe('2. CHECK_INTERVAL 节流', () => {
    beforeEach(() => { sys = makeSys() })

    it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      runUpdate(sys, CHECK_INTERVAL - 1)
      expect((sys as any).proceedings).toHaveLength(0)
    })

    it('tick === CHECK_INTERVAL 时更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次调用未超过间隔则跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const count = (sys as any).proceedings.length
      runUpdate(sys, CHECK_INTERVAL + 1)
      expect((sys as any).proceedings.length).toBe(count)
    })

    it('两次 tick 均满足间隔时，lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const tick2 = CHECK_INTERVAL * 2
      runUpdate(sys, tick2)
      expect((sys as any).lastCheck).toBe(tick2)
    })

    it('不满足 CHECK_INTERVAL 时 duration 不增加', () => {
      const p = forceProceeding(sys, { duration: 3 })
      runUpdate(sys, CHECK_INTERVAL - 1)
      expect(p.duration).toBe(3)
    })
  })

  // ── 3. 数值字段动态更新 ──────────────────────────────────────────────────
  describe('3. 数值字段动态更新', () => {
    beforeEach(() => { sys = makeSys() })

    it('每次 update 后 duration +1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProceeding(sys, { duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.duration).toBe(1)
    })

    it('bindingStrength 在 [10, 90] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProceeding(sys, { bindingStrength: 50 })
      for (let t = 1; t <= 10; t++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(p.bindingStrength).toBeGreaterThanOrEqual(10)
      expect(p.bindingStrength).toBeLessThanOrEqual(90)
    })

    it('complianceRate 在 [10, 85] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProceeding(sys, { complianceRate: 40 })
      for (let t = 1; t <= 10; t++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(p.complianceRate).toBeGreaterThanOrEqual(10)
      expect(p.complianceRate).toBeLessThanOrEqual(85)
    })

    it('mutualObligation 在 [5, 75] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProceeding(sys, { mutualObligation: 35 })
      for (let t = 1; t <= 10; t++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(p.mutualObligation).toBeGreaterThanOrEqual(5)
      expect(p.mutualObligation).toBeLessThanOrEqual(75)
    })

    it('enforcementLevel 在 [5, 65] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProceeding(sys, { enforcementLevel: 25 })
      for (let t = 1; t <= 10; t++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * t)
      }
      expect(p.enforcementLevel).toBeGreaterThanOrEqual(5)
      expect(p.enforcementLevel).toBeLessThanOrEqual(65)
    })

    it('bindingStrength 不超过上限 90（极端初始值）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1) // 最大偏移
      const p = forceProceeding(sys, { bindingStrength: 89.99 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.bindingStrength).toBeLessThanOrEqual(90)
    })

    it('bindingStrength 不低于下限 10（极端初始值）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最小偏移
      const p = forceProceeding(sys, { bindingStrength: 10.01 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.bindingStrength).toBeGreaterThanOrEqual(10)
    })
  })

  // ── 4. time-based 过期清理 ───────────────────────────────────────────────
  describe('4. time-based 过期清理', () => {
    beforeEach(() => { sys = makeSys() })

    it('tick - p.tick > 89000 时 proceeding 被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProceeding(sys, { tick: 0 })
      const bigTick = EXPIRE_TICKS + 1 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).proceedings).toHaveLength(0)
    })

    it('tick - p.tick <= 89000 时 proceeding 保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProceeding(sys, { tick: CHECK_INTERVAL })
      const safeTick = CHECK_INTERVAL + EXPIRE_TICKS - 1
      ;(sys as any).lastCheck = 0
      runUpdate(sys, safeTick)
      expect((sys as any).proceedings.length).toBeGreaterThanOrEqual(1)
    })

    it('tick 恰好等于 cutoff 时不被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const startTick = CHECK_INTERVAL
      forceProceeding(sys, { tick: startTick })
      // cutoff = currentTick - 89000; proceeding.tick < cutoff => 移除
      // proceeding.tick === cutoff => 不移除
      const currentTick = startTick + EXPIRE_TICKS
      ;(sys as any).lastCheck = 0
      runUpdate(sys, currentTick)
      expect((sys as any).proceedings.length).toBeGreaterThanOrEqual(1)
    })

    it('多条 proceedings 中只移除过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_TICKS + 1 + CHECK_INTERVAL
      forceProceeding(sys, { tick: 0 })              // 旧的：bigTick - 0 > 89000 => 移除
      forceProceeding(sys, { tick: bigTick - 1000 }) // 新的：bigTick - (bigTick-1000) = 1000 < 89000 => 保留
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).proceedings).toHaveLength(1)
    })

    it('全部过期后 proceedings 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProceeding(sys, { tick: 0 })
      forceProceeding(sys, { tick: 100 })
      const bigTick = EXPIRE_TICKS + 1000 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).proceedings).toHaveLength(0)
    })
  })

  // ── 5. MAX_PROCEEDINGS 上限 ──────────────────────────────────────────────
  describe('5. MAX_PROCEEDINGS 上限', () => {
    beforeEach(() => { sys = makeSys() })

    it('proceedings 数量不超过 MAX_PROCEEDINGS', () => {
      for (let i = 0; i < MAX_PROCEEDINGS; i++) {
        forceProceeding(sys, { duration: 0 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发新建分支
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).proceedings.length).toBeLessThanOrEqual(MAX_PROCEEDINGS)
    })

    it('填满后 random=0 不新增 proceeding', () => {
      for (let i = 0; i < MAX_PROCEEDINGS; i++) {
        forceProceeding(sys, { duration: 0 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      // 全部 duration 0->1 仍有效，不超过 MAX
      expect((sys as any).proceedings.length).toBeLessThanOrEqual(MAX_PROCEEDINGS)
    })

    it('未满时 random < PROCEED_CHANCE 可以新增', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(PROCEED_CHANCE - 0.0001) // 触发新建
        .mockReturnValueOnce(0)    // civA => 1
        .mockReturnValueOnce(0.5)  // civB => 5
        .mockReturnValue(0.5)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).proceedings.length).toBeGreaterThanOrEqual(1)
    })

    it('proceedings 已满时即使概率满足也不新增', () => {
      for (let i = 0; i < MAX_PROCEEDINGS; i++) {
        forceProceeding(sys)
      }
      const before = (sys as any).proceedings.length
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).proceedings.length).toBeLessThanOrEqual(before)
    })
  })
})
