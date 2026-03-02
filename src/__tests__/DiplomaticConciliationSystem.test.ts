import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticConciliationSystem } from '../systems/DiplomaticConciliationSystem'
import type { ConciliationProcess, ConciliationPhase } from '../systems/DiplomaticConciliationSystem'

const CHECK_INTERVAL = 2560
const MAX_PROCESSES = 16
const INITIATE_CHANCE = 0.002

function makeSys() { return new DiplomaticConciliationSystem() }
function makeWorld() { return {} as any }
function makeEm() { return {} as any }

function runUpdate(sys: DiplomaticConciliationSystem, tick: number) {
  sys.update(0, makeWorld(), makeEm(), tick)
}

function forceProcess(sys: DiplomaticConciliationSystem, overrides: Partial<ConciliationProcess> = {}): ConciliationProcess {
  const p: ConciliationProcess = {
    id: (sys as any).nextId++,
    civIdA: 1,
    civIdB: 2,
    phase: 'proposal',
    goodwillA: 30,
    goodwillB: 25,
    concessionsExchanged: 0,
    stabilityGain: 0,
    duration: 0,
    tick: 0,
    ...overrides,
  }
  ;(sys as any).processes.push(p)
  return p
}

describe('DiplomaticConciliationSystem', () => {
  let sys: DiplomaticConciliationSystem

  afterEach(() => { vi.restoreAllMocks() })

  // ── 1. 基础数据结构 ─────────────────────────────────────────────────────────
  describe('1. 基础数据结构', () => {
    beforeEach(() => { sys = makeSys() })

    it('初始 processes 为空数组', () => {
      expect((sys as any).processes).toHaveLength(0)
    })

    it('processes 是数组类型', () => {
      expect(Array.isArray((sys as any).processes)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入后 processes 长度正确', () => {
      ;(sys as any).processes.push({ id: 1 })
      expect((sys as any).processes).toHaveLength(1)
    })

    it('ConciliationProcess 拥有必要字段', () => {
      const p = forceProcess(sys)
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('civIdA')
      expect(p).toHaveProperty('civIdB')
      expect(p).toHaveProperty('phase')
      expect(p).toHaveProperty('goodwillA')
      expect(p).toHaveProperty('goodwillB')
      expect(p).toHaveProperty('concessionsExchanged')
      expect(p).toHaveProperty('stabilityGain')
      expect(p).toHaveProperty('duration')
      expect(p).toHaveProperty('tick')
    })

    it('phase 初始值为 proposal', () => {
      const p = forceProcess(sys)
      expect(p.phase).toBe('proposal')
    })
  })

  // ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────
  describe('2. CHECK_INTERVAL 节流', () => {
    beforeEach(() => { sys = makeSys() })

    it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      runUpdate(sys, CHECK_INTERVAL - 1)
      expect((sys as any).processes).toHaveLength(0)
    })

    it('tick === CHECK_INTERVAL 时触发逻辑（lastCheck 更新）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次 tick 未超过间隔则跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const countAfterFirst = (sys as any).processes.length
      runUpdate(sys, CHECK_INTERVAL + 1)
      expect((sys as any).processes.length).toBe(countAfterFirst)
    })

    it('两次 tick 间隔满足时，第二次也能触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      const tick2 = CHECK_INTERVAL * 2
      runUpdate(sys, tick2)
      expect((sys as any).lastCheck).toBe(tick2)
    })

    it('不满足 CHECK_INTERVAL 时 duration 不会增加', () => {
      const p = forceProcess(sys, { duration: 5 })
      runUpdate(sys, CHECK_INTERVAL - 1) // 不触发
      expect(p.duration).toBe(5)
    })
  })

  // ── 3. 数值字段动态更新 ──────────────────────────────────────────────────
  describe('3. 数值字段动态更新', () => {
    beforeEach(() => { sys = makeSys() })

    it('每次 update 后 duration +1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { duration: 0, goodwillA: 30, goodwillB: 30 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.duration).toBe(1)
    })

    it('goodwillA 每 tick 增加 0.03', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.goodwillA).toBeCloseTo(30.03, 5)
    })

    it('goodwillB 每 tick 增加 0.025', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.goodwillB).toBeCloseTo(25.025, 5)
    })

    it('goodwillA 上限被 min(100,...) 限制', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { goodwillA: 99.99, goodwillB: 30, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.goodwillA).toBeLessThanOrEqual(100)
    })

    it('proposal -> negotiation 当 goodwillA > 40', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // goodwillA=41 直接满足阈值
      const p = forceProcess(sys, { phase: 'proposal', goodwillA: 41, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.phase).toBe('negotiation')
    })

    it('proposal 阶段 goodwillA <= 40 不升阶', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      // 30+0.03=30.03 仍 <=40
      expect(p.phase).toBe('proposal')
    })

    it('negotiation -> resolution 当 goodwillB > 55，concessionsExchanged+1 stabilityGain+5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, {
        phase: 'negotiation',
        goodwillA: 50,
        goodwillB: 56,
        concessionsExchanged: 0,
        stabilityGain: 0,
        duration: 0,
      })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.phase).toBe('resolution')
      expect(p.concessionsExchanged).toBe(1)
      expect(p.stabilityGain).toBe(5)
    })

    it('goodwillA < 10 触发 collapsed', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { phase: 'proposal', goodwillA: 5, goodwillB: 30, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.phase).toBe('collapsed')
    })

    it('goodwillB < 10 触发 collapsed', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 5, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect(p.phase).toBe('collapsed')
    })
  })

  // ── 4. 过期 / collapsed 清理 ─────────────────────────────────────────────
  describe('4. 过期与 collapsed 清理', () => {
    beforeEach(() => { sys = makeSys() })

    it('collapsed 状态的 process 被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProcess(sys, { phase: 'collapsed', goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes).toHaveLength(0)
    })

    it('duration >= 200 的 process 被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 25, duration: 199 })
      runUpdate(sys, CHECK_INTERVAL)
      // duration 在 update 中变为 200，不满足 duration<200，被清理
      expect((sys as any).processes).toHaveLength(0)
    })

    it('duration < 200 且非 collapsed 的 process 保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes).toHaveLength(1)
    })

    it('多条 process 中只删除 collapsed/超期的', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      forceProcess(sys, { phase: 'resolution', goodwillA: 50, goodwillB: 60, duration: 0 })
      forceProcess(sys, { phase: 'collapsed', goodwillA: 30, goodwillB: 25, duration: 0 })
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes).toHaveLength(1)
      expect((sys as any).processes[0].phase).toBe('resolution')
    })

    it('duration 恰好为 199 时更新后为 200 被清理', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const p = forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 25, duration: 199 })
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes.includes(p)).toBe(false)
    })
  })

  // ── 5. MAX_PROCESSES 上限 ────────────────────────────────────────────────
  describe('5. MAX_PROCESSES 上限', () => {
    beforeEach(() => { sys = makeSys() })

    it('processes 数量不超过 MAX_PROCESSES', () => {
      // 预填满 MAX_PROCESSES 条记录
      for (let i = 0; i < MAX_PROCESSES; i++) {
        forceProcess(sys, { phase: 'proposal', goodwillA: 30, goodwillB: 25, duration: 0 })
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 触发新建逻辑
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes.length).toBeLessThanOrEqual(MAX_PROCESSES)
    })

    it('填满后即使 random=0 也不新增', () => {
      for (let i = 0; i < MAX_PROCESSES; i++) {
        forceProcess(sys, { phase: 'proposal', goodwillA: 50, goodwillB: 50, duration: 0 })
      }
      const before = (sys as any).processes.length
      vi.spyOn(Math, 'random').mockReturnValue(0)
      runUpdate(sys, CHECK_INTERVAL)
      // 新增被阻断，数量等于清理后剩余（duration 增长后 50 条 duration=0->1，仍满足 <200）
      expect((sys as any).processes.length).toBeLessThanOrEqual(MAX_PROCESSES)
    })

    it('processes 未满时 random < INITIATE_CHANCE 可以新增', () => {
      // 链式 mock：第1次触发概率，第2/3次决定 civA/civB，之后全为 0.5
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(INITIATE_CHANCE - 0.0001) // 触发新建
        .mockReturnValueOnce(0)    // civA index 0 => civA=1
        .mockReturnValueOnce(0.5)  // civB index 4 => civB=5
        .mockReturnValue(0.5)      // goodwillA/B 等
      runUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).processes.length).toBeGreaterThanOrEqual(1)
    })
  })
})
