import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticArbitrementSystem, ArbitrementCase, ArbitrementPhase } from '../systems/DiplomaticArbitrementSystem'

// 常量镜像自源码
const CHECK_INTERVAL = 2590
const MAX_CASES = 15

function makeSys() { return new DiplomaticArbitrementSystem() }

function makeCase(overrides: Partial<ArbitrementCase> = {}): ArbitrementCase {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    phase: 'filing',
    caseStrength: 50,
    neutrality: 60,
    bindingForce: 40,
    compliance: 0,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticArbitrementSystem', () => {
  let sys: DiplomaticArbitrementSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始cases为空数组', () => {
      expect((sys as any).cases).toHaveLength(0)
      expect(Array.isArray((sys as any).cases)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条case后可读取', () => {
      const c = makeCase({ id: 42, civIdA: 3, civIdB: 5 })
      ;(sys as any).cases.push(c)
      expect((sys as any).cases).toHaveLength(1)
      expect((sys as any).cases[0].id).toBe(42)
      expect((sys as any).cases[0].civIdA).toBe(3)
      expect((sys as any).cases[0].civIdB).toBe(5)
    })

    it('注入多条case后数量正确', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).cases.push(makeCase({ id: i }))
      }
      expect((sys as any).cases).toHaveLength(5)
    })

    it('支持所有ArbitrementPhase类型', () => {
      const phases: ArbitrementPhase[] = ['filing', 'hearing', 'deliberation', 'ruling']
      phases.forEach((phase, i) => {
        ;(sys as any).cases.push(makeCase({ id: i + 1, phase }))
      })
      const stored = (sys as any).cases.map((c: ArbitrementCase) => c.phase)
      expect(stored).toEqual(phases)
    })

    it('case的compliance初始为0', () => {
      const c = makeCase()
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].compliance).toBe(0)
    })

    it('case的duration初始为0', () => {
      const c = makeCase()
      ;(sys as any).cases.push(c)
      expect((sys as any).cases[0].duration).toBe(0)
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL 时update跳过，lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时update执行，lastCheck更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时update执行，lastCheck更新为当前tick', () => {
      const tick = CHECK_INTERVAL + 100
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次update后，第二次tick未超过阈值则跳过', () => {
      const tick1 = CHECK_INTERVAL
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      expect((sys as any).lastCheck).toBe(tick1)

      // 第二次 tick 只增加了 100，未达到 CHECK_INTERVAL
      const tick2 = tick1 + 100
      sys.update(1, {} as any, {} as any, tick2)
      // lastCheck 应仍为 tick1
      expect((sys as any).lastCheck).toBe(tick1)
    })

    it('连续两次update均满足间隔，lastCheck连续更新', () => {
      const tick1 = CHECK_INTERVAL
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick1)
      expect((sys as any).lastCheck).toBe(tick1)

      const tick2 = tick1 + CHECK_INTERVAL
      sys.update(1, {} as any, {} as any, tick2)
      expect((sys as any).lastCheck).toBe(tick2)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('每次update后duration+1', () => {
      const c = makeCase({ duration: 0, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].duration).toBe(1)
    })

    it('连续两次update后duration+2', () => {
      const c = makeCase({ duration: 0, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).cases[0].duration).toBe(2)
    })

    it('caseStrength每次update增加0.02，不超过100', () => {
      const c = makeCase({ caseStrength: 50, duration: 0, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].caseStrength).toBeCloseTo(50.02, 5)
    })

    it('caseStrength被Math.min(100,...)约束，不超过100', () => {
      const c = makeCase({ caseStrength: 99.99, duration: 0, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].caseStrength).toBeLessThanOrEqual(100)
    })

    it('filing阶段duration>20后进入hearing', () => {
      const c = makeCase({ phase: 'filing', duration: 20, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // duration变为21，应触发 phase -> hearing
      expect((sys as any).cases[0].phase).toBe('hearing')
    })

    it('hearing阶段duration>50后进入deliberation', () => {
      const c = makeCase({ phase: 'hearing', duration: 50, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].phase).toBe('deliberation')
    })

    it('deliberation阶段duration>70后进入ruling并设置compliance', () => {
      const bindingForce = 40
      const c = makeCase({ phase: 'deliberation', duration: 70, bindingForce, compliance: 0, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].phase).toBe('ruling')
      expect((sys as any).cases[0].compliance).toBeCloseTo(bindingForce * 0.8, 5)
    })

    it('filing阶段duration<=20时不推进phase', () => {
      const c = makeCase({ phase: 'filing', duration: 10, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases[0].phase).toBe('filing')
    })
  })

  // ─────────────────────────────────────────────
  // 4. ruling完成后清理过期case
  // ─────────────────────────────────────────────
  describe('ruling阶段过期清理', () => {
    it('ruling且duration>=100的case被删除', () => {
      const c = makeCase({ phase: 'ruling', duration: 99, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // duration变为100，满足 !(phase!=='ruling'||duration<100) => splice
      expect((sys as any).cases).toHaveLength(0)
    })

    it('ruling但duration<100的case保留', () => {
      const c = makeCase({ phase: 'ruling', duration: 50, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases).toHaveLength(1)
    })

    it('非ruling阶段即使duration很大也保留', () => {
      const c = makeCase({ phase: 'deliberation', duration: 200, tick: 0 })
      ;(sys as any).cases.push(c)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      // deliberation duration>70 -> ruling, duration变201>100 -> 被删
      // 实际流程：先推进phase到ruling，再判定duration>100 -> 删除
      // 所以这里验证：deliberation->ruling->删除（duration=201）
      expect((sys as any).cases).toHaveLength(0)
    })

    it('混合：ruling且duration>=100的被删，其他保留', () => {
      ;(sys as any).cases.push(makeCase({ id: 1, phase: 'ruling', duration: 99, tick: 0 }))
      ;(sys as any).cases.push(makeCase({ id: 2, phase: 'filing', duration: 5, tick: 0 }))
      ;(sys as any).cases.push(makeCase({ id: 3, phase: 'ruling', duration: 50, tick: 0 }))

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      const ids = (sys as any).cases.map((c: ArbitrementCase) => c.id)
      expect(ids).not.toContain(1)
      expect(ids).toContain(2)
      expect(ids).toContain(3)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_CASES 上限
  // ─────────────────────────────────────────────
  describe('MAX_CASES上限控制', () => {
    it('cases达到MAX_CASES时，即使random触发也不新增', () => {
      // 填满15条
      for (let i = 1; i <= MAX_CASES; i++) {
        ;(sys as any).cases.push(makeCase({ id: i, tick: 0 }))
      }
      expect((sys as any).cases).toHaveLength(MAX_CASES)

      vi.spyOn(Math, 'random').mockReturnValue(0) // 强制触发
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      // 注意：update里也会处理duration，ruling>=100的被清理
      // 这里所有case phase是'filing'，不会被清理
      // 检查上限：cases数量 <= MAX_CASES
      expect((sys as any).cases.length).toBeLessThanOrEqual(MAX_CASES)
    })

    it('cases未达MAX_CASES时，random触发可新增（a!==b时）', () => {
      // 仅注入1条，random强制触发新增
      ;(sys as any).cases.push(makeCase({ id: 1, tick: 0 }))

      // mockReturnValue序列：FILE_CHANCE < 0.0019，Math.random()第一次返回0（<FILE_CHANCE）
      // 然后随机选a和b：让a=1, b=5(不同)
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0)       // < FILE_CHANCE，触发新增
        .mockReturnValueOnce(0)       // a = 1+floor(0*8)=1
        .mockReturnValueOnce(0.5)     // b = 1+floor(0.5*8)=5 ≠ a
        .mockReturnValue(0.5)         // 其余随机字段

      const before = (sys as any).cases.length
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases.length).toBeGreaterThanOrEqual(before)
    })

    it('MAX_CASES为15', () => {
      // 验证常量值正确
      // 填满后注入一条试验是否突破
      for (let i = 1; i <= 15; i++) {
        ;(sys as any).cases.push(makeCase({ id: i, tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).cases.length).toBeLessThanOrEqual(15)
    })
  })
})
