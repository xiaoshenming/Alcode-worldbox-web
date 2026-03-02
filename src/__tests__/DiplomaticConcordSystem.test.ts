import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticConcordSystem } from '../systems/DiplomaticConcordSystem'
import type { ConcordTreaty, ConcordPillar } from '../systems/DiplomaticConcordSystem'

const CHECK_INTERVAL = 2340
const MAX_TREATIES = 20
const TREATY_CHANCE = 0.0027
const EXPIRE_TICKS = 85000

function makeSys() { return new DiplomaticConcordSystem() }
function makeWorld() { return {} as any }
function makeEm() { return {} as any }

function runUpdate(sys: DiplomaticConcordSystem, tick: number) {
  sys.update(0, makeWorld(), makeEm(), tick)
}

function forceTreaty(
  sys: DiplomaticConcordSystem,
  overrides: Partial<ConcordTreaty> = {}
): ConcordTreaty {
  const t: ConcordTreaty = {
    id: (sys as any).nextId++,
    civIdA: 1,
    civIdB: 2,
    pillar: 'peace',
    harmonyLevel: 40,
    cooperationIndex: 30,
    peaceStability: 50,
    culturalUnity: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).treaties.push(t)
  return t
}

describe('DiplomaticConcordSystem', () => {
  let sys: DiplomaticConcordSystem

  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ─────────────────────────────────────────────────────────
  describe('1. 基础数据结构', () => {
    beforeEach(() => { sys = makeSys() })

    it('初始 treaties 为空数组', () => {
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('treaties 是数组类型', () => {
      expect(Array.isArray((sys as any).treaties)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入后 treaties 长度正确', () => {
      ;(sys as any).treaties.push({ id: 1 })
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('ConcordTreaty 拥有必要字段', () => {
      const t = forceTreaty(sys)
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('civIdA')
      expect(t).toHaveProperty('civIdB')
      expect(t).toHaveProperty('pillar')
      expect(t).toHaveProperty('harmonyLevel')
      expect(t).toHaveProperty('cooperationIndex')
      expect(t).toHaveProperty('peaceStability')
      expect(t).toHaveProperty('culturalUnity')
      expect(t).toHaveProperty('duration')
      expect(t).toHaveProperty('tick')
    })

    it('pillar 字段为合法的 ConcordPillar 类型之一', () => {
      const validPillars: ConcordPillar[] = ['peace', 'prosperity', 'justice', 'unity']
      const t = forceTreaty(sys, { pillar: 'peace' })
      expect(validPillars).toContain(t.pillar)
    })
  })

  // ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────
  describe('2. CHECK_INTERVAL 节流', () => {
    beforeEach(() => { sys = makeSys() })

    it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      runUpdate(sys, CHECK_INTERVAL - 1)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('tick === CHECK_INTERVAL 时更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次调用未超过间隔则跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const count = (sys as any).treaties.length
      runUpdate(sys, CHECK_INTERVAL + 1)
      expect((sys as any).treaties.length).toBe(count)
    })

    it('两次 tick 均满足间隔时，lastCheck 更新到最新 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const tick2 = CHECK_INTERVAL * 2
      runUpdate(sys, tick2)
      expect((sys as any).lastCheck).toBe(tick2)
    })

    it('不满足 CHECK_INTERVAL 时 duration 不增加', () => {
      const t = forceTreaty(sys, { duration: 7 })
      runUpdate(sys, CHECK_INTERVAL - 1)
      expect(t.duration).toBe(7)
    })
  })

  // ── 3. 数值字段动态更新 ──────────────────────────────────────────────────
  describe('3. 数值字段动态更新', () => {
    beforeEach(() => { sys = makeSys() })

    it('每次 update 后 duration +1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const t = forceTreaty(sys, { duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(t.duration).toBe(1)
    })

    it('harmonyLevel 在 [10, 90] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const t = forceTreaty(sys, { harmonyLevel: 40 })
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * i)
      }
      expect(t.harmonyLevel).toBeGreaterThanOrEqual(10)
      expect(t.harmonyLevel).toBeLessThanOrEqual(90)
    })

    it('cooperationIndex 在 [5, 80] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const t = forceTreaty(sys, { cooperationIndex: 30 })
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * i)
      }
      expect(t.cooperationIndex).toBeGreaterThanOrEqual(5)
      expect(t.cooperationIndex).toBeLessThanOrEqual(80)
    })

    it('peaceStability 在 [10, 90] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const t = forceTreaty(sys, { peaceStability: 50 })
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * i)
      }
      expect(t.peaceStability).toBeGreaterThanOrEqual(10)
      expect(t.peaceStability).toBeLessThanOrEqual(90)
    })

    it('culturalUnity 在 [5, 70] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const t = forceTreaty(sys, { culturalUnity: 20 })
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).lastCheck = 0
        runUpdate(sys, CHECK_INTERVAL * i)
      }
      expect(t.culturalUnity).toBeGreaterThanOrEqual(5)
      expect(t.culturalUnity).toBeLessThanOrEqual(70)
    })

    it('harmonyLevel 不超过上限 90（极端初始值）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const t = forceTreaty(sys, { harmonyLevel: 89.99 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(t.harmonyLevel).toBeLessThanOrEqual(90)
    })

    it('harmonyLevel 不低于下限 10（极端初始值）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const t = forceTreaty(sys, { harmonyLevel: 10.01 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(t.harmonyLevel).toBeGreaterThanOrEqual(10)
    })

    it('peaceStability 不低于下限 10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const t = forceTreaty(sys, { peaceStability: 10.01 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(t.peaceStability).toBeGreaterThanOrEqual(10)
    })
  })

  // ── 4. time-based 过期清理 ───────────────────────────────────────────────
  describe('4. time-based 过期清理', () => {
    beforeEach(() => { sys = makeSys() })

    it('tick - treaty.tick > 85000 时条约被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceTreaty(sys, { tick: 0 })
      const bigTick = EXPIRE_TICKS + 1 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })

    it('tick - treaty.tick <= 85000 时条约保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceTreaty(sys, { tick: CHECK_INTERVAL })
      const safeTick = CHECK_INTERVAL + EXPIRE_TICKS - 1
      ;(sys as any).lastCheck = 0
      runUpdate(sys, safeTick)
      expect((sys as any).treaties.length).toBeGreaterThanOrEqual(1)
    })

    it('tick 恰好等于 cutoff 时条约不被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const startTick = CHECK_INTERVAL
      forceTreaty(sys, { tick: startTick })
      // cutoff = currentTick - 85000; treaty.tick < cutoff => 移除
      // treaty.tick === cutoff => 不移除
      const currentTick = startTick + EXPIRE_TICKS
      ;(sys as any).lastCheck = 0
      runUpdate(sys, currentTick)
      expect((sys as any).treaties.length).toBeGreaterThanOrEqual(1)
    })

    it('多条条约中只移除过期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const bigTick = EXPIRE_TICKS + 1 + CHECK_INTERVAL
      forceTreaty(sys, { tick: 0 })              // 旧的：bigTick - 0 > 85000 => 移除
      forceTreaty(sys, { tick: bigTick - 1000 }) // 新的：bigTick - (bigTick-1000) = 1000 < 85000 => 保留
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).treaties).toHaveLength(1)
    })

    it('全部过期后 treaties 清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceTreaty(sys, { tick: 0 })
      forceTreaty(sys, { tick: 100 })
      const bigTick = EXPIRE_TICKS + 2000 + CHECK_INTERVAL
      ;(sys as any).lastCheck = 0
      runUpdate(sys, bigTick)
      expect((sys as any).treaties).toHaveLength(0)
    })
  })

  // ── 5. MAX_TREATIES 上限 ─────────────────────────────────────────────────
  describe('5. MAX_TREATIES 上限', () => {
    beforeEach(() => { sys = makeSys() })

    it('treaties 数量不超过 MAX_TREATIES', () => {
      for (let i = 0; i < MAX_TREATIES; i++) {
        forceTreaty(sys, { duration: 0 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(MAX_TREATIES)
    })

    it('填满后 random=0 不新增条约', () => {
      for (let i = 0; i < MAX_TREATIES; i++) {
        forceTreaty(sys, { duration: 0 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(MAX_TREATIES)
    })

    it('未满时 random < TREATY_CHANCE 可以新增', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(TREATY_CHANCE - 0.0001) // 触发新建
        .mockReturnValueOnce(0)    // civA => 1
        .mockReturnValueOnce(0.5)  // civB => 5
        .mockReturnValue(0.5)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeGreaterThanOrEqual(1)
    })

    it('treaties 已满时即使概率满足也不新增', () => {
      for (let i = 0; i < MAX_TREATIES; i++) {
        forceTreaty(sys)
      }
      const before = (sys as any).treaties.length
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).treaties.length).toBeLessThanOrEqual(before)
    })

    it('random >= TREATY_CHANCE 时不新增条约', () => {
      vi.spyOn(Math, 'random').mockReturnValue(TREATY_CHANCE + 0.001)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).treaties).toHaveLength(0)
    })
  })
})
