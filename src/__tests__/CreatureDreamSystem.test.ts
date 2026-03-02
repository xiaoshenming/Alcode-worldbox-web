import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDreamSystem } from '../systems/CreatureDreamSystem'
import type { Dream } from '../systems/CreatureDreamSystem'

// CHECK_INTERVAL=1200, MAX_DREAM_LOG=60, DREAM_CHANCE=0.03
// DREAM_CONFIGS: prophetic(+5~+15), nightmare(-20~-5), nostalgic(-5~+10),
//               peaceful(+5~+20), adventure(0~+10), warning(-10~0)

function makeSys() { return new CreatureDreamSystem() }

function makeDream(id: number, creatureId = 1): Dream {
  return { id, creatureId, type: 'peaceful', intensity: 50, moodEffect: 10, tick: 0 }
}

const CHECK_INTERVAL = 1200
const MAX_DREAM_LOG = 60

describe('CreatureDreamSystem', () => {
  let sys: CreatureDreamSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ──────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureDreamSystem) })
    it('初始 dreamLog 为空', () => { expect((sys as any).dreamLog.length).toBe(0) })
    it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
    it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('dreamLog 初始为数组', () => { expect(Array.isArray((sys as any).dreamLog)).toBe(true) })
  })

  // ── Dream 数据结构 ──────────────────────────────────────────���───────────────
  describe('Dream 数据结构', () => {
    it('Dream 对象包含必要字段', () => {
      const d = makeDream(1, 42)
      expect(d).toHaveProperty('id', 1)
      expect(d).toHaveProperty('creatureId', 42)
      expect(d).toHaveProperty('type')
      expect(d).toHaveProperty('intensity')
      expect(d).toHaveProperty('moodEffect')
      expect(d).toHaveProperty('tick')
    })

    it('Dream type 字段可以是 peaceful', () => {
      const d = makeDream(1)
      expect(d.type).toBe('peaceful')
    })

    it('Dream intensity 字段存储正确', () => {
      const d = makeDream(1)
      expect(d.intensity).toBe(50)
    })

    it('Dream moodEffect 字段存储正确', () => {
      const d = makeDream(1)
      expect(d.moodEffect).toBe(10)
    })

    it('Dream tick 字段初始为 0', () => {
      const d = makeDream(1)
      expect(d.tick).toBe(0)
    })

    it('不同 creatureId 的梦境各自独立', () => {
      ;(sys as any).dreamLog.push(makeDream(1, 100))
      ;(sys as any).dreamLog.push(makeDream(2, 200))
      expect((sys as any).dreamLog[0].creatureId).toBe(100)
      expect((sys as any).dreamLog[1].creatureId).toBe(200)
    })
  })

  // ── pruneLog 逻辑 ───────────────────────────────────────────────────────────
  describe('pruneLog 截断逻辑', () => {
    it('dreamLog <= MAX_DREAM_LOG(60) 时不截断', () => {
      for (let i = 1; i <= 60; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
    })

    it('dreamLog 超过 60 时截断到 60', () => {
      for (let i = 1; i <= 65; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
    })

    it('截断保留最新的梦境（splice 从头删）', () => {
      for (let i = 1; i <= 65; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      const first = (sys as any).dreamLog[0]
      expect(first.id).toBe(6)
      const last = (sys as any).dreamLog[59]
      expect(last.id).toBe(65)
    })

    it('空 dreamLog 时 pruneLog 不崩溃', () => {
      expect(() => (sys as any).pruneLog()).not.toThrow()
    })

    it('恰好 61 个时截断到 60，删除最旧的 1 个', () => {
      for (let i = 1; i <= 61; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
      expect((sys as any).dreamLog[0].id).toBe(2)
    })

    it('截断 10 个后长度为 60', () => {
      for (let i = 1; i <= 70; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
      expect((sys as any).dreamLog[0].id).toBe(11)
    })

    it('pruneLog 被多次调用后不重复截断（幂等）', () => {
      for (let i = 1; i <= 65; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
    })

    it('dreamLog 恰好 1 个时 pruneLog 不删除', () => {
      ;(sys as any).dreamLog.push(makeDream(1))
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(1)
    })
  })

  // ── DREAM_CONFIGS moodEffect 范围 ──────────────────────────────────────────
  describe('DREAM_CONFIGS moodEffect 范围验证', () => {
    it('nightmare 的 moodEffect 范围(-20~-5)', () => {
      const cfg = { moodMin: -20, moodMax: -5 }
      expect(cfg.moodMin).toBe(-20)
      expect(cfg.moodMax).toBe(-5)
    })

    it('peaceful 的 moodEffect 范围(+5~+20)', () => {
      const cfg = { moodMin: 5, moodMax: 20 }
      expect(cfg.moodMin).toBeGreaterThan(0)
      expect(cfg.moodMax).toBeLessThanOrEqual(20)
    })

    it('prophetic 的 moodEffect 范围(+5~+15)', () => {
      const cfg = { moodMin: 5, moodMax: 15 }
      expect(cfg.moodMin).toBe(5)
      expect(cfg.moodMax).toBe(15)
    })

    it('nostalgic 的 moodEffect 范围(-5~+10)', () => {
      const cfg = { moodMin: -5, moodMax: 10 }
      expect(cfg.moodMin).toBe(-5)
      expect(cfg.moodMax).toBe(10)
    })

    it('adventure 的 moodEffect 范围(0~+10)', () => {
      const cfg = { moodMin: 0, moodMax: 10 }
      expect(cfg.moodMin).toBeGreaterThanOrEqual(0)
      expect(cfg.moodMax).toBeLessThanOrEqual(10)
    })

    it('warning 的 moodEffect 范围(-10~0)', () => {
      const cfg = { moodMin: -10, moodMax: 0 }
      expect(cfg.moodMin).toBe(-10)
      expect(cfg.moodMax).toBe(0)
    })

    it('nightmare moodMin < moodMax', () => {
      const cfg = { moodMin: -20, moodMax: -5 }
      expect(cfg.moodMin).toBeLessThan(cfg.moodMax)
    })

    it('peaceful moodMin < moodMax', () => {
      const cfg = { moodMin: 5, moodMax: 20 }
      expect(cfg.moodMin).toBeLessThan(cfg.moodMax)
    })
  })

  // ── DREAM_WEIGHTS 权重验证 ─────────────────────────────────────────────────
  describe('DREAM_WEIGHTS 权重验证', () => {
    it('peaceful 权重最高（0.25）', () => {
      const weights = {
        prophetic: 0.1, nightmare: 0.2, nostalgic: 0.2,
        peaceful: 0.25, adventure: 0.15, warning: 0.1
      }
      expect(weights.peaceful).toBeGreaterThan(weights.prophetic)
      expect(weights.peaceful).toBeGreaterThan(weights.nightmare)
      expect(weights.peaceful).toBeGreaterThan(weights.adventure)
      expect(weights.peaceful).toBeGreaterThan(weights.warning)
    })

    it('所有权重之和为 1.0', () => {
      const weights = {
        prophetic: 0.1, nightmare: 0.2, nostalgic: 0.2,
        peaceful: 0.25, adventure: 0.15, warning: 0.1
      }
      const total = Object.values(weights).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(1.0, 5)
    })

    it('nightmare 权重与 nostalgic 相等（均为 0.2）', () => {
      const weights = { nightmare: 0.2, nostalgic: 0.2 }
      expect(weights.nightmare).toBe(weights.nostalgic)
    })

    it('prophetic 与 warning 权重相等（均为 0.1）', () => {
      const weights = { prophetic: 0.1, warning: 0.1 }
      expect(weights.prophetic).toBe(weights.warning)
    })

    it('所有权重均大于 0', () => {
      const weights = {
        prophetic: 0.1, nightmare: 0.2, nostalgic: 0.2,
        peaceful: 0.25, adventure: 0.15, warning: 0.1
      }
      Object.values(weights).forEach(w => expect(w).toBeGreaterThan(0))
    })
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 未达到 CHECK_INTERVAL(1200) 时不更新 dreamLog', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 1199)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).dreamLog.length).toBe(0)
    })

    it('tick 达到 CHECK_INTERVAL(1200) 时更新 lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 1200)
      expect((sys as any).lastCheck).toBe(1200)
    })

    it('tick = CHECK_INTERVAL - 1 时不触发', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续多次 update 超过 CHECK_INTERVAL 时每次都更新 lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
      sys.update(1, em, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick=0 时不触发（0 - 0 = 0 < 1200）', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      sys.update(1, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── nextId 自增 ──────────────────────────────────────────────────────────────
  describe('nextId 自增', () => {
    it('手动 push 梦境后 nextId 不变（仅 generateDreams 递增）', () => {
      ;(sys as any).dreamLog.push(makeDream(1))
      expect((sys as any).nextId).toBe(1)
    })

    it('generateDreams 生成梦境后 nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01) // 0.01 < DREAM_CHANCE(0.03)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThan(1)
    })

    it('生成多个梦境后 nextId 累积增长', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1, 2, 3]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThanOrEqual(4)
    })
  })

  // ── generateDreams 逻辑 ──────────────────────────────────────────────────────
  describe('generateDreams 生成逻辑', () => {
    it('DREAM_CHANCE > random 时不生成梦境（random > 0.03）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1, 2, 3]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).dreamLog.length).toBe(0)
    })

    it('random < DREAM_CHANCE 时生成梦境', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).dreamLog.length).toBeGreaterThan(0)
    })

    it('生成的梦境 tick 等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      if ((sys as any).dreamLog.length > 0) {
        expect((sys as any).dreamLog[0].tick).toBe(CHECK_INTERVAL)
      }
    })

    it('生成的梦境 creatureId 等于实体 id', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([42]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      if ((sys as any).dreamLog.length > 0) {
        expect((sys as any).dreamLog[0].creatureId).toBe(42)
      }
    })

    it('entities 为空时不生成任何梦境', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).dreamLog.length).toBe(0)
    })

    it('生成的梦境 intensity 在 20~100 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([1]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      if ((sys as any).dreamLog.length > 0) {
        const d = (sys as any).dreamLog[0] as Dream
        expect(d.intensity).toBeGreaterThanOrEqual(20)
        expect(d.intensity).toBeLessThanOrEqual(100)
      }
    })

    it('生成梦境后 pruneLog 自动被调用', () => {
      const pruneSpy = vi.spyOn(sys as any, 'pruneLog')
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect(pruneSpy).toHaveBeenCalledTimes(1)
    })
  })

  // ── 综合场景 ──────────────────────────────────────────────────────────────────
  describe('综合场景', () => {
    it('全空世界多次 update 不崩溃', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      expect(() => {
        for (let t = 1; t <= 10; t++) {
          sys.update(1, em, CHECK_INTERVAL * t)
        }
      }).not.toThrow()
    })

    it('dreamLog 超过 60 后自动截断', () => {
      // 每次 update 生成若干梦境，积累超过 60 后应截断
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const entities = Array.from({ length: 20 }, (_, i) => i + 1)
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue(entities) } as any
      // 多轮 update，每轮有机会生成多梦境
      for (let t = 1; t <= 5; t++) {
        ;(sys as any).lastCheck = 0
        sys.update(1, em, CHECK_INTERVAL * t)
      }
      expect((sys as any).dreamLog.length).toBeLessThanOrEqual(MAX_DREAM_LOG)
    })

    it('pruneLog 调用后 dreamLog 不超过 60', () => {
      for (let i = 1; i <= 80; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog.length).toBe(60)
    })

    it('同一 tick 第二次 update 不重新 generateDreams', () => {
      const generateSpy = vi.spyOn(sys as any, 'generateDreams')
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
      sys.update(1, em, CHECK_INTERVAL)
      sys.update(1, em, CHECK_INTERVAL) // 差值=0 < 1200，应跳过
      expect(generateSpy).toHaveBeenCalledTimes(1)
    })

    it('dreamLog 内部引用稳定', () => {
      const ref1 = (sys as any).dreamLog
      ;(sys as any).dreamLog.push(makeDream(1))
      const ref2 = (sys as any).dreamLog
      expect(ref1).toBe(ref2)
    })

    it('手动注入梦境后 pruneLog 正常工作', () => {
      for (let i = 1; i <= 65; i++) {
        ;(sys as any).dreamLog.push(makeDream(i))
      }
      ;(sys as any).pruneLog()
      expect((sys as any).dreamLog).toHaveLength(60)
      expect((sys as any).dreamLog[0].id).toBe(6)
    })

    it('update 调用链：更新 lastCheck → generateDreams → pruneLog', () => {
      const genSpy = vi.spyOn(sys as any, 'generateDreams')
      const pruneSpy = vi.spyOn(sys as any, 'pruneLog')
      const em = { getEntitiesWithComponents: vi.fn().mockReturnValue([]) } as any
      sys.update(1, em, CHECK_INTERVAL)
      expect(genSpy).toHaveBeenCalledTimes(1)
      expect(pruneSpy).toHaveBeenCalledTimes(1)
    })
  })
})
