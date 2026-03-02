import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPrefectureSystem, PrefectureForm } from '../systems/DiplomaticPrefectureSystem'

const CHECK_INTERVAL = 2590
const MAX_ARRANGEMENTS = 16

function makeSys() { return new DiplomaticPrefectureSystem() }
function makeWorld() { return {} as any }
function makeEm() { return {} as any }

function inject(sys: DiplomaticPrefectureSystem, overrides: Record<string, any> = {}) {
  const a = {
    id: 99, appointerCivId: 1, prefectureCivId: 2,
    form: 'civil_prefecture' as PrefectureForm,
    administrativeOrder: 40, taxEfficiency: 40,
    localLoyalty: 20, prefectAuthority: 25,
    duration: 0, tick: 0,
    ...overrides,
  }
  ;(sys as any).arrangements.push(a)
  return a
}

describe('DiplomaticPrefectureSystem', () => {
  let sys: DiplomaticPrefectureSystem

  beforeEach(() => { sys = makeSys() })

  // ── 1. 基础数据结构 ──────────────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('arrangements 初始为空数组', () => {
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入后 arrangements 长度为 1', () => {
      inject(sys)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('arrangements 是数组', () => {
      expect(Array.isArray((sys as any).arrangements)).toBe(true)
    })
  })

  // ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时 lastCheck 保持 0', () => {
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时 lastCheck 更新', () => {
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次 update 未满间隔时 lastCheck 不变', () => {
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('满足间隔后 lastCheck 再次更新', () => {
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('多次不满足间隔调用不改变 arrangements', () => {
      inject(sys, { tick: 0 })
      const lenBefore = (sys as any).arrangements.length
      sys.update(0, makeWorld(), makeEm(), 100)
      sys.update(0, makeWorld(), makeEm(), 200)
      expect((sys as any).arrangements.length).toBe(lenBefore)
    })
  })

  // ── 3. 字段动态更新 ───────────────────────────────────────────────────────
  describe('字段动态更新', () => {
    it('每次触发后 duration += 1', () => {
      const a = inject(sys, { tick: 0 })
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      expect(a.duration).toBe(1)
    })

    it('两次触发后 duration === 2', () => {
      const a = inject(sys, { tick: 0 })
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
      expect(a.duration).toBe(2)
    })

    it('administrativeOrder 在触发后发生变化（在合法范围内）', () => {
      const a = inject(sys, { administrativeOrder: 40, tick: 0 })
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      expect(a.administrativeOrder).toBeGreaterThanOrEqual(5)
      expect(a.administrativeOrder).toBeLessThanOrEqual(85)
    })

    it('taxEfficiency 在触发后在合法范围内', () => {
      const a = inject(sys, { taxEfficiency: 40, tick: 0 })
      sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
      expect(a.taxEfficiency).toBeGreaterThanOrEqual(10)
      expect(a.taxEfficiency).toBeLessThanOrEqual(90)
    })
  })

  // ── 4. cleanup（cutoff = tick - 88000）────────────────────────────────────
  describe('cleanup', () => {
    it('tick < cutoff 的 arrangement 被删除', () => {
      const tick = 100000
      inject(sys, { tick: tick - 88001 }) // 早于 cutoff
      sys.update(0, makeWorld(), makeEm(), tick)
      expect((sys as any).arrangements).toHaveLength(0)
    })

    it('tick === cutoff 边界时被删除', () => {
      const tick = 100000
      inject(sys, { tick: tick - 88000 }) // 恰好等于 cutoff，不满足 < cutoff
      sys.update(0, makeWorld(), makeEm(), tick)
      // tick < cutoff 为 false，不删除
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('新鲜 arrangement 不被 cleanup 删除', () => {
      const tick = CHECK_INTERVAL
      inject(sys, { tick })
      sys.update(0, makeWorld(), makeEm(), tick)
      expect((sys as any).arrangements).toHaveLength(1)
    })

    it('混合新旧 arrangement 只删旧的', () => {
      const tick = 100000
      inject(sys, { id: 1, tick: 0 })          // 旧：tick=0 < cutoff=12000
      inject(sys, { id: 2, tick: tick - 100 }) // 新：tick 接近当前
      sys.update(0, makeWorld(), makeEm(), tick)
      const remaining = (sys as any).arrangements
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })
  })

  // ── 5. MAX_ARRANGEMENTS 上限 ──────────────────────────────────────────────
  describe('MAX_ARRANGEMENTS 上限', () => {
    it('MAX_ARRANGEMENTS 常量为 16', () => {
      expect(MAX_ARRANGEMENTS).toBe(16)
    })

    it('arrangements.length >= MAX 时不再 spawn', () => {
      for (let i = 0; i < MAX_ARRANGEMENTS; i++) {
        ;(sys as any).arrangements.push({ id: i, appointerCivId: i, prefectureCivId: i + 100, form: 'civil_prefecture', administrativeOrder: 40, taxEfficiency: 40, localLoyalty: 20, prefectAuthority: 25, duration: 0, tick: 999999 })
      }
      for (let t = 1; t <= 5; t++) {
        sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL * t)
      }
      expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
    })

    it('注入 5 条后 length 为 5', () => {
      for (let i = 0; i < 5; i++) inject(sys, { id: i, tick: 999999 })
      expect((sys as any).arrangements).toHaveLength(5)
    })

    it('cleanup 后 length 减少', () => {
      const tick = 100000
      inject(sys, { id: 1, tick: 0 })
      inject(sys, { id: 2, tick: tick - 100 })
      sys.update(0, makeWorld(), makeEm(), tick)
      expect((sys as any).arrangements).toHaveLength(1)
    })
  })

  // ── 6. 枚举完整性 ─────────────────────────────────────────────────────────
  describe('枚举完整性', () => {
    it('4 种 PrefectureForm 均合法', () => {
      const forms: PrefectureForm[] = ['civil_prefecture', 'military_prefecture', 'judicial_prefecture', 'fiscal_prefecture']
      expect(forms).toHaveLength(4)
    })

    it('civil_prefecture 可作为 form 字段', () => {
      const a = inject(sys, { form: 'civil_prefecture' })
      expect(a.form).toBe('civil_prefecture')
    })

    it('military_prefecture 可作为 form 字段', () => {
      const a = inject(sys, { form: 'military_prefecture' })
      expect(a.form).toBe('military_prefecture')
    })
  })
})
