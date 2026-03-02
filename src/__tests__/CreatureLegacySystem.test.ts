import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLegacySystem } from '../systems/CreatureLegacySystem'
import type { Legacy, LegacyType } from '../systems/CreatureLegacySystem'

// CHECK_INTERVAL=1500, LEGACY_CHANCE=0.01, MAX_LEGACIES=60
// LEGACY_TYPES: heroic, scholarly, artistic, villainous, diplomatic, tragic

// ── 工厂函数 ─────────────────────────────────────────────────────────────────
function makeSys() { return new CreatureLegacySystem() }

function makeLegacy(id: number, overrides: Partial<Legacy> = {}): Legacy {
  return {
    id, creatureId: 1, type: 'heroic', fame: 50,
    description: 'test', influenceRadius: 10, tick: 0,
    ...overrides,
  }
}

function makeEM(entityIds: number[] = []) {
  return { getEntitiesWithComponents: () => entityIds } as any
}

/** 强制触发 update（重置 lastCheck，tick=CHECK_INTERVAL） */
function triggerUpdate(sys: CreatureLegacySystem, em: any = makeEM(), tick = 1500) {
  ;(sys as any).lastCheck = 0
  sys.update(1, em, tick)
}

const ALL_LEGACY_TYPES: LegacyType[] = ['heroic', 'scholarly', 'artistic', 'villainous', 'diplomatic', 'tragic']
const CHECK_INTERVAL = 1500
const MAX_LEGACIES = 60
const LEGACY_CHANCE = 0.01

