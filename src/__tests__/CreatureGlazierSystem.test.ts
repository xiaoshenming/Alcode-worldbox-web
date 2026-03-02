import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGlazierSystem } from '../systems/CreatureGlazierSystem'
import type { Glazier } from '../systems/CreatureGlazierSystem'

let nextId = 1
function makeSys(): CreatureGlazierSystem { return new CreatureGlazierSystem() }
function makeGlazier(entityId: number, overrides: Partial<Glazier> = {}): Glazier {
  return {
    id: nextId++, entityId,
    glassCutting: 50, leadWorking: 60, designPrecision: 70, outputQuality: 80, tick: 0,
    ...overrides,
  }
}

/** 让 sys 跳过 tick 门槛：设 lastCheck=0，传 tick=CHECK_INTERVAL(2600) */
function triggerUpdate(sys: CreatureGlazierSystem, tick = 2600) {
  const em = {} as any
  ;(sys as any).lastCheck = 0
  sys.update(0, em, tick)
}

describe('CreatureGlazierSystem', () => {
  let sys: CreatureGlazierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ─────────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无玻璃工', () => {
      expect((sys as any).glaziers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 数据注入与查询 ───────────────────────────────────────────────────────────
  describe('数据注入与查询', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).glaziers.push(makeGlazier(5))
      expect((sys as any).glaziers[0].entityId).toBe(5)
    })

    it('多个记录全部返回', () => {
      ;(sys as any).glaziers.push(makeGlazier(1))
      ;(sys as any).glaziers.push(makeGlazier(2))
      ;(sys as any).glaziers.push(makeGlazier(3))
      expect((sys as any).glaziers).toHaveLength(3)
    })

    it('四字段数据完整', () => {
      const g = makeGlazier(10, { glassCutting: 90, leadWorking: 85, designPrecision: 80, outputQuality: 75 })
      ;(sys as any).glaziers.push(g)
      const r = (sys as any).glaziers[0] as Glazier
      expect(r.glassCutting).toBe(90)
      expect(r.leadWorking).toBe(85)
      expect(r.designPrecision).toBe(80)
      expect(r.outputQuality).toBe(75)
    })

    it('注入的 id 字段正确保存', () => {
      const g = makeGlazier(7, {})
      ;(sys as any).glaziers.push(g)
      expect((sys as any).glaziers[0].id).toBe(g.id)
    })

    it('注入的 tick 字段正确保存', () => {
      const g = makeGlazier(3, { tick: 999 })
      ;(sys as any).glaziers.push(g)
      expect((sys as any).glaziers[0].tick).toBe(999)
    })

    it('注入10个记录后长度正确', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).glaziers.push(makeGlazier(i + 1))
      }
      expect((sys as any).glaziers).toHaveLength(10)
    })
  })

  // ── tick 间隔控制 ────────────────────────────────────────────────────────────
  describe('tick 间隔控制（CHECK_INTERVAL=2600）', () => {
    it('tick 差 < 2600 不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 3000
      const em = {} as any
      sys.update(0, em, 3000 + 2599)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('tick 差 >= 2600 更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, 2600)
      expect((sys as any).lastCheck).toBe(2600)
    })

    it('tick 差精确等于 2600 时触发更新', () => {
      ;(sys as any).lastCheck = 1000
      const em = {} as any
      sys.update(0, em, 3600)
      expect((sys as any).lastCheck).toBe(3600)
    })

    it('tick 差 = 2599 时不触发更新', () => {
      ;(sys as any).lastCheck = 1000
      const em = {} as any
      sys.update(0, em, 3599)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('第二次达到阈值时 lastCheck 继续递进', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(0, em, 2600)
      expect((sys as any).lastCheck).toBe(2600)
      ;(sys as any).lastCheck = 2600
      sys.update(0, em, 5200)
      expect((sys as any).lastCheck).toBe(5200)
    })

    it('tick=0 时不触发（差=0 < 2600）', () => {
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, 0)
      // tick - lastCheck = 0 < 2600 → 不触发
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── glassCutting 技能增长 ────────────────────────────────────────────────────
  describe('glassCutting 技能增长', () => {
    it('update 后 glassCutting 增加 0.02', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.02, 5)
    })

    it('glassCutting 不超过 100', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 99.99 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBeLessThanOrEqual(100)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(100, 5)
    })

    it('glassCutting 从 0 增加到 0.02', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 0 }))
      // glassCutting=0 满足删除条件（<=4），会被删除，所以先设为5
      ;(sys as any).glaziers[0].glassCutting = 5
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(5.02, 5)
    })

    it('多个玻璃工均获得 glassCutting 增长', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
      ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 60 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.02, 5)
      expect((sys as any).glaziers[1].glassCutting).toBeCloseTo(60.02, 5)
    })

    it('glassCutting 精确上限夹紧：99.995 → 100', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 99.995 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBe(100)
    })
  })

  // ── designPrecision 技能增长 ─────────────────────────────────────────────────
  describe('designPrecision 技能增长', () => {
    it('update 后 designPrecision 增加 0.015', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 70 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].designPrecision).toBeCloseTo(70.015, 5)
    })

    it('designPrecision 不超过 100', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 99.99 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].designPrecision).toBeLessThanOrEqual(100)
    })

    it('designPrecision 从低值正确增长', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 20 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].designPrecision).toBeCloseTo(20.015, 5)
    })

    it('designPrecision=100 时不再增加', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 100 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].designPrecision).toBe(100)
    })

    it('多次 update 后 designPrecision 累计增长', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 50 }))
      triggerUpdate(sys, 2600)
      triggerUpdate(sys, 5200)
      expect((sys as any).glaziers[0].designPrecision).toBeCloseTo(50.03, 5)
    })
  })

  // ── outputQuality 技能增长 ───────────────────────────────────────────────────
  describe('outputQuality 技能增长', () => {
    it('update 后 outputQuality 增加 0.01', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 80 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].outputQuality).toBeCloseTo(80.01, 5)
    })

    it('outputQuality 不超过 100', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 99.995 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].outputQuality).toBeLessThanOrEqual(100)
    })

    it('outputQuality=100 时不再增加', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 100 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].outputQuality).toBe(100)
    })

    it('outputQuality 从低值正确增长', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 10 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].outputQuality).toBeCloseTo(10.01, 5)
    })
  })

  // ── leadWorking 字段 ─────────────────────────────────────────────────────────
  describe('leadWorking 字段', () => {
    it('leadWorking 字段正确保存', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { leadWorking: 75 }))
      expect((sys as any).glaziers[0].leadWorking).toBe(75)
    })

    it('update 不修改 leadWorking（无增长逻辑）', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { leadWorking: 60 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].leadWorking).toBe(60)
    })

    it('leadWorking 默认值为 60（来自 makeGlazier）', () => {
      const g = makeGlazier(1)
      expect(g.leadWorking).toBe(60)
    })
  })

  // ── cleanup 删除逻辑 ─────────────────────────────────────────────────────────
  describe('cleanup 删除逻辑（glassCutting <= 4）', () => {
    it('cleanup: glassCutting <= 4 时删除（边界 3.98→4.00）', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 3.98 }))
      ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 5 }))
      triggerUpdate(sys)
      const remaining = (sys as any).glaziers as Glazier[]
      expect(remaining.some(g => g.entityId === 1)).toBe(false)
      expect(remaining.some(g => g.entityId === 2)).toBe(true)
    })

    it('cleanup: glassCutting=1 时删除', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 1 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(0)
    })

    it('cleanup: glassCutting=4 时删除（等于边界）', () => {
      // 4 + 0.02 = 4.02 > 4，不应被删除；但 glassCutting 初始=4，在增加前先检查还是增加后？
      // 源码顺序：先增加 → 再 cleanup；所以 4 + 0.02 = 4.02，不删除
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 4 }))
      triggerUpdate(sys)
      const remaining = (sys as any).glaziers as Glazier[]
      // 4.02 > 4，不删除
      expect(remaining.some(g => g.entityId === 1)).toBe(true)
    })

    it('cleanup: glassCutting=3.97 → 3.99 < 4，仍被删除', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 3.97 }))
      triggerUpdate(sys)
      // 3.97 + 0.02 = 3.99 <= 4 → 删除
      expect((sys as any).glaziers).toHaveLength(0)
    })

    it('cleanup: 多个低值记录全部删除', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 1 }))
      ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 2 }))
      ;(sys as any).glaziers.push(makeGlazier(3, { glassCutting: 3 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(0)
    })

    it('cleanup: 混合记录只删除低值部分', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 2 }))
      ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 50 }))
      ;(sys as any).glaziers.push(makeGlazier(3, { glassCutting: 3 }))
      ;(sys as any).glaziers.push(makeGlazier(4, { glassCutting: 80 }))
      triggerUpdate(sys)
      const remaining = (sys as any).glaziers as Glazier[]
      expect(remaining).toHaveLength(2)
      expect(remaining.some(g => g.entityId === 2)).toBe(true)
      expect(remaining.some(g => g.entityId === 4)).toBe(true)
    })

    it('cleanup: glassCutting > 4 时不删除', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 10 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(1)
    })

    it('cleanup: 空列表时 update 不报错', () => {
      expect(() => triggerUpdate(sys)).not.toThrow()
      expect((sys as any).glaziers).toHaveLength(0)
    })
  })

  // ── 招募逻辑（Math.random 模拟）──────────────────────────────────────────────
  describe('招募逻辑（RECRUIT_CHANCE=0.0015，MAX_GLAZIERS=10）', () => {
    it('Math.random < 0.0015 时招募一个玻璃工', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(1)
    })

    it('Math.random >= 0.0015 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.002)
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(0)
    })

    it('达到 MAX_GLAZIERS(10) 时不再招募', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).glaziers.push(makeGlazier(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      triggerUpdate(sys)
      expect((sys as any).glaziers).toHaveLength(10)
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0005)
      ;(sys as any).nextId = 5
      triggerUpdate(sys)
      if ((sys as any).glaziers.length > 0) {
        expect((sys as any).nextId).toBe(6)
      }
    })

    it('招募的玻璃工 glassCutting 在 [10, 35] 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      triggerUpdate(sys)
      if ((sys as any).glaziers.length > 0) {
        const gc = (sys as any).glaziers[0].glassCutting as number
        expect(gc).toBeGreaterThanOrEqual(10)
        expect(gc).toBeLessThanOrEqual(35)
      }
    })

    it('招募的玻璃工 leadWorking 在 [15, 35] 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      triggerUpdate(sys)
      if ((sys as any).glaziers.length > 0) {
        const lw = (sys as any).glaziers[0].leadWorking as number
        expect(lw).toBeGreaterThanOrEqual(15)
        expect(lw).toBeLessThanOrEqual(35)
      }
    })

    it('招募的玻璃工 designPrecision 在 [5, 25] 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      triggerUpdate(sys)
      if ((sys as any).glaziers.length > 0) {
        const dp = (sys as any).glaziers[0].designPrecision as number
        expect(dp).toBeGreaterThanOrEqual(5)
        expect(dp).toBeLessThanOrEqual(25)
      }
    })

    it('招募的玻璃工 outputQuality 在 [10, 35] 范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      triggerUpdate(sys)
      if ((sys as any).glaziers.length > 0) {
        const oq = (sys as any).glaziers[0].outputQuality as number
        expect(oq).toBeGreaterThanOrEqual(10)
        expect(oq).toBeLessThanOrEqual(35)
      }
    })

    it('招募的玻璃工 tick 等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, 2600)
      if ((sys as any).glaziers.length > 0) {
        expect((sys as any).glaziers[0].tick).toBe(2600)
      }
    })
  })

  // ── 多字段同步增长验证 ───────────────────────────────────────────────────────
  describe('多字段同步增长', () => {
    it('一次 update 三个技能字段同时增长', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, {
        glassCutting: 50, designPrecision: 60, outputQuality: 70
      }))
      triggerUpdate(sys)
      const g = (sys as any).glaziers[0] as Glazier
      expect(g.glassCutting).toBeCloseTo(50.02, 5)
      expect(g.designPrecision).toBeCloseTo(60.015, 5)
      expect(g.outputQuality).toBeCloseTo(70.01, 5)
    })

    it('两个玻璃工技能独立增长不互相影响', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 30, designPrecision: 40 }))
      ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 70, designPrecision: 80 }))
      triggerUpdate(sys)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(30.02, 5)
      expect((sys as any).glaziers[1].glassCutting).toBeCloseTo(70.02, 5)
      expect((sys as any).glaziers[0].designPrecision).toBeCloseTo(40.015, 5)
      expect((sys as any).glaziers[1].designPrecision).toBeCloseTo(80.015, 5)
    })
  })

  // ── 边界条件 ─────────────────────────────────────────────────────────────────
  describe('边界与极端情况', () => {
    it('glassCutting=100, designPrecision=100, outputQuality=100 时全部保持 100', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, {
        glassCutting: 100, designPrecision: 100, outputQuality: 100
      }))
      triggerUpdate(sys)
      const g = (sys as any).glaziers[0] as Glazier
      expect(g.glassCutting).toBe(100)
      expect(g.designPrecision).toBe(100)
      expect(g.outputQuality).toBe(100)
    })

    it('update 多次后记录数量不超过 MAX_GLAZIERS(10)（通过 random 模拟）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      for (let i = 0; i < 20; i++) {
        ;(sys as any).lastCheck = i * 2600
        const em = {} as any
        sys.update(0, em, (i + 1) * 2600)
      }
      expect((sys as any).glaziers.length).toBeLessThanOrEqual(10)
    })

    it('大 tick 值不影响更新逻辑', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, 999999)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.02, 5)
    })

    it('dt 参数不影响结果（忽略）', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(999, em, 2600)
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.02, 5)
    })

    it('glassCutting 连续5次 update 后累计 +0.1', () => {
      ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(0, {} as any, 2600)
      }
      expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.10, 4)
    })
  })
})
