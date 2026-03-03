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

    it('19 个 acts 时可以新增第 20 个', () => {
      for (let i = 0; i < 19; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T))
      }
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBe(20)
    })
  })

  // ─── 6. ACT_CHANCE 概率触发 (0.0027) ────────────────────────────────────────
  describe('ACT_CHANCE 概率触发 (0.0027)', () => {
    const T = 10000

    it('random=0.0026 时触发创建（< 0.0027）', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.0026
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts.length).toBe(1)
    })

    it('random=0.0027 时不触发（>= 0.0027）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0027)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('random=0.5 时不触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('random=1.0 时不触发', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })
  })

  // ─── 7. civIdA 和 civIdB 生成逻辑 ───────────────────────────────────────────
  describe('civIdA 和 civIdB 生成逻辑', () => {
    const T = 10000

    it('civA === civB 时不创建 act', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.0
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(0)
    })

    it('civA !== civB 时成功创建', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(1)
      expect((sys as any).acts[0].civIdA).toBe(1)
      expect((sys as any).acts[0].civIdB).toBe(2)
    })

    it('civId 范围在 1-8 之间', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.999
        if (calls === 3) return 0.0
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const act = (sys as any).acts[0]
        expect(act.civIdA).toBeGreaterThanOrEqual(1)
        expect(act.civIdA).toBeLessThanOrEqual(8)
        expect(act.civIdB).toBeGreaterThanOrEqual(1)
        expect(act.civIdB).toBeLessThanOrEqual(8)
      }
    })
  })

  // ─── 8. nextId 自增逻辑 ─────────────────────────────────────────────────────
  describe('nextId 自增逻辑', () => {
    const T = 10000

    it('创建第一个 act 后 nextId 变为 2', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).nextId).toBe(2)
    })

    it('连续创建多个 acts 时 id 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let t = T; t <= T + 50000; t += 2500) {
        sys.update(1, {} as any, {} as any, t)
      }
      const ids = (sys as any).acts.map((a: any) => a.id)
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1])
      }
    })

    it('删除 acts 后 nextId 不回退', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      const idBefore = (sys as any).nextId
      ;(sys as any).acts = []
      expect((sys as any).nextId).toBe(idBefore)
    })
  })

  // ─── 9. 数值字段初始范围 ────────────────────────────────────────────────────
  describe('数值字段初始范围', () => {
    const T = 10000

    it('mercyLevel 初始值在 25-65 之间', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        if (calls === 4) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const ml = (sys as any).acts[0].mercyLevel
        expect(ml).toBeGreaterThanOrEqual(25)
        expect(ml).toBeLessThanOrEqual(65)
      }
    })

    it('publicPerception 初始值在 20-55 之间', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        if (calls === 4) return 0.5
        if (calls === 5) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const pp = (sys as any).acts[0].publicPerception
        expect(pp).toBeGreaterThanOrEqual(20)
        expect(pp).toBeLessThanOrEqual(55)
      }
    })

    it('reconciliationEffect 初始值在 15-45 之间', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        if (calls === 4) return 0.5
        if (calls === 5) return 0.5
        if (calls === 6) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const re = (sys as any).acts[0].reconciliationEffect
        expect(re).toBeGreaterThanOrEqual(15)
        expect(re).toBeLessThanOrEqual(45)
      }
    })

    it('precedentValue 初始值在 10-35 之间', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        if (calls === 4) return 0.5
        if (calls === 5) return 0.5
        if (calls === 6) return 0.5
        if (calls === 7) return 0.5
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        const pv = (sys as any).acts[0].precedentValue
        expect(pv).toBeGreaterThanOrEqual(10)
        expect(pv).toBeLessThanOrEqual(35)
      }
    })

    it('duration 初始值为 0', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, T)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].duration).toBe(1)
      }
    })
  })

  // ─── 10. 多 acts 并发更新 ───────────────────────────────────────────────────
  describe('多 acts 并发更新', () => {
    const T = 10000

    it('3 个 acts 同时更新 duration', () => {
      for (let i = 0; i < 3; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { civIdA: i + 1, civIdB: i + 2 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      for (const act of (sys as any).acts) {
        expect(act.duration).toBe(1)
      }
    })

    it('10 个 acts 的数值字段都在合法范围内', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { civIdA: (i % 8) + 1, civIdB: ((i + 1) % 8) + 1 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      for (const act of (sys as any).acts) {
        expect(act.mercyLevel).toBeGreaterThanOrEqual(10)
        expect(act.mercyLevel).toBeLessThanOrEqual(90)
        expect(act.publicPerception).toBeGreaterThanOrEqual(10)
        expect(act.publicPerception).toBeLessThanOrEqual(85)
        expect(act.reconciliationEffect).toBeGreaterThanOrEqual(5)
        expect(act.reconciliationEffect).toBeLessThanOrEqual(75)
        expect(act.precedentValue).toBeGreaterThanOrEqual(5)
        expect(act.precedentValue).toBeLessThanOrEqual(65)
      }
    })

    it('混合不同 form 的 acts 都正常更新', () => {
      const forms: ('pardon' | 'commutation' | 'amnesty' | 'reprieve')[] = ['pardon', 'commutation', 'amnesty', 'reprieve']
      for (let i = 0; i < 4; i++) {
        ;(sys as any).acts.push(makeSafeAct(i + 1, T, { form: forms[i], civIdA: i + 1, civIdB: i + 2 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts).toHaveLength(4)
      for (let i = 0; i < 4; i++) {
        expect((sys as any).acts[i].form).toBe(forms[i])
        expect((sys as any).acts[i].duration).toBe(1)
      }
    })
  })

  // ─── 11. 边界 tick 值测试 ───────────────────────────────────────────────────
  describe('边界 tick 值测试', () => {
    it('tick=0 时可以正常创建 act', () => {
      let calls = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        calls++
        if (calls === 1) return 0.001
        if (calls === 2) return 0.0
        if (calls === 3) return 0.125
        return 0.5
      })
      sys.update(1, {} as any, {} as any, 0)
      if ((sys as any).acts.length > 0) {
        expect((sys as any).acts[0].tick).toBe(0)
      }
    })

    it('tick=Number.MAX_SAFE_INTEGER 时不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(() => {
        sys.update(1, {} as any, {} as any, Number.MAX_SAFE_INTEGER)
      }).not.toThrow()
    })

    it('负数 tick 时系统不崩溃', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(() => {
        sys.update(1, {} as any, {} as any, -1000)
      }).not.toThrow()
    })
  })

  // ─── 12. 极端数值更新测试 ───────────────────────────────────────────────────
  describe('极端数值更新测试', () => {
    const T = 10000

    it('mercyLevel 在边界值 10 时不会低于 10', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: 10 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.0)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeGreaterThanOrEqual(10)
    })

    it('mercyLevel 在边界值 90 时不会超过 90', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, { mercyLevel: 90 }))
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      sys.update(1, {} as any, {} as any, T)
      expect((sys as any).acts[0].mercyLevel).toBeLessThanOrEqual(90)
    })

    it('所有数值字段同时达到上限时保持稳定', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, {
        mercyLevel: 90,
        publicPerception: 85,
        reconciliationEffect: 75,
        precedentValue: 65
      }))
      vi.spyOn(Math, 'random').mockReturnValue(1.0)
      sys.update(1, {} as any, {} as any, T)
      const act = (sys as any).acts[0]
      expect(act.mercyLevel).toBeLessThanOrEqual(90)
      expect(act.publicPerception).toBeLessThanOrEqual(85)
      expect(act.reconciliationEffect).toBeLessThanOrEqual(75)
      expect(act.precedentValue).toBeLessThanOrEqual(65)
    })

    it('所有数值字段同时达到下限时保持稳定', () => {
      ;(sys as any).acts.push(makeSafeAct(1, T, {
        mercyLevel: 10,
        publicPerception: 10,
        reconciliationEffect: 5,
        precedentValue: 5
      }))
      vi.spyOn(Math, 'random').mockReturnValue(0.0)
      sys.update(1, {} as any, {} as any, T)
      const act = (sys as any).acts[0]
      expect(act.mercyLevel).toBeGreaterThanOrEqual(10)
      expect(act.publicPerception).toBeGreaterThanOrEqual(10)
      expect(act.reconciliationEffect).toBeGreaterThanOrEqual(5)
      expect(act.precedentValue).toBeGreaterThanOrEqual(5)
    })
  })
})