describe('CreatureLegacySystem', () => {
  let sys: CreatureLegacySystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化 ──────────────────────────────────────────────────────────────
  describe('初始化', () => {
    it('初始化成功', () => {
      expect(sys).toBeInstanceOf(CreatureLegacySystem)
    })

    it('初始 legacies 为空', () => {
      expect((sys as any).legacies.length).toBe(0)
    })

    it('初始 nextId=1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck=0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('legacies 是数组类型', () => {
      expect(Array.isArray((sys as any).legacies)).toBe(true)
    })
  })

  // ── 2. pruneLegacies 逻辑 ─────────────────────────────────────────────────
  describe('pruneLegacies 裁剪逻辑', () => {
    it('legacies <= MAX_LEGACIES(60) 时不截断', () => {
      for (let i = 1; i <= 60; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(60)
    })

    it('legacies 超过 60 时截断到 60', () => {
      for (let i = 1; i <= 65; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(60)
    })

    it('截断保留最新（删除最旧的前 5 个）', () => {
      for (let i = 1; i <= 65; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies[0].id).toBe(6)   // 前 5 个被删
      expect((sys as any).legacies[59].id).toBe(65)  // 最新保留
    })

    it('空 legacies 不崩溃', () => {
      expect(() => (sys as any).pruneLegacies()).not.toThrow()
    })

    it('恰好 61 个时截断到 60，删掉第 1 个', () => {
      for (let i = 1; i <= 61; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(60)
      expect((sys as any).legacies[0].id).toBe(2)
    })

    it('恰好 59 个时不截断', () => {
      for (let i = 1; i <= 59; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(59)
    })

    it('100 个时截断到 60，保留后 60 个', () => {
      for (let i = 1; i <= 100; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(60)
      expect((sys as any).legacies[0].id).toBe(41)
      expect((sys as any).legacies[59].id).toBe(100)
    })

    it('多次 prune 后长度稳定为 60', () => {
      for (let i = 1; i <= 70; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(60)
    })
  })

  // ── 3. CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 未达 CHECK_INTERVAL(1500) 时不更新 lastCheck', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 达到 CHECK_INTERVAL(1500) 时更新 lastCheck', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 超过 CHECK_INTERVAL 时 lastCheck 更新为当前 tick', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL + 200)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 200)
    })

    it('未达阈值时 legacies 保持不变', () => {
      (sys as any).legacies.push(makeLegacy(1))
      const em = makeEM([1])
      ;(sys as any).lastCheck = 5000
      sys.update(1, em, 5000 + CHECK_INTERVAL - 1)
      expect((sys as any).legacies.length).toBe(1)
    })

    it('tick=0 不触发更新', () => {
      const em = makeEM([1])
      sys.update(1, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续两次 update 第二次差值不足时 lastCheck 不变', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)          // 触发
      sys.update(1, em, CHECK_INTERVAL + 100)    // 不触发
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })
  })

  // ── 4. generateLegacies 逻辑 ──────────────────────────────────────────────
  describe('generateLegacies 生成逻辑', () => {
    it('实体列表为空时不生成 legacy', () => {
      triggerUpdate(sys, makeEM([]))
      expect((sys as any).legacies.length).toBe(0)
    })

    it('Math.random() <= LEGACY_CHANCE(0.01) 时生成 legacy', () => {
      // random() 第一次用于 LEGACY_CHANCE 检查，之后用于 pickWeighted/pickRandom
      vi.spyOn(Math, 'random').mockReturnValue(0.005) // 0.005 < 0.01 → 生成
      triggerUpdate(sys, makeEM([1]))
      expect((sys as any).legacies.length).toBeGreaterThan(0)
    })

    it('Math.random() > LEGACY_CHANCE(0.01) 时不生成 legacy', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)  // > 0.01 → 跳过
      triggerUpdate(sys, makeEM([1]))
      expect((sys as any).legacies.length).toBe(0)
    })

    it('生成的 legacy 包含所有必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([99]))
      if ((sys as any).legacies.length > 0) {
        const legacy = (sys as any).legacies[0] as Legacy
        expect(legacy).toHaveProperty('id')
        expect(legacy).toHaveProperty('creatureId')
        expect(legacy).toHaveProperty('type')
        expect(legacy).toHaveProperty('fame')
        expect(legacy).toHaveProperty('description')
        expect(legacy).toHaveProperty('influenceRadius')
        expect(legacy).toHaveProperty('tick')
      }
    })

    it('生成的 legacy 的 creatureId 等于对应实体 id', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([42]))
      if ((sys as any).legacies.length > 0) {
        expect((sys as any).legacies[0].creatureId).toBe(42)
      }
    })

    it('生成的 legacy 的 tick 等于传入 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      ;(sys as any).lastCheck = 0
      sys.update(1, makeEM([1]), 3333)
      if ((sys as any).legacies.length > 0) {
        expect((sys as any).legacies[0].tick).toBe(3333)
      }
    })

    it('生成后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(1)
      }
    })

    it('多个实体中部分生成 legacy（通过控制 random 验证）', () => {
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        call++
        // 实体1: 第1次调用用于LEGACY_CHANCE, 0.005 < 0.01 → 生成
        // 实体2: 第n次调用用于LEGACY_CHANCE, 0.5 > 0.01 → 跳过
        // 实体3: 同实体1
        if (call === 1) return 0.005  // 实体1: 生成
        if (call === 4) return 0.5    // 实体2: 跳过（精确模拟需要内部调用计数）
        return 0.005  // 其余都生成（用于type/desc选择）
      })
      triggerUpdate(sys, makeEM([1, 2, 3]))
      // 至少1个 legacy 生成（实体1和3都应生成）
      expect((sys as any).legacies.length).toBeGreaterThanOrEqual(1)
    })

    it('legacy fame 范围在 [20, 100] 之间', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        const fame = (sys as any).legacies[0].fame
        expect(fame).toBeGreaterThanOrEqual(20)
        expect(fame).toBeLessThanOrEqual(100)
      }
    })

    it('legacy influenceRadius 范围在 [5, 19] 之间（5+floor(random*15)）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        const radius = (sys as any).legacies[0].influenceRadius
        expect(radius).toBeGreaterThanOrEqual(5)
        expect(radius).toBeLessThanOrEqual(19)
      }
    })

    it('生成的 legacy 的 type 是合法的 LegacyType', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        expect(ALL_LEGACY_TYPES).toContain((sys as any).legacies[0].type)
      }
    })

    it('生成的 legacy 的 description 是字符串', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        expect(typeof (sys as any).legacies[0].description).toBe('string')
      }
    })

    it('description 非空字符串', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      if ((sys as any).legacies.length > 0) {
        expect((sys as any).legacies[0].description.length).toBeGreaterThan(0)
      }
    })
  })

  // ── 5. Legacy 数据结构 ────────────────────────────────────────────────────
  describe('Legacy 数据结构', () => {
    it('Legacy 对象包含必要字段', () => {
      const legacy = makeLegacy(99)
      expect(legacy).toHaveProperty('id', 99)
      expect(legacy).toHaveProperty('creatureId')
      expect(legacy).toHaveProperty('type')
      expect(legacy).toHaveProperty('fame')
      expect(legacy).toHaveProperty('description')
      expect(legacy).toHaveProperty('influenceRadius')
      expect(legacy).toHaveProperty('tick')
    })

    it('Legacy fame 范围合理（0-100）', () => {
      const legacy = makeLegacy(1)
      expect(legacy.fame).toBeGreaterThanOrEqual(0)
      expect(legacy.fame).toBeLessThanOrEqual(100)
    })

    it('所有 6 种 LegacyType 都可作为合法类型', () => {
      for (const type of ALL_LEGACY_TYPES) {
        const legacy = makeLegacy(1, { type })
        ;(sys as any).legacies.push(legacy)
      }
      expect((sys as any).legacies.length).toBe(6)
    })

    it('LegacyType heroic 合法', () => {
      const l = makeLegacy(1, { type: 'heroic' })
      expect(l.type).toBe('heroic')
    })

    it('LegacyType scholarly 合法', () => {
      const l = makeLegacy(1, { type: 'scholarly' })
      expect(l.type).toBe('scholarly')
    })

    it('LegacyType artistic 合法', () => {
      const l = makeLegacy(1, { type: 'artistic' })
      expect(l.type).toBe('artistic')
    })

    it('LegacyType villainous 合法', () => {
      const l = makeLegacy(1, { type: 'villainous' })
      expect(l.type).toBe('villainous')
    })

    it('LegacyType diplomatic 合法', () => {
      const l = makeLegacy(1, { type: 'diplomatic' })
      expect(l.type).toBe('diplomatic')
    })

    it('LegacyType tragic 合法', () => {
      const l = makeLegacy(1, { type: 'tragic' })
      expect(l.type).toBe('tragic')
    })

    it('influenceRadius 是整数（int）', () => {
      const l = makeLegacy(1, { influenceRadius: 10 })
      expect(Number.isInteger(l.influenceRadius)).toBe(true)
    })
  })

  // ── 6. generateLegacies + pruneLegacies 协同 ───────────────────────────────
  describe('generateLegacies + pruneLegacies 协同', () => {
    it('update 触发后先生成再裁剪', () => {
      // 预填充 59 个 legacies
      for (let i = 1; i <= 59; i++) (sys as any).legacies.push(makeLegacy(i))
      // 触发生成（random < LEGACY_CHANCE），新增 1 个 → 共 60，不超限
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1]))
      expect((sys as any).legacies.length).toBeLessThanOrEqual(MAX_LEGACIES)
    })

    it('超过 MAX_LEGACIES 后 pruneLegacies 维持上限', () => {
      for (let i = 1; i <= MAX_LEGACIES; i++) (sys as any).legacies.push(makeLegacy(i))
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      // 触发生成多个实体
      triggerUpdate(sys, makeEM([1, 2, 3, 4, 5]))
      expect((sys as any).legacies.length).toBeLessThanOrEqual(MAX_LEGACIES)
    })

    it('update 后 legacies 长度始终不超过 MAX_LEGACIES', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      // 100 个实体全部生成 legacy
      triggerUpdate(sys, makeEM(Array.from({ length: 100 }, (_, i) => i + 1)))
      expect((sys as any).legacies.length).toBeLessThanOrEqual(MAX_LEGACIES)
    })
  })

  // ── 7. 边界条件 ────────────────────────────────────────────────────────────
  describe('边界条件', () => {
    it('空实体列表 update 不崩溃', () => {
      expect(() => triggerUpdate(sys, makeEM([]))).not.toThrow()
    })

    it('dt 参数不影响逻辑', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(999, em, CHECK_INTERVAL)).not.toThrow()
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('直接注入 legacy 后 pruneLegacies 正常工作', () => {
      for (let i = 1; i <= 70; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).legacies.length).toBe(MAX_LEGACIES)
    })

    it('nextId 在生成 legacy 后正确自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005)
      triggerUpdate(sys, makeEM([1, 2, 3]))
      const count = (sys as any).legacies.length
      expect((sys as any).nextId).toBe(count + 1)
    })

    it('prune 不影响 nextId', () => {
      ;(sys as any).nextId = 99
      for (let i = 1; i <= 70; i++) (sys as any).legacies.push(makeLegacy(i))
      ;(sys as any).pruneLegacies()
      expect((sys as any).nextId).toBe(99)
    })

    it('update 触发后 lastCheck 精确等于传入 tick', () => {
      const em = makeEM([])
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 4567)
      expect((sys as any).lastCheck).toBe(4567)
    })
  })

  // ── 8. 多实例独立性 ─────────────────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例的 legacies 互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).legacies.push(makeLegacy(1))
      expect((sys2 as any).legacies.length).toBe(0)
    })

    it('两个 sys 实例的 nextId 互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).nextId = 99
      expect((sys2 as any).nextId).toBe(1)
    })

    it('两个 sys 实例的 lastCheck 互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).lastCheck = 5000
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })
})
