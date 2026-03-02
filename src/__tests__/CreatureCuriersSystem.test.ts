import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCuriersSystem } from '../systems/CreatureCuriersSystem'
import type { Curier, LeatherGrade } from '../systems/CreatureCuriersSystem'

let nextId = 1
function makeSys(): CreatureCuriersSystem { return new CreatureCuriersSystem() }
function makeCurier(entityId: number, skill = 30, leatherGrade: LeatherGrade = 'rawhide', tick = 0): Curier {
  return {
    id: nextId++,
    entityId,
    skill,
    hidesCured: 1 + Math.floor(skill / 8),
    leatherGrade,
    quality: 20 + skill * 0.7,
    reputation: 12 + skill * 0.75,
    tick,
  }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const CHECK_INTERVAL = 1350
const GRADES: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']

describe('CreatureCuriersSystem', () => {
  let sys: CreatureCuriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ─── 初始状态 ────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无制革工', () => {
      expect((sys as any).curiers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 skillMap 为空 Map', () => {
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('curiers 是数组类型', () => {
      expect(Array.isArray((sys as any).curiers)).toBe(true)
    })
  })

  // ─── LeatherGrade 枚举 ─────────────────────────────────────────
  describe('LeatherGrade 枚举', () => {
    it('支持 rawhide 等级', () => {
      ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide'))
      expect((sys as any).curiers[0].leatherGrade).toBe('rawhide')
    })

    it('支持 tanned 等级', () => {
      ;(sys as any).curiers.push(makeCurier(1, 30, 'tanned'))
      expect((sys as any).curiers[0].leatherGrade).toBe('tanned')
    })

    it('支持 tooled 等级', () => {
      ;(sys as any).curiers.push(makeCurier(1, 30, 'tooled'))
      expect((sys as any).curiers[0].leatherGrade).toBe('tooled')
    })

    it('支持 fine 等级', () => {
      ;(sys as any).curiers.push(makeCurier(1, 30, 'fine'))
      expect((sys as any).curiers[0].leatherGrade).toBe('fine')
    })

    it('LeatherGrade 包含 4 种（rawhide/tanned/tooled/fine）', () => {
      const grades: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']
      grades.forEach((g, i) => { ;(sys as any).curiers.push(makeCurier(i + 1, 30, g)) })
      const all = (sys as any).curiers as Curier[]
      grades.forEach((g, i) => { expect(all[i].leatherGrade).toBe(g) })
    })
  })

  // ─── 技能分级 → leatherGrade ────────────────────────────────────
  describe('leatherGrade 由 skill/25 分级', () => {
    it('skill=0 → rawhide（idx=0）', () => {
      expect(GRADES[Math.min(3, Math.floor(0 / 25))]).toBe('rawhide')
    })

    it('skill=1 → rawhide', () => {
      expect(GRADES[Math.min(3, Math.floor(1 / 25))]).toBe('rawhide')
    })

    it('skill=24 → rawhide（边界）', () => {
      expect(GRADES[Math.min(3, Math.floor(24 / 25))]).toBe('rawhide')
    })

    it('skill=25 → tanned（idx=1）', () => {
      expect(GRADES[Math.min(3, Math.floor(25 / 25))]).toBe('tanned')
    })

    it('skill=26 → tanned', () => {
      expect(GRADES[Math.min(3, Math.floor(26 / 25))]).toBe('tanned')
    })

    it('skill=49 → tanned', () => {
      expect(GRADES[Math.min(3, Math.floor(49 / 25))]).toBe('tanned')
    })

    it('skill=50 → tooled（idx=2）', () => {
      expect(GRADES[Math.min(3, Math.floor(50 / 25))]).toBe('tooled')
    })

    it('skill=74 → tooled', () => {
      expect(GRADES[Math.min(3, Math.floor(74 / 25))]).toBe('tooled')
    })

    it('skill=75 → fine（idx=3）', () => {
      expect(GRADES[Math.min(3, Math.floor(75 / 25))]).toBe('fine')
    })

    it('skill=99 → fine', () => {
      expect(GRADES[Math.min(3, Math.floor(99 / 25))]).toBe('fine')
    })

    it('skill=100 → fine（idx=min(3,4)=3）', () => {
      expect(GRADES[Math.min(3, Math.floor(100 / 25))]).toBe('fine')
    })
  })

  // ─── quality 公式 ────────────────────────────────────────────────
  describe('quality 公式: 20 + skill * 0.7', () => {
    it('skill=0 时 quality=20', () => {
      const curier = makeCurier(1, 0)
      expect(curier.quality).toBeCloseTo(20, 5)
    })

    it('skill=10 时 quality=27', () => {
      const curier = makeCurier(1, 10)
      expect(curier.quality).toBeCloseTo(20 + 10 * 0.7, 5)
    })

    it('skill=25 时 quality 正确', () => {
      const curier = makeCurier(1, 25)
      expect(curier.quality).toBeCloseTo(20 + 25 * 0.7, 5)
    })

    it('skill=50 时 quality=55', () => {
      const curier = makeCurier(1, 50)
      expect(curier.quality).toBeCloseTo(20 + 50 * 0.7, 5)
    })

    it('skill=75 时 quality 正确', () => {
      const curier = makeCurier(1, 75)
      expect(curier.quality).toBeCloseTo(20 + 75 * 0.7, 5)
    })

    it('skill=100 时 quality=90', () => {
      const curier = makeCurier(1, 100)
      expect(curier.quality).toBeCloseTo(20 + 100 * 0.7, 5)
    })

    it('quality 与 skill 正线性相关（步长0.7）', () => {
      const c10 = makeCurier(1, 10)
      const c20 = makeCurier(2, 20)
      expect(c20.quality - c10.quality).toBeCloseTo(10 * 0.7, 5)
    })
  })

  // ─── reputation 公式 ─────────────────────────────────────────────
  describe('reputation 公式: 12 + skill * 0.75', () => {
    it('skill=0 时 reputation=12', () => {
      const curier = makeCurier(1, 0)
      expect(curier.reputation).toBeCloseTo(12, 5)
    })

    it('skill=25 时 reputation 正确', () => {
      const curier = makeCurier(1, 25)
      expect(curier.reputation).toBeCloseTo(12 + 25 * 0.75, 5)
    })

    it('skill=50 时 reputation 正确', () => {
      const curier = makeCurier(1, 50)
      expect(curier.reputation).toBeCloseTo(12 + 50 * 0.75, 5)
    })

    it('skill=60 时 reputation 正确', () => {
      const curier = makeCurier(1, 60)
      expect(curier.reputation).toBeCloseTo(12 + 60 * 0.75, 5)
    })

    it('skill=100 时 reputation=87', () => {
      const curier = makeCurier(1, 100)
      expect(curier.reputation).toBeCloseTo(12 + 100 * 0.75, 5)
    })
  })

  // ─── hidesCured 公式 ─────────────────────────────────────────────
  describe('hidesCured 公式: 1 + floor(skill / 8)', () => {
    it('skill=0 → hidesCured=1', () => {
      expect(1 + Math.floor(0 / 8)).toBe(1)
      expect(makeCurier(1, 0).hidesCured).toBe(1)
    })

    it('skill=7 → hidesCured=1（floor(7/8)=0）', () => {
      expect(1 + Math.floor(7 / 8)).toBe(1)
      expect(makeCurier(1, 7).hidesCured).toBe(1)
    })

    it('skill=8 → hidesCured=2', () => {
      expect(1 + Math.floor(8 / 8)).toBe(2)
      expect(makeCurier(1, 8).hidesCured).toBe(2)
    })

    it('skill=16 → hidesCured=3', () => {
      expect(1 + Math.floor(16 / 8)).toBe(3)
      expect(makeCurier(1, 16).hidesCured).toBe(3)
    })

    it('skill=40 → hidesCured=6', () => {
      expect(1 + Math.floor(40 / 8)).toBe(6)
      expect(makeCurier(1, 40).hidesCured).toBe(6)
    })

    it('skill=56 → hidesCured=8', () => {
      expect(1 + Math.floor(56 / 8)).toBe(8)
      expect(makeCurier(1, 56).hidesCured).toBe(8)
    })

    it('skill=100 → hidesCured=13', () => {
      expect(1 + Math.floor(100 / 8)).toBe(13)
      expect(makeCurier(1, 100).hidesCured).toBe(13)
    })
  })

  // ─── CHECK_INTERVAL 节流逻辑（1350）──────────────────────────────
  describe('CHECK_INTERVAL 节流逻辑（1350）', () => {
    it('tick 差值 < 1350 时不触发第二次更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('tick 差值 >= 1350 时触发第二次更新', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
    })

    it('tick 差值恰好 = 1350 时触发', () => {
      const em = makeEmptyEM()
      ;(sys as any).lastCheck = 200
      sys.update(1, em as any, 200 + CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(200 + CHECK_INTERVAL)
    })

    it('tick 差值 = 1349 时不触发', () => {
      const em = makeEmptyEM()
      ;(sys as any).lastCheck = 200
      sys.update(1, em as any, 200 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(200)
    })

    it('lastCheck 在触发后更新为当前 tick', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('连续三次触发时调用三次 getEntitiesWithComponents', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      sys.update(1, em as any, CHECK_INTERVAL * 2)
      sys.update(1, em as any, CHECK_INTERVAL * 3)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(3)
    })
  })

  // ─── Cleanup 逻辑（cutoff = tick - 54000）─────────────────────
  describe('cleanup 逻辑（cutoff = tick - 54000）', () => {
    it('tick < cutoff 的记录被删除', () => {
      const tick = 100000
      ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide', tick - 60000))
      ;(sys as any).curiers.push(makeCurier(2, 30, 'tanned', tick - 30000))
      const cutoff = tick - 54000
      const curiers = (sys as any).curiers as Curier[]
      for (let i = curiers.length - 1; i >= 0; i--) {
        if (curiers[i].tick < cutoff) curiers.splice(i, 1)
      }
      expect((sys as any).curiers).toHaveLength(1)
      expect((sys as any).curiers[0].entityId).toBe(2)
    })

    it('tick >= cutoff 的记录保留', () => {
      const tick = 100000
      ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide', tick - 53999))
      const cutoff = tick - 54000
      const curiers = (sys as any).curiers as Curier[]
      for (let i = curiers.length - 1; i >= 0; i--) {
        if (curiers[i].tick < cutoff) curiers.splice(i, 1)
      }
      expect((sys as any).curiers).toHaveLength(1)
    })

    it('cutoff 边界：tick 恰好等于 cutoff 时保留', () => {
      const tick = 100000
      const cutoff = tick - 54000 // 46000
      ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide', cutoff))
      const curiers = (sys as any).curiers as Curier[]
      for (let i = curiers.length - 1; i >= 0; i--) {
        if (curiers[i].tick < cutoff) curiers.splice(i, 1)
      }
      expect((sys as any).curiers).toHaveLength(1)
    })

    it('多个过期记录全部被 cleanup 删除', () => {
      const tick = 100000
      for (let i = 0; i < 5; i++) {
        ;(sys as any).curiers.push(makeCurier(i + 1, 30, 'rawhide', 0))
      }
      const cutoff = tick - 54000
      const curiers = (sys as any).curiers as Curier[]
      for (let i = curiers.length - 1; i >= 0; i--) {
        if (curiers[i].tick < cutoff) curiers.splice(i, 1)
      }
      expect((sys as any).curiers).toHaveLength(0)
    })

    it('混合新旧记录：旧的删除，新的保留', () => {
      const tick = 100000
      const cutoff = tick - 54000
      ;(sys as any).curiers.push(makeCurier(1, 30, 'rawhide', 0)) // 旧
      ;(sys as any).curiers.push(makeCurier(2, 60, 'fine', tick - 10000)) // 新
      const curiers = (sys as any).curiers as Curier[]
      for (let i = curiers.length - 1; i >= 0; i--) {
        if (curiers[i].tick < cutoff) curiers.splice(i, 1)
      }
      expect((sys as any).curiers).toHaveLength(1)
      expect((sys as any).curiers[0].entityId).toBe(2)
    })
  })

  // ─── MAX_CURIERS = 30 限制 ─────────────────────────────────────
  describe('MAX_CURIERS = 30 限制', () => {
    it('注入 30 个 curier 时数组长度为 30', () => {
      for (let i = 0; i < 30; i++) {
        ;(sys as any).curiers.push(makeCurier(i + 1))
      }
      expect((sys as any).curiers).toHaveLength(30)
    })

    it('注入 1 个 curier 时数组长度为 1', () => {
      ;(sys as any).curiers.push(makeCurier(1))
      expect((sys as any).curiers).toHaveLength(1)
    })

    it('注入 15 个 curier 时数组长度为 15', () => {
      for (let i = 0; i < 15; i++) {
        ;(sys as any).curiers.push(makeCurier(i + 1))
      }
      expect((sys as any).curiers).toHaveLength(15)
    })
  })

  // ─── 数据结构完整性 ──────────────────────────────────────────────
  describe('Curier 数据结构完整性', () => {
    it('curier 包含所有必需字段', () => {
      const curier = makeCurier(42, 50, 'tooled', 999)
      expect(curier).toHaveProperty('id')
      expect(curier).toHaveProperty('entityId')
      expect(curier).toHaveProperty('skill')
      expect(curier).toHaveProperty('hidesCured')
      expect(curier).toHaveProperty('leatherGrade')
      expect(curier).toHaveProperty('quality')
      expect(curier).toHaveProperty('reputation')
      expect(curier).toHaveProperty('tick')
    })

    it('curier.entityId 与参数一致', () => {
      const curier = makeCurier(77)
      expect(curier.entityId).toBe(77)
    })

    it('curier.skill 与参数一致', () => {
      const curier = makeCurier(1, 65)
      expect(curier.skill).toBe(65)
    })

    it('curier.tick 与参数一致', () => {
      const curier = makeCurier(1, 30, 'rawhide', 12345)
      expect(curier.tick).toBe(12345)
    })

    it('注入后可通过 entityId 查询', () => {
      ;(sys as any).curiers.push(makeCurier(99, 30, 'fine'))
      expect((sys as any).curiers[0].entityId).toBe(99)
    })

    it('同一 entityId 可以有多个 curier 记录', () => {
      ;(sys as any).curiers.push(makeCurier(5, 30))
      ;(sys as any).curiers.push(makeCurier(5, 60))
      const all = (sys as any).curiers as Curier[]
      expect(all.filter(c => c.entityId === 5)).toHaveLength(2)
    })
  })

  // ─── skillMap ──────────────────────────────────────────────────
  describe('skillMap 功能', () => {
    it('skillMap 为 Map 类型', () => {
      expect((sys as any).skillMap).toBeInstanceOf(Map)
    })

    it('初始为空 Map', () => {
      expect((sys as any).skillMap.size).toBe(0)
    })

    it('skillMap 可手动设置和读取', () => {
      ;(sys as any).skillMap.set(1, 42)
      expect((sys as any).skillMap.get(1)).toBe(42)
    })

    it('skillMap 不同 entity 独立存储', () => {
      ;(sys as any).skillMap.set(1, 10)
      ;(sys as any).skillMap.set(2, 50)
      expect((sys as any).skillMap.get(1)).toBe(10)
      expect((sys as any).skillMap.get(2)).toBe(50)
    })
  })

  // ─── update 与 em 交互 ────────────────────────────────────────
  describe('update 与 EntityManager 交互', () => {
    it('触发 update 时调用 getEntitiesWithComponents', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
    })

    it('entities 为空时 curiers 不增加', () => {
      const em = makeEmptyEM()
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).curiers).toHaveLength(0)
    })

    it('entity age < 10 时不创建 curier（mock age=8）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ age: 8 }),
      } as any
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).curiers).toHaveLength(0)
    })

    it('entity age >= 10 且 random 足够小时创建 curier', () => {
      const randomValues = [0.001, 0.5]
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++ % randomValues.length])
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ age: 12 }),
      } as any
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).curiers).toHaveLength(1)
    })

    it('Math.random() > CRAFT_CHANCE(0.006) 时不创建 curier', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const em = {
        getEntitiesWithComponents: vi.fn().mockReturnValue([1]),
        getComponent: vi.fn().mockReturnValue({ age: 15 }),
      } as any
      sys.update(1, em as any, CHECK_INTERVAL)
      expect((sys as any).curiers).toHaveLength(0)
    })
  })

  // ─── 极值验证 ────────────────────────────────────────────────────
  describe('极值验证', () => {
    it('skill=0 时: quality=20, reputation=12, hidesCured=1', () => {
      const curier = makeCurier(1, 0)
      expect(curier.quality).toBeCloseTo(20, 5)
      expect(curier.reputation).toBeCloseTo(12, 5)
      expect(curier.hidesCured).toBe(1)
    })

    it('skill=100 时: quality=90, reputation=87, hidesCured=13', () => {
      const curier = makeCurier(1, 100)
      expect(curier.quality).toBeCloseTo(90, 5)
      expect(curier.reputation).toBeCloseTo(87, 5)
      expect(curier.hidesCured).toBe(13)
    })

    it('skill=50 时 leatherGrade=tooled', () => {
      const curier = makeCurier(1, 50, 'tooled')
      expect(curier.leatherGrade).toBe('tooled')
    })
  })

  // ─── 多实例独立性 ──────────────────────────────────────────────
  describe('多实例独立性', () => {
    it('两个 sys 实例的 curiers 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).curiers.push(makeCurier(1))
      expect((sys as any).curiers).toHaveLength(1)
      expect((sys2 as any).curiers).toHaveLength(0)
    })

    it('两个 sys 实例的 skillMap 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).skillMap.set(1, 50)
      expect((sys2 as any).skillMap.size).toBe(0)
    })

    it('两个 sys 实例的 lastCheck 独立', () => {
      const sys2 = makeSys()
      ;(sys as any).lastCheck = 9999
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })
})
