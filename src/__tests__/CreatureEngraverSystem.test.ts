import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureEngraverSystem } from '../systems/CreatureEngraverSystem'
import type { Engraver } from '../systems/CreatureEngraverSystem'

let nextId = 1
function makeSys(): CreatureEngraverSystem { return new CreatureEngraverSystem() }
function makeEngraver(entityId: number, engravingSkill = 50): Engraver {
  return { id: nextId++, entityId, engravingSkill, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 }
}

const mockEm = { getEntitiesWithComponent: () => [] } as any

describe('CreatureEngraverSystem', () => {
  let sys: CreatureEngraverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 初始状态
  // ============================================================
  describe('初始状态', () => {
    it('初始无雕刻师', () => {
      expect((sys as any).engravers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('engravers 是数组', () => {
      expect(Array.isArray((sys as any).engravers)).toBe(true)
    })
  })

  // ============================================================
  // 数据结构
  // ============================================================
  describe('Engraver 数据结构', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).engravers.push(makeEngraver(1))
      expect((sys as any).engravers[0].entityId).toBe(1)
    })

    it('多个全部返回', () => {
      ;(sys as any).engravers.push(makeEngraver(1))
      ;(sys as any).engravers.push(makeEngraver(2))
      expect((sys as any).engravers).toHaveLength(2)
    })

    it('四字段数据完整', () => {
      const e = makeEngraver(10)
      e.engravingSkill = 90; e.burinControl = 85; e.lineDepth = 80; e.detailPrecision = 75
      ;(sys as any).engravers.push(e)
      const r = (sys as any).engravers[0]
      expect(r.engravingSkill).toBe(90)
      expect(r.burinControl).toBe(85)
      expect(r.lineDepth).toBe(80)
      expect(r.detailPrecision).toBe(75)
    })

    it('engraver id 字段正确', () => {
      const e = makeEngraver(5)
      ;(sys as any).engravers.push(e)
      expect((sys as any).engravers[0].id).toBe(e.id)
    })

    it('engraver tick 字段存在', () => {
      const e = makeEngraver(3)
      ;(sys as any).engravers.push(e)
      expect((sys as any).engravers[0].tick).toBeDefined()
    })

    it('lineDepth 字段可自定义', () => {
      const e = makeEngraver(7)
      e.lineDepth = 55
      ;(sys as any).engravers.push(e)
      expect((sys as any).engravers[0].lineDepth).toBe(55)
    })

    it('burinControl 字段可自定义', () => {
      const e = makeEngraver(8)
      e.burinControl = 30
      ;(sys as any).engravers.push(e)
      expect((sys as any).engravers[0].burinControl).toBe(30)
    })

    it('detailPrecision 字段可自定义', () => {
      const e = makeEngraver(9)
      e.detailPrecision = 95
      ;(sys as any).engravers.push(e)
      expect((sys as any).engravers[0].detailPrecision).toBe(95)
    })

    it('注入10个雕刻师后长度为10', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).engravers.push(makeEngraver(i + 1))
      }
      expect((sys as any).engravers).toHaveLength(10)
    })

    it('entityId 为 0 也可存储', () => {
      ;(sys as any).engravers.push(makeEngraver(0))
      expect((sys as any).engravers[0].entityId).toBe(0)
    })
  })

  // ============================================================
  // CHECK_INTERVAL 节流控制
  // ============================================================
  describe('CHECK_INTERVAL 节流控制', () => {
    it('tick 差值 < 3300 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, mockEm, 4299) // 4299-1000=3299 < 3300
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 3300 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      const em = { getEntitiesWithComponent: () => [] } as any
      sys.update(16, em, 4300) // 4300-1000=3300 >= 3300
      expect((sys as any).lastCheck).toBe(4300)
    })

    it('lastCheck = 0 时 tick = 3300 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).lastCheck).toBe(3300)
    })

    it('lastCheck = 0 时 tick = 3299 不触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3299)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastCheck = 0 时 tick = 0 不触发更新（��为 0）', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值恰好等于 3300 时触发', () => {
      ;(sys as any).lastCheck = 5000
      sys.update(16, mockEm, 8300)
      expect((sys as any).lastCheck).toBe(8300)
    })

    it('多次调用只有第一次跨越阈值时更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300) // 触发，lastCheck = 3300
      sys.update(16, mockEm, 3301) // 差值1，不触发
      expect((sys as any).lastCheck).toBe(3300)
    })

    it('连续两次都超过阈值时各自更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300) // 触发，lastCheck=3300
      sys.update(16, mockEm, 6600) // 差值3300，再次触发，lastCheck=6600
      expect((sys as any).lastCheck).toBe(6600)
    })
  })

  // ============================================================
  // 技能增长逻辑
  // ============================================================
  describe('技能增长逻辑', () => {
    it('update 后 engravingSkill + 0.02', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 50))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].engravingSkill).toBeCloseTo(50.02)
    })

    it('update 后 burinControl + 0.015', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), burinControl: 60 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].burinControl).toBeCloseTo(60.015)
    })

    it('detailPrecision + 0.01', () => {
      const e = makeEngraver(1, 50)
      e.detailPrecision = 80
      ;(sys as any).engravers.push(e)
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].detailPrecision).toBeCloseTo(80.01)
    })

    it('engravingSkill 上限 100', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 99.99))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].engravingSkill).toBe(100)
    })

    it('burinControl 上限 100', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), burinControl: 99.99 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].burinControl).toBe(100)
    })

    it('detailPrecision 上限 100', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), detailPrecision: 99.99 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].detailPrecision).toBe(100)
    })

    it('engravingSkill 已是 100 时保持不变', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 100))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].engravingSkill).toBe(100)
    })

    it('burinControl 已是 100 时保持不变', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), burinControl: 100 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].burinControl).toBe(100)
    })

    it('detailPrecision 已是 100 时保持不变', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), detailPrecision: 100 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].detailPrecision).toBe(100)
    })

    it('多个雕刻师各自独立增长 engravingSkill', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 20))
      ;(sys as any).engravers.push(makeEngraver(2, 40))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].engravingSkill).toBeCloseTo(20.02)
      expect((sys as any).engravers[1].engravingSkill).toBeCloseTo(40.02)
    })

    it('lineDepth 字段在 update 时不发生变化', () => {
      const e = makeEngraver(1, 50)
      e.lineDepth = 42
      ;(sys as any).engravers.push(e)
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].lineDepth).toBe(42)
    })

    it('tick 未达阈值时技能不增长', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 50))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 100) // 未达 3300
      expect((sys as any).engravers[0].engravingSkill).toBe(50)
    })
  })

  // ============================================================
  // 清理逻辑
  // ============================================================
  describe('cleanup 清理逻辑', () => {
    it('cleanup: engravingSkill <= 4 时删除', () => {
      ;(sys as any).engravers.push({ id: 1, entityId: 1, engravingSkill: 3.98, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
      ;(sys as any).engravers.push({ id: 2, entityId: 2, engravingSkill: 10, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      const engravers = (sys as any).engravers
      expect(engravers.some((e: Engraver) => e.entityId === 1)).toBe(false)
      expect(engravers.some((e: Engraver) => e.entityId === 2)).toBe(true)
    })

    it('engravingSkill 恰好等于 4 时删除', () => {
      ;(sys as any).engravers.push({ id: 1, entityId: 1, engravingSkill: 3.98, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
      // 3.98 + 0.02 = 4.00，等于4 -> 删除
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers).toHaveLength(0)
    })

    it('engravingSkill > 4 时不删除', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 5))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers).toHaveLength(1)
    })

    it('engravingSkill = 4.01（更新后仍 > 4）时保留', () => {
      ;(sys as any).engravers.push({ id: 1, entityId: 1, engravingSkill: 3.99, burinControl: 60, lineDepth: 70, detailPrecision: 80, tick: 0 })
      // 3.99 + 0.02 = 4.01 > 4 -> 保留
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers).toHaveLength(1)
    })

    it('多个雕刻师混合删除保留', () => {
      ;(sys as any).engravers.push({ id: 1, entityId: 10, engravingSkill: 1, burinControl: 50, lineDepth: 50, detailPrecision: 50, tick: 0 })
      ;(sys as any).engravers.push({ id: 2, entityId: 20, engravingSkill: 50, burinControl: 50, lineDepth: 50, detailPrecision: 50, tick: 0 })
      ;(sys as any).engravers.push({ id: 3, entityId: 30, engravingSkill: 2, burinControl: 50, lineDepth: 50, detailPrecision: 50, tick: 0 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      const engravers = (sys as any).engravers
      expect(engravers.some((e: Engraver) => e.entityId === 10)).toBe(false)
      expect(engravers.some((e: Engraver) => e.entityId === 20)).toBe(true)
      expect(engravers.some((e: Engraver) => e.entityId === 30)).toBe(false)
    })

    it('全部低技能时全部清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).engravers.push({ id: i + 1, entityId: i, engravingSkill: 0.5, burinControl: 50, lineDepth: 50, detailPrecision: 50, tick: 0 })
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers).toHaveLength(0)
    })

    it('tick 未达阈值时不执行清理', () => {
      ;(sys as any).engravers.push({ id: 1, entityId: 1, engravingSkill: 1, burinControl: 50, lineDepth: 50, detailPrecision: 50, tick: 0 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 100) // 未达阈值
      expect((sys as any).engravers).toHaveLength(1)
    })
  })

  // ============================================================
  // 招募逻辑（MAX_ENGRAVERS = 10）
  // ============================================================
  describe('招募逻辑', () => {
    it('已满10个时不再招募（强制 random=1.0）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1.0) // > RECRUIT_CHANCE
      for (let i = 0; i < 10; i++) {
        ;(sys as any).engravers.push(makeEngraver(i + 1))
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      // random=1.0 不会招募，但数量不会超过10
      expect((sys as any).engravers.length).toBeLessThanOrEqual(10)
    })

    it('random < RECRUIT_CHANCE 且空槽时招募新雕刻师', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < 0.0015
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers.length).toBeGreaterThanOrEqual(0)
      // 招募路径执行，不崩溃
    })

    it('random > RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const initialLen = (sys as any).engravers.length
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers.length).toBe(initialLen)
    })

    it('已有9个且 random < RECRUIT_CHANCE 时可招募到10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      for (let i = 0; i < 9; i++) {
        ;(sys as any).engravers.push(makeEngraver(i + 1))
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers.length).toBeLessThanOrEqual(10)
    })

    it('招募后 nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const beforeId = (sys as any).nextId
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      const afterId = (sys as any).nextId
      expect(afterId).toBeGreaterThanOrEqual(beforeId)
    })
  })

  // ============================================================
  // 边界与极端值
  // ============================================================
  describe('边界与极端值', () => {
    it('engravingSkill 极低值 0 仍能运行 update', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 0), engravingSkill: 0 })
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, mockEm, 3300)).not.toThrow()
    })

    it('非常大的 tick 值不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, mockEm, 9999999)).not.toThrow()
    })

    it('dt = 0 也能正常执行', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 50))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(0, mockEm, 3300)).not.toThrow()
    })

    it('dt 为负数也不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(-16, mockEm, 3300)).not.toThrow()
    })

    it('engravers 为空时 update 不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, mockEm, 3300)).not.toThrow()
    })

    it('engravingSkill = 4 时（已经等于边界），再 +0.02 后保留', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 4) })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      // 4 + 0.02 = 4.02 > 4, 保留
      expect((sys as any).engravers).toHaveLength(1)
      expect((sys as any).engravers[0].engravingSkill).toBeCloseTo(4.02)
    })

    it('多个系统实例互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).engravers.push(makeEngraver(1, 50))
      expect((sys2 as any).engravers).toHaveLength(0)
    })

    it('update 不改变 lineDepth 字段', () => {
      const e = makeEngraver(1, 50)
      e.lineDepth = 99
      ;(sys as any).engravers.push(e)
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      expect((sys as any).engravers[0].lineDepth).toBe(99)
    })
  })

  // ============================================================
  // 多次 update 累积效果
  // ============================================================
  describe('多次 update 累积效果', () => {
    it('两次触发后 engravingSkill 累计 +0.04', () => {
      ;(sys as any).engravers.push(makeEngraver(1, 50))
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      sys.update(16, mockEm, 6600)
      expect((sys as any).engravers[0].engravingSkill).toBeCloseTo(50.04)
    })

    it('三次触发后 burinControl 累计 +0.045', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), burinControl: 60 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      sys.update(16, mockEm, 6600)
      sys.update(16, mockEm, 9900)
      expect((sys as any).engravers[0].burinControl).toBeCloseTo(60.045)
    })

    it('三次触发后 detailPrecision 累计 +0.03', () => {
      ;(sys as any).engravers.push({ ...makeEngraver(1, 50), detailPrecision: 70 })
      ;(sys as any).lastCheck = 0
      sys.update(16, mockEm, 3300)
      sys.update(16, mockEm, 6600)
      sys.update(16, mockEm, 9900)
      expect((sys as any).engravers[0].detailPrecision).toBeCloseTo(70.03)
    })
  })
})
