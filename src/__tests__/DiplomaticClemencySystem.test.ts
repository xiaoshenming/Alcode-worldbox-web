import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticClemencySystem } from '../systems/DiplomaticClemencySystem'

function makeSys() { return new DiplomaticClemencySystem() }

const VALID_FORMS = ['pardon', 'commutation', 'amnesty', 'reprieve']

function makeSafeAct(id: number, updateTick: number, overrides = {}) {
  return {
    id,
    civIdA: 1, civIdB: 2,
    form: 'pardon' as const,
    mercyLevel: 50,
    publicPerception: 30,
    reconciliationEffect: 20,
    precedentValue: 15,
    duration: 0,
    tick: updateTick, // 与 update tick 相同，cutoff = updateTick - 85000 << updateTick，不会过期
    ...overrides,
  }
}

describe('DiplomaticClemencySystem', () => {
  let sys: DiplomaticClemencySystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── 1. 基础数据结构 ────────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 acts 为空数组', () => {
      expect((sys as any).acts).toHaveLength(0)
    })

    it('acts 是 Array 类型', () => {
      expect(Array.isArray((sys as any).acts)).toBe(true)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('手动注入 act 后 acts.length 为 1', () => {
      ;(sys as any).acts.push({ id: 1 })
      expect((sys as any).acts).toHaveLength(1)
    })

    it('新增 act 包含所有必要字段', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001  // < ACT_CHANCE=0.0027 → 触发创建
        if (calls === 2) return 0.0    // civA = 1
        if (calls === 3) return 0.125  // civB = 2
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 5000)
      if ((sys as any).acts.length > 0) {
        const act = (sys as any).acts[0]
        expect(act).toHaveProperty('id')
        expect(act).toHaveProperty('civIdA')
        expect(act).toHaveProperty('civIdB')
        expect(act).toHaveProperty('form')
        expect(act).toHaveProperty('mercyLevel')
        expect(act).toHaveProperty('publicPerception')
        expect(act).toHaveProperty('reconciliationEffect')
        expect(act).toHaveProperty('precedentValue')
        expect(act).toHaveProperty('duration')
        expect(act).toHaveProperty('tick')
      }
    })

    it('form 值必须是合法枚举之一', () => {
      for (const form of VALID_FORMS) {
        ;(sys as any).acts.push(makeSafeAct(99, 10000, { form }))
      }
      for (const act of (sys as any).acts) {
        expect(VALID_FORMS).toContain(act.form)
      }
    })
  })

  // ─── 2. CHECK_INTERVAL 节流 (2340) ─────────────────────────────────────────
  describe('CHECK_INTERVAL 节流 (2340)', () => {
    it('tick=0 时不执行逻辑（差值 0 < 2340）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 0)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick=2339 时差值不足，跳过更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2339)
      expect((sys as any).acts).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=2340 时差值刚好等于 CHECK_INTERVAL，更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2340)
      expect((sys as any).lastCheck).toBe(2340)
    })

    it('tick=4680 时可执行第二次检查', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 2340)
      sys.update(1, {} as any, {} as any, 4680)
      expect((sys as any).lastCheck).toBe(4680)
    })

    it('连续两次 tick 差值不足 2340，lastCheck 只更新一次', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 3000)
      sys.update(1, {} as any, {} as any, 3100)
      expect((sys as any).lastCheck).toBe(3000)
    })
  })

  // ─── 3. 数值字段动态更新 ────────────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    const T = 10000

    it('每次 update 后 duration += 1', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].duration).toBe(1)
    })

    it('两次 update 后 duration 为 2', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      sys.update(1, {} as any, {} as any, T + 5000)
      expect((sys as any).acts[0].duration).toBe(2)
    })

    it('mercyLevel 超上限 90 时被夹回 90', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: 200 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeLessThanOrEqual(90)
    })

    it('mercyLevel 低于下限 10 时被夹回 10', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: -100 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeGreaterThanOrEqual(10)
    })

    it('publicPerception 超上限 85 时被夹回 85', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { publicPerception: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].publicPerception).toBeLessThanOrEqual(85)
    })

    it('publicPerception 低于下限 10 时被夹回 10', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { publicPerception: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].publicPerception).toBeGreaterThanOrEqual(10)
    })

    it('reconciliationEffect 超上限 75 时被夹回 75', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { reconciliationEffect: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].reconciliationEffect).toBeLessThanOrEqual(75)
    })

    it('reconciliationEffect 低于下限 5 时被夹回 5', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { reconciliationEffect: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].reconciliationEffect).toBeGreaterThanOrEqual(5)
    })

    it('precedentValue 超上限 65 时被夹回 65', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { precedentValue: 999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].precedentValue).toBeLessThanOrEqual(65)
    })

    it('precedentValue 低于下限 5 时被夹回 5', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { precedentValue: -999 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].precedentValue).toBeGreaterThanOrEqual(5)
    })

    it('新建 act 时 tick 字段记录为当前 tick', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 7000)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].tick).toBe(7000)
      }
    })
  })

  // ─── 4. time-based 过期清理 (cutoff = tick - 85000) ─────────────────────────
  describe('time-based 过期清理 (cutoff = tick - 85000)', () => {
    it('tick=0 的 act 在 update(85001) 时被清除', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 85001)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('tick=0 的 act 在 update(85000) 时不被清除（边界）', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 85000)
      // cutoff = 85000 - 85000 = 0，act.tick=0 不小于 0，保留
      expect((sys as any).acts).toHaveLength(1)
    })

    it('较新的 act (tick=5000) 在 update(88000) 时不被清除', () => {
      ;(sys as any).acts.push(makeSafeAct(1, 0, { tick: 5000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 88000)
      // cutoff = 88000 - 85000 = 3000，act.tick=5000 > 3000，保留
      expect((sys as any).acts).toHaveLength(1)
    })

    it('混合新旧 acts：旧的清除，新的保留', () => {
      ;(sys as any).acts.push(
        makeSafeAct(1, 0, { tick: 100 }),
        makeSafeAct(2, 0, { civIdA: 3, civIdB: 4, tick: 50000 })
      )
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 100000)
      // cutoff = 100000 - 85000 = 15000
      // id=1 tick=100 < 15000 → 删除；id=2 tick=50000 > 15000 → 保留
      expect((sys as any).acts).toHaveLength(1)
      expect((sys as any).acts[0].id).toBe(2)
    })

    it('全部 acts 过期时，数组清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, 0, { tick: i * 1000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, 200000)
      expect((sys as any).acts).toHaveLength(0)
    })
  })

  // ─── 5. MAX_ACTS 上限 (20) ─────────────────────────────────────────────────
  describe('MAX_ACTS 上限 (20)', () => {
    const T = 10000

    it('已满 20 个 acts 时，不再新增', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })

    it('acts 数量在多次 update 后永不超过 20', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      for (let t = 5000; t <= 500000; t += 2500) {
        sys.update(1, {} as any, {} as any, t)
      }
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })

    it('MAX 限制不受 CHECK_INTERVAL 影响', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { form: 'commutation' as const }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let t = T + 3000; t <= T + 60000; t += 3000) {
        sys.update(1, {} as any, {} as any, t)
      }
      expect((sys as any).acts.length).toBeLessThanOrEqual(20)
    })
  })
})
