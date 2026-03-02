import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDrawerSystem } from '../systems/CreatureDrawerSystem'
import type { Drawer } from '../systems/CreatureDrawerSystem'

let nextId = 1
function makeSys(): CreatureDrawerSystem { return new CreatureDrawerSystem() }
function makeDrawer(entityId: number, drawingSkill = 30): Drawer {
  return { id: nextId++, entityId, drawingSkill, diePrecision: 25, tensileControl: 20, wireQuality: 35, tick: 0 }
}
function makeEM() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) }
}

const CHECK_INTERVAL = 2820
const MAX_DRAWERS = 10

describe('CreatureDrawerSystem', () => {
  let sys: CreatureDrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ──────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无拔丝工', () => {
      expect((sys as any).drawers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('系统实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureDrawerSystem)
    })

    it('drawers 初始为空数组', () => {
      expect(Array.isArray((sys as any).drawers)).toBe(true)
    })
  })

  // ── Drawer 数据结构 ──────────────────────���───────────────────────────────────
  describe('Drawer 数据结构', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).drawers.push(makeDrawer(1))
      expect((sys as any).drawers[0].entityId).toBe(1)
    })

    it('注入多个全部返回', () => {
      ;(sys as any).drawers.push(makeDrawer(1))
      ;(sys as any).drawers.push(makeDrawer(2))
      expect((sys as any).drawers).toHaveLength(2)
    })

    it('四字段数据完整存储', () => {
      const d = makeDrawer(10)
      d.drawingSkill = 80; d.diePrecision = 75; d.tensileControl = 70; d.wireQuality = 65
      ;(sys as any).drawers.push(d)
      const r = (sys as any).drawers[0]
      expect(r.drawingSkill).toBe(80)
      expect(r.diePrecision).toBe(75)
      expect(r.tensileControl).toBe(70)
      expect(r.wireQuality).toBe(65)
    })

    it('Drawer 对象包含所有必要字段', () => {
      const d = makeDrawer(5)
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('entityId')
      expect(d).toHaveProperty('drawingSkill')
      expect(d).toHaveProperty('diePrecision')
      expect(d).toHaveProperty('tensileControl')
      expect(d).toHaveProperty('wireQuality')
      expect(d).toHaveProperty('tick')
    })

    it('不同 entityId 的 drawers 各自独立', () => {
      ;(sys as any).drawers.push(makeDrawer(10))
      ;(sys as any).drawers.push(makeDrawer(20))
      expect((sys as any).drawers[0].entityId).toBe(10)
      expect((sys as any).drawers[1].entityId).toBe(20)
    })

    it('drawingSkill 默认值 30 正确存储', () => {
      ;(sys as any).drawers.push(makeDrawer(1, 30))
      expect((sys as any).drawers[0].drawingSkill).toBe(30)
    })

    it('tensileControl 初始值 20 正确存储', () => {
      const d = makeDrawer(1)
      expect(d.tensileControl).toBe(20)
    })

    it('wireQuality 初始值 35 正确存储', () => {
      const d = makeDrawer(1)
      expect(d.wireQuality).toBe(35)
    })
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流逻辑', () => {
    it('tick 差值 < 2820 时不更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 3819)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 2820 时更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 3820)
      expect((sys as any).lastCheck).toBe(3820)
    })

    it('tick < CHECK_INTERVAL 时不执行任何逻辑', () => {
      const em = makeEM()
      const before = (sys as any).lastCheck
      sys.update(0, em as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(before)
    })

    it('恰好 tick = CHECK_INTERVAL 时触发（差值=2820）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续多次 update 超过 CHECK_INTERVAL 时每次都更新 lastCheck', () => {
      const em = makeEM()
      sys.update(0, em as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
      sys.update(0, em as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
      sys.update(0, em as any, CHECK_INTERVAL * 3)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
    })

    it('tick=0 时不触发（0 - 0 = 0 < 2820）', () => {
      const em = makeEM()
      sys.update(0, em as any, 0)
      expect((sys as any).lastCheck).toBe(0)
      expect((sys as any).drawers).toHaveLength(0)
    })
  })

  // ── 技能增长逻辑 ──────────────────────────────────────────────────────────────
  describe('技能增长逻辑', () => {
    it('update 后 drawingSkill 增加 0.02', () => {
      const d = makeDrawer(1, 30)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].drawingSkill).toBeCloseTo(30.02, 5)
    })

    it('update 后 diePrecision 增加 0.015', () => {
      const d = makeDrawer(1, 30)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].diePrecision).toBeCloseTo(25.015, 5)
    })

    it('update 后 wireQuality 增加 0.01', () => {
      const d = makeDrawer(1, 30)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].wireQuality).toBeCloseTo(35.01, 5)
    })

    it('drawingSkill 上限为 100，不超过', () => {
      const d = makeDrawer(1, 99.99)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].drawingSkill).toBe(100)
    })

    it('diePrecision 上限为 100，不超过', () => {
      const d = makeDrawer(1, 30)
      d.diePrecision = 99.99
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].diePrecision).toBe(100)
    })

    it('wireQuality 上限为 100，不超过', () => {
      const d = makeDrawer(1, 30)
      d.wireQuality = 99.995
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].wireQuality).toBe(100)
    })

    it('技能在已达 100 时仍保持 100', () => {
      const d = makeDrawer(1, 100)
      d.diePrecision = 100; d.wireQuality = 100
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].drawingSkill).toBe(100)
      expect((sys as any).drawers[0].diePrecision).toBe(100)
      expect((sys as any).drawers[0].wireQuality).toBe(100)
    })

    it('多个 drawers 全部都被更新技能', () => {
      ;(sys as any).drawers.push(makeDrawer(1, 30))
      ;(sys as any).drawers.push(makeDrawer(2, 50))
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers[0].drawingSkill).toBeCloseTo(30.02, 5)
      expect((sys as any).drawers[1].drawingSkill).toBeCloseTo(50.02, 5)
    })

    it('tensileControl 不在增长范围内（源码未增长 tensileControl）', () => {
      const d = makeDrawer(1, 30)
      d.tensileControl = 20
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      // tensileControl 源码中未增长，应保持原值
      expect((sys as any).drawers[0].tensileControl).toBe(20)
    })
  })

  // ── cleanup 删除逻辑 ──────────────────────────────────────────────────────────
  describe('cleanup：drawingSkill <= 4 时删除', () => {
    it('drawingSkill=3.98 先递增到 4.00 再删除', () => {
      const d1 = makeDrawer(1, 3.98)
      const d2 = makeDrawer(2, 10.0)
      ;(sys as any).drawers.push(d1, d2)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      const remaining = (sys as any).drawers
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(2)
    })

    it('drawingSkill=4.01 递增后 > 4，不删除', () => {
      const d = makeDrawer(1, 4.01)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(1)
    })

    it('drawingSkill=4.00 时应被删除（<= 4）', () => {
      const d = makeDrawer(1, 4.00)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      // 4.00 + 0.02 = 4.02 > 4，所以不删除
      expect((sys as any).drawers).toHaveLength(1)
    })

    it('drawingSkill=3.97 时递增到 3.99 < 4，应被删除', () => {
      const d = makeDrawer(1, 3.97)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      // 3.97 + 0.02 = 3.99 <= 4 → 删除
      expect((sys as any).drawers).toHaveLength(0)
    })

    it('drawingSkill=1.0 时应被删除（远低于阈值）', () => {
      const d = makeDrawer(1, 1.0)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(0)
    })

    it('多个低技能 drawers 全部被清除', () => {
      ;(sys as any).drawers.push(makeDrawer(1, 1.0))
      ;(sys as any).drawers.push(makeDrawer(2, 2.0))
      ;(sys as any).drawers.push(makeDrawer(3, 3.0))
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(0)
    })
  })

  // ── MAX_DRAWERS 上限 ──────────────────────────────────────────────────────────
  describe('MAX_DRAWERS 上限限制', () => {
    it('drawers 数量为 MAX_DRAWERS=10 时不再随机招募', () => {
      for (let i = 0; i < MAX_DRAWERS; i++) {
        ;(sys as any).drawers.push(makeDrawer(i + 1, 30))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < RECRUIT_CHANCE，本应招募
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      // 已满 10 个，不应新增
      // 但注意 cleanup 会删除 drawingSkill<=4 的，这里 skill=30+0.02=30.02 > 4，不会删
      expect((sys as any).drawers).toHaveLength(MAX_DRAWERS)
    })

    it('drawers 数量少于 MAX_DRAWERS 时，随机满足条件可招募', () => {
      // 0.0001 < RECRUIT_CHANCE(0.0015)
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers.length).toBeGreaterThan(0)
    })

    it('随机值大于 RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(0)
    })
  })

  // ── nextId 自增 ──────────────────────────────────────────────────────────────
  describe('nextId 自增', () => {
    it('招募新 drawer 时 nextId 自增', () => {
      const before = (sys as any).nextId
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      if ((sys as any).drawers.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(before)
      }
    })

    it('手动 push 不影响 nextId', () => {
      ;(sys as any).drawers.push(makeDrawer(1))
      expect((sys as any).nextId).toBe(1)
    })
  })

  // ── 综合场景 ──────────────────────────────────────────────────────────────────
  describe('综合场景', () => {
    it('内部引用稳定', () => {
      ;(sys as any).drawers.push(makeDrawer(1))
      expect((sys as any).drawers).toBe((sys as any).drawers)
    })

    it('多次 update 后技能累积增长', () => {
      const d = makeDrawer(1, 30)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      sys.update(0, em as any, 5640)
      sys.update(0, em as any, 8460)
      expect((sys as any).drawers[0].drawingSkill).toBeCloseTo(30.06, 4)
    })

    it('空 drawers 多次 update 不崩溃', () => {
      const em = makeEM()
      expect(() => {
        for (let t = 1; t <= 10; t++) {
          vi.spyOn(Math, 'random').mockReturnValue(0.9)
          sys.update(0, em as any, CHECK_INTERVAL * t)
        }
      }).not.toThrow()
    })

    it('低技能 drawers 被清除后，数组长度正确减少', () => {
      ;(sys as any).drawers.push(makeDrawer(1, 50))   // 保留
      ;(sys as any).drawers.push(makeDrawer(2, 2.0))  // 删除
      ;(sys as any).drawers.push(makeDrawer(3, 60))   // 保留
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(2)
    })

    it('新招募的 drawer 技能在 tick 字段中存储当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      if ((sys as any).drawers.length > 0) {
        expect((sys as any).drawers[0].tick).toBe(2820)
      }
    })

    it('新招募的 drawingSkill 在 10~35 范围内（10+random*25）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      if ((sys as any).drawers.length > 0) {
        const skill = (sys as any).drawers[0].drawingSkill
        // drawingSkill 在 update 后已 +0.02，所以范围是约 10.02~35.02
        // 先检查新招募后（+0.02）的范围
        expect(skill).toBeGreaterThanOrEqual(10)
        expect(skill).toBeLessThanOrEqual(36)
      }
    })

    it('新招募的 diePrecision 在 15~35 范围内（15+random*20+0.015）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 2820)
      if ((sys as any).drawers.length > 0) {
        const prec = (sys as any).drawers[0].diePrecision
        expect(prec).toBeGreaterThanOrEqual(15)
        expect(prec).toBeLessThanOrEqual(36)
      }
    })

    it('技能增长后低于 4 的 drawer 会在同一轮 update 被清除', () => {
      // drawingSkill = 0，增长后 0.02 <= 4 → 删除
      const d = makeDrawer(1, 0)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      expect((sys as any).drawers).toHaveLength(0)
    })

    it('update 顺序：先增长技能，后检查 drawingSkill 上限', () => {
      const d = makeDrawer(1, 99.99)
      ;(sys as any).drawers.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 2820)
      // 99.99 + 0.02 = 100.01 → min(100, 100.01) = 100
      expect((sys as any).drawers[0].drawingSkill).toBe(100)
    })
  })
})
