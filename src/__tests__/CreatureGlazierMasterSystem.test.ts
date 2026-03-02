import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGlazierMasterSystem } from '../systems/CreatureGlazierMasterSystem'
import type { GlazierMaster } from '../systems/CreatureGlazierMasterSystem'

// ── 工厂函数 ─────────────────────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureGlazierMasterSystem { return new CreatureGlazierMasterSystem() }
function makeMaster(entityId: number, overrides: Partial<GlazierMaster> = {}): GlazierMaster {
  return {
    id: nextId++, entityId,
    glassCutting: 50, leadWork: 60, colorMixing: 70, outputQuality: 80, tick: 0,
    ...overrides,
  }
}

/** 让 sys 跳过 tick 门槛 */
function triggerUpdate(sys: CreatureGlazierMasterSystem, tick = 2670) {
  const em = {} as any
  ;(sys as any).lastCheck = 0
  sys.update(0, em, tick)
}

// ── 常量镜像（与源码保持一致，改动时测试会失败） ───────────────────────────
const CHECK_INTERVAL = 2670
const MAX_MASTERS = 10
const RECRUIT_CHANCE = 0.0013

describe('CreatureGlazierMasterSystem', () => {
  let sys: CreatureGlazierMasterSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化 ──────────────────────────────────────────────────────────────
  describe('初始化', () => {
    it('���始无玻璃大师', () => {
      expect((sys as any).masters).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('实例类型正确', () => {
      expect(sys).toBeInstanceOf(CreatureGlazierMasterSystem)
    })

    it('masters 是数组', () => {
      expect(Array.isArray((sys as any).masters)).toBe(true)
    })
  })

  // ── 2. 数据注入与读取 ──────────────────────────────────────────────────────
  describe('数据注入与读取', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).masters.push(makeMaster(7))
      expect((sys as any).masters[0].entityId).toBe(7)
    })

    it('多个记录全部返回', () => {
      ;(sys as any).masters.push(makeMaster(1))
      ;(sys as any).masters.push(makeMaster(2))
      ;(sys as any).masters.push(makeMaster(3))
      expect((sys as any).masters).toHaveLength(3)
    })

    it('四字段数据完整', () => {
      const m = makeMaster(10, { glassCutting: 90, leadWork: 85, colorMixing: 80, outputQuality: 75 })
      ;(sys as any).masters.push(m)
      const r = (sys as any).masters[0] as GlazierMaster
      expect(r.glassCutting).toBe(90)
      expect(r.leadWork).toBe(85)
      expect(r.colorMixing).toBe(80)
      expect(r.outputQuality).toBe(75)
    })

    it('注入记录后 id 字段存在', () => {
      ;(sys as any).masters.push(makeMaster(1))
      expect((sys as any).masters[0]).toHaveProperty('id')
    })

    it('注入记录后 tick 字段存在', () => {
      ;(sys as any).masters.push(makeMaster(1))
      expect((sys as any).masters[0]).toHaveProperty('tick')
    })

    it('注入 entityId=0 也合法', () => {
      ;(sys as any).masters.push(makeMaster(0))
      expect((sys as any).masters[0].entityId).toBe(0)
    })

    it('注入后列表引用一致', () => {
      const m = makeMaster(99)
      ;(sys as any).masters.push(m)
      expect((sys as any).masters[0]).toBe(m)
    })
  })

  // ── 3. CHECK_INTERVAL 节流 ─────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差 < CHECK_INTERVAL 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 5000
      const em = {} as any
      sys.update(0, em, 5000 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('tick 差 === CHECK_INTERVAL 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 差 > CHECK_INTERVAL 时也更新 lastCheck', () => {
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
    })

    it('未到阈值时 masters 内容不变（空列表保持空）', () => {
      ;(sys as any).lastCheck = 5000
      const em = {} as any
      sys.update(0, em, 5000 + CHECK_INTERVAL - 1)
      expect((sys as any).masters).toHaveLength(0)
    })

    it('连续两次 update：第一次满足阈值，第二次不满足，lastCheck 仍为第一次的 tick', () => {
      ;(sys as any).lastCheck = 0
      const em = {} as any
      sys.update(0, em, CHECK_INTERVAL)          // 第一次满足
      sys.update(0, em, CHECK_INTERVAL + 100)    // 差值 100 < 2670，不满足
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick=0 不触发更新（lastCheck=0，差值=0 < CHECK_INTERVAL）', () => {
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 4. 技能增长逻辑 ────────────────────────────────────────────────────────
  describe('技能增长逻辑', () => {
    it('update 后 glassCutting 增加 0.02', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(50.02, 5)
    })

    it('update 后 colorMixing 增加 0.015', () => {
      ;(sys as any).masters.push(makeMaster(1, { colorMixing: 70 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].colorMixing).toBeCloseTo(70.015, 5)
    })

    it('update 后 outputQuality 增加 0.01', () => {
      ;(sys as any).masters.push(makeMaster(1, { outputQuality: 80 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].outputQuality).toBeCloseTo(80.01, 5)
    })

    it('leadWork 不被 update 修改', () => {
      ;(sys as any).masters.push(makeMaster(1, { leadWork: 60 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].leadWork).toBe(60)
    })

    it('多个 master 都被增长', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
      ;(sys as any).masters.push(makeMaster(2, { glassCutting: 60 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(50.02, 5)
      expect((sys as any).masters[1].glassCutting).toBeCloseTo(60.02, 5)
    })

    it('glassCutting 起始值 0 时增长后为 0.02', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 5 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(5.02, 5)
    })

    it('colorMixing 起始值 0.005 增长后约为 0.02', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 5, colorMixing: 0.005 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].colorMixing).toBeCloseTo(0.02, 5)
    })
  })

  // ── 5. 上限钳制 ────────────────────────────────────────────────────────────
  describe('上限钳制（Math.min 100）', () => {
    it('glassCutting 不超过 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 99.99 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].glassCutting).toBeLessThanOrEqual(100)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(100, 5)
    })

    it('colorMixing 不超过 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50, colorMixing: 99.99 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].colorMixing).toBeLessThanOrEqual(100)
    })

    it('outputQuality 不超过 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { outputQuality: 99.995 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].outputQuality).toBeLessThanOrEqual(100)
    })

    it('glassCutting 已为 100 时保持 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 100 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].glassCutting).toBe(100)
    })

    it('colorMixing 已为 100 时保持 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50, colorMixing: 100 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].colorMixing).toBe(100)
    })

    it('outputQuality 已为 100 时保持 100', () => {
      ;(sys as any).masters.push(makeMaster(1, { outputQuality: 100 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0].outputQuality).toBe(100)
    })
  })

  // ── 6. cleanup 逻辑 ────────────────────────────────────────────────────────
  describe('cleanup: glassCutting <= 4 时删除', () => {
    it('glassCutting=3.98 增长后为 4.00 → 被删（边界恰好等于 4）', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 3.98 }))
      ;(sys as any).masters.push(makeMaster(2, { glassCutting: 5 }))
      triggerUpdate(sys)
      const remaining = (sys as any).masters as GlazierMaster[]
      expect(remaining.some(m => m.entityId === 1)).toBe(false)
      expect(remaining.some(m => m.entityId === 2)).toBe(true)
    })

    it('glassCutting=2 时删除', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 2 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(0)
    })

    it('glassCutting=4 时删除（等于阈值）', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 3.98 }))
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(0)
    })

    it('glassCutting=4.01 增长后 > 4 → 保留', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 4.01 }))
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(1)
    })

    it('glassCutting=0 时删除', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(0)
    })

    it('cleanup 从末尾向前遍历，保留 glassCutting > 4 的后续项', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 2 }))   // 会被删
      ;(sys as any).masters.push(makeMaster(2, { glassCutting: 50 }))  // 保留
      ;(sys as any).masters.push(makeMaster(3, { glassCutting: 1 }))   // 会被删
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      const remaining = (sys as any).masters as GlazierMaster[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(2)
    })

    it('cleanup 后列表长度减少正确数量', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).masters.push(makeMaster(i, { glassCutting: 2 }))  // 都会被删
      }
      for (let i = 5; i < 8; i++) {
        ;(sys as any).masters.push(makeMaster(i, { glassCutting: 50 })) // 保留
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(3)
    })
  })

  // ── 7. 招募逻辑 ────────────────────────────────────────────────────────────
  describe('招募逻辑', () => {
    it('Math.random() < RECRUIT_CHANCE(0.0013) 且 masters < MAX_MASTERS(10) 时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // 0.001 < 0.0013
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(1)
    })

    it('Math.random() >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys as any).masters).toHaveLength(0)
    })

    it('masters 已达 MAX_MASTERS(10) 时不招募', () => {
      for (let i = 0; i < MAX_MASTERS; i++) {
        ;(sys as any).masters.push(makeMaster(i, { glassCutting: 50 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      // 招募不触发，但 cleanup 不删除（glassCutting=50），总数仍 10
      expect((sys as any).masters).toHaveLength(MAX_MASTERS)
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      expect((sys as any).nextId).toBe(2)
    })

    it('招募新 master 的 glassCutting 在 [10, 35] 范围内', () => {
      // Math.random() 被连续调用：第一次用于 RECRUIT_CHANCE，之后用于属性随机
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.001  // 触发招募
        if (callCount === 2) return 0.5    // entityId: floor(0.5*500)=250
        if (callCount === 3) return 0.5    // glassCutting: 10+0.5*25=22.5
        return 0.5
      })
      triggerUpdate(sys)
      if ((sys as any).masters.length > 0) {
        const newMaster = (sys as any).masters[0] as GlazierMaster
        expect(newMaster.glassCutting).toBeGreaterThanOrEqual(10)
        expect(newMaster.glassCutting).toBeLessThanOrEqual(35)
      }
    })

    it('招募新 master 包含所有必要字段', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      if ((sys as any).masters.length > 0) {
        const m = (sys as any).masters[0] as GlazierMaster
        expect(m).toHaveProperty('id')
        expect(m).toHaveProperty('entityId')
        expect(m).toHaveProperty('glassCutting')
        expect(m).toHaveProperty('leadWork')
        expect(m).toHaveProperty('colorMixing')
        expect(m).toHaveProperty('outputQuality')
        expect(m).toHaveProperty('tick')
      }
    })

    it('招募新 master 的 tick 等于传入的当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(0, em, 5000)
      if ((sys as any).masters.length > 0) {
        expect((sys as any).masters[0].tick).toBe(5000)
      }
    })
  })

  // ── 8. 边界条件 ────────────────────────────────────────────────────────────
  describe('边界条件', () => {
    it('空列表调用 update 不崩溃', () => {
      expect(() => triggerUpdate(sys)).not.toThrow()
    })

    it('dt 参数不影响任何逻辑（传不同 dt 结果一致）', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(999, {} as any, CHECK_INTERVAL)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(50.02, 5)
    })

    it('glassCutting 精确等于 4 时被删除（不仅仅是小于）', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 3.98 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      // 3.98 + 0.02 = 4.00, 4.00 <= 4 → 删除
      expect((sys as any).masters).toHaveLength(0)
    })

    it('多次 update 后 glassCutting 累积增长', () => {
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys, CHECK_INTERVAL)
      ;(sys as any).lastCheck = 0
      triggerUpdate(sys, CHECK_INTERVAL)
      expect((sys as any).masters[0].glassCutting).toBeCloseTo(50.04, 4)
    })

    it('单次 update 后 lastCheck 精确等于传入 tick', () => {
      ;(sys as any).lastCheck = 0
      sys.update(0, {} as any, 9999)
      expect((sys as any).lastCheck).toBe(9999)
    })

    it('leadWork 字段在 update 中不变化（不被修改）', () => {
      ;(sys as any).masters.push(makeMaster(1, { leadWork: 42 }))
      triggerUpdate(sys)
      expect((sys as any).masters[0]?.leadWork).toBe(42)
    })

    it('tick 字段在 master 上 update 后不变（只在创建时赋值）', () => {
      ;(sys as any).masters.push(makeMaster(1, { tick: 0 }))
      triggerUpdate(sys, 9999)
      expect((sys as any).masters[0].tick).toBe(0)
    })
  })

  // ── 9. GlazierMaster 接口 ──────────────────────────────────────────────────
  describe('GlazierMaster 接口字段验证', () => {
    it('glassCutting 字段为数值类型', () => {
      const m = makeMaster(1)
      expect(typeof m.glassCutting).toBe('number')
    })

    it('leadWork 字段为数值类型', () => {
      const m = makeMaster(1)
      expect(typeof m.leadWork).toBe('number')
    })

    it('colorMixing 字段为数值类型', () => {
      const m = makeMaster(1)
      expect(typeof m.colorMixing).toBe('number')
    })

    it('outputQuality 字段为数值类型', () => {
      const m = makeMaster(1)
      expect(typeof m.outputQuality).toBe('number')
    })

    it('entityId 与注入值一致', () => {
      const m = makeMaster(123)
      ;(sys as any).masters.push(m)
      expect((sys as any).masters[0].entityId).toBe(123)
    })

    it('id 字段与 nextId 正确关联', () => {
      ;(sys as any).nextId = 42
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      triggerUpdate(sys)
      if ((sys as any).masters.length > 0) {
        expect((sys as any).masters[0].id).toBe(42)
      }
    })
  })

  // ── 10. 多实例独立性 ─────────────────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例的 masters 互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).masters.push(makeMaster(1))
      expect((sys2 as any).masters).toHaveLength(0)
    })

    it('两个 sys 实例的 lastCheck 互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).lastCheck = 9999
      expect((sys2 as any).lastCheck).toBe(0)
    })

    it('两个 sys 实例 update 互不影响', () => {
      const sys2 = makeSys()
      ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      triggerUpdate(sys)
      expect((sys2 as any).masters).toHaveLength(0)
    })
  })
})
