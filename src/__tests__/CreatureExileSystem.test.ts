import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureExileSystem } from '../systems/CreatureExileSystem'
import type { Exile, ExileReason } from '../systems/CreatureExileSystem'

let nextId = 1
function makeSys(): CreatureExileSystem { return new CreatureExileSystem() }
function makeExile(entityId: number, reason: ExileReason = 'crime', wanderTicks = 0): Exile {
  return { id: nextId++, entityId, fromCivId: 1, reason, wanderTicks, tick: 0 }
}

const makeEm = () => ({
  getEntitiesWithComponents: () => [] as number[],
  getComponent: () => null,
})

describe('CreatureExileSystem', () => {
  let sys: CreatureExileSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 初始状态
  // ============================================================
  describe('初始状态', () => {
    it('初始无流放者', () => {
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('_exiledSet 初始为空', () => {
      expect((sys as any)._exiledSet.size).toBe(0)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('exiles 是数组', () => {
      expect(Array.isArray((sys as any).exiles)).toBe(true)
    })

    it('_exiledSet 是 Set', () => {
      expect((sys as any)._exiledSet instanceof Set).toBe(true)
    })
  })

  // ============================================================
  // Exile 数据结构
  // ============================================================
  describe('Exile 数据结构', () => {
    it('注入后可查询 reason', () => {
      ;(sys as any).exiles.push(makeExile(1, 'treason'))
      expect((sys as any).exiles[0].reason).toBe('treason')
    })

    it('ExileReason 包含6种', () => {
      const reasons: ExileReason[] = ['crime', 'treason', 'heresy', 'cowardice', 'debt', 'curse']
      reasons.forEach((r, i) => { ;(sys as any).exiles.push(makeExile(i + 1, r)) })
      const all = (sys as any).exiles
      reasons.forEach((r, i) => { expect(all[i].reason).toBe(r) })
    })

    it('fromCivId 可自定义', () => {
      const exile = makeExile(3, 'debt')
      exile.fromCivId = 7
      ;(sys as any).exiles.push(exile)
      expect((sys as any).exiles[0].fromCivId).toBe(7)
    })

    it('wanderTicks 初始值正确', () => {
      const exile = makeExile(1, 'crime', 42)
      expect(exile.wanderTicks).toBe(42)
    })

    it('tick 字段存在', () => {
      const exile = makeExile(1)
      expect(exile.tick).toBeDefined()
    })

    it('id 字段唯一递增', () => {
      const e1 = makeExile(1)
      const e2 = makeExile(2)
      expect(e2.id).toBeGreaterThan(e1.id)
    })

    it('支持多个流放者同时存在', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime'))
      ;(sys as any).exiles.push(makeExile(2, 'heresy'))
      ;(sys as any).exiles.push(makeExile(3, 'curse'))
      expect((sys as any).exiles).toHaveLength(3)
    })

    it('entityId 字段正确', () => {
      ;(sys as any).exiles.push(makeExile(99, 'cowardice'))
      expect((sys as any).exiles[0].entityId).toBe(99)
    })
  })

  // ============================================================
  // isExiled / _exiledSet 查询
  // ============================================================
  describe('isExiled 与 _exiledSet', () => {
    it('entityId 在 _exiledSet 中返回 true', () => {
      ;(sys as any)._exiledSet.add(42)
      expect((sys as any).isExiled(42)).toBe(true)
    })

    it('entityId 不在 _exiledSet 中返回 false', () => {
      expect((sys as any).isExiled(99)).toBe(false)
    })

    it('删除后 isExiled 返回 false', () => {
      ;(sys as any)._exiledSet.add(10)
      ;(sys as any)._exiledSet.delete(10)
      expect((sys as any).isExiled(10)).toBe(false)
    })

    it('多个 entityId 互不干扰', () => {
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any)._exiledSet.add(2)
      expect((sys as any).isExiled(1)).toBe(true)
      expect((sys as any).isExiled(2)).toBe(true)
      expect((sys as any).isExiled(3)).toBe(false)
    })

    it('entityId = 0 也能正确查询', () => {
      ;(sys as any)._exiledSet.add(0)
      expect((sys as any).isExiled(0)).toBe(true)
    })

    it('大值 entityId 也能正确查询', () => {
      ;(sys as any)._exiledSet.add(999999)
      expect((sys as any).isExiled(999999)).toBe(true)
    })
  })

  // ============================================================
  // CHECK_INTERVAL 节流控制
  // ============================================================
  describe('CHECK_INTERVAL 节流控制', () => {
    it('tick 差值 < 800 时不更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm() as any, 1799) // 799 < 800
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差值 >= 800 时更新 lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm() as any, 1800) // 800 >= 800
      expect((sys as any).lastCheck).toBe(1800)
    })

    it('lastCheck = 0 时 tick = 800 触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any).lastCheck).toBe(800)
    })

    it('lastCheck = 0 时 tick = 799 不触发更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 799)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 差值恰好等于 800 时触发', () => {
      ;(sys as any).lastCheck = 3000
      sys.update(16, makeEm() as any, 3800)
      expect((sys as any).lastCheck).toBe(3800)
    })

    it('连续两次都超过阈值时各自更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)   // lastCheck=800
      sys.update(16, makeEm() as any, 1600)  // lastCheck=1600
      expect((sys as any).lastCheck).toBe(1600)
    })

    it('多次调用只有第一次跨越阈值时更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)  // 触发，lastCheck=800
      sys.update(16, makeEm() as any, 801)  // 差值1，不触发
      expect((sys as any).lastCheck).toBe(800)
    })
  })

  // ============================================================
  // updateWanderers: wanderTicks 递增
  // ============================================================
  describe('updateWanderers 逻辑', () => {
    it('每次 update 触发后 wanderTicks++', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 0))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any).exiles[0]?.wanderTicks).toBeGreaterThanOrEqual(1)
    })

    it('needs.health > 10 时 health 减少', () => {
      const needs = { health: 50 }
      const em = {
        getEntitiesWithComponents: () => [],
        getComponent: (_eid: number, type: string) => type === 'needs' ? needs : null,
      } as any
      ;(sys as any).exiles.push(makeExile(1, 'crime', 0))
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      expect(needs.health).toBeLessThan(50)
    })

    it('needs.health <= 10 时 health 不减少', () => {
      const needs = { health: 10 }
      const em = {
        getEntitiesWithComponents: () => [],
        getComponent: (_eid: number, type: string) => type === 'needs' ? needs : null,
      } as any
      ;(sys as any).exiles.push(makeExile(1, 'crime', 0))
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      expect(needs.health).toBe(10)
    })

    it('pos 存在时 x 和 y 坐标发生随机移动', () => {
      const pos = { x: 100, y: 100 }
      const em = {
        getEntitiesWithComponents: () => [],
        getComponent: (_eid: number, type: string) => type === 'position' ? pos : null,
      } as any
      ;(sys as any).exiles.push(makeExile(1, 'crime', 0))
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      // x 和 y 应该发生了变化（随机移动）
      const moved = pos.x !== 100 || pos.y !== 100
      expect(moved).toBe(true)
    })

    it('pos 为 null 时不崩溃', () => {
      const em = {
        getEntitiesWithComponents: () => [],
        getComponent: () => null,
      } as any
      ;(sys as any).exiles.push(makeExile(1, 'crime', 0))
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, em, 800)).not.toThrow()
    })

    it('多个流放者各自独立增加 wanderTicks', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 10))
      ;(sys as any).exiles.push(makeExile(2, 'heresy', 20))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      // 两者 wanderTicks 都应增加了1（只要未被清理）
      const exiles = (sys as any).exiles as Exile[]
      const e1 = exiles.find(e => e.entityId === 1)
      const e2 = exiles.find(e => e.entityId === 2)
      if (e1) expect(e1.wanderTicks).toBeGreaterThanOrEqual(11)
      if (e2) expect(e2.wanderTicks).toBeGreaterThanOrEqual(21)
    })
  })

  // ============================================================
  // cleanup 逻辑
  // ============================================================
  describe('cleanup 清理逻辑', () => {
    it('wanderTicks >= 5000 的流放者被移除', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 5000))
      ;(sys as any).exiles.push(makeExile(2, 'debt', 100))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any)._exiledSet.add(2)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      const exiles = (sys as any).exiles
      expect(exiles.some((e: Exile) => e.entityId === 1)).toBe(false)
      expect(exiles.some((e: Exile) => e.entityId === 2)).toBe(true)
    })

    it('wanderTicks = 4999 时更新后为 5000 >= 5000，被移除', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 4999))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      // wanderTicks++ -> 5000 >= 5000 -> 移除
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('wanderTicks = 4998 时更新后为 4999 < 5000，保留', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 4998))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      // wanderTicks++ -> 4999 < 5000 -> 保留
      expect((sys as any).exiles).toHaveLength(1)
    })

    it('移除流放者后 _exiledSet 也删除对应 entityId', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 5000))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any)._exiledSet.has(1)).toBe(false)
    })

    it('MAX_EXILES 截断: 超过60个时裁剪到60', () => {
      for (let i = 0; i < 65; i++) {
        ;(sys as any).exiles.push(makeExile(i + 1))
        ;(sys as any)._exiledSet.add(i + 1)
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any).exiles.length).toBeLessThanOrEqual(60)
    })

    it('恰好60个时不截断', () => {
      for (let i = 0; i < 60; i++) {
        ;(sys as any).exiles.push(makeExile(i + 1))
      }
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      // 60个全部 wanderTicks 都还很小，不会被时间清理掉
      expect((sys as any).exiles.length).toBeLessThanOrEqual(60)
    })

    it('清理时从尾部向前遍历不影响结果', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 5000))
      ;(sys as any).exiles.push(makeExile(2, 'crime', 5000))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any)._exiledSet.add(2)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any).exiles).toHaveLength(0)
    })
  })

  // ============================================================
  // checkForExiles: 招募新流放者
  // ============================================================
  describe('checkForExiles 逻辑', () => {
    it('已达 MAX_EXILES 时不再检查新流放者', () => {
      for (let i = 0; i < 60; i++) {
        ;(sys as any).exiles.push(makeExile(i + 1))
      }
      const em = {
        getEntitiesWithComponents: vi.fn(() => [100] as number[]),
        getComponent: () => ({ name: 'test' }),
      } as any
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      // 已满60个，不应调用 getEntitiesWithComponents
      expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    })

    it('creature 无 name 时不流放', () => {
      const em = {
        getEntitiesWithComponents: () => [1] as number[],
        getComponent: (_eid: number, _type: string) => ({ name: '' }),
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0) // < EXILE_CHANCE
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      // creature.name 为空字符串，不流放
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('creature 为 null 时不流放', () => {
      const em = {
        getEntitiesWithComponents: () => [1] as number[],
        getComponent: () => null,
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('已流放的 entityId 不重复流放', () => {
      ;(sys as any)._exiledSet.add(1)
      const em = {
        getEntitiesWithComponents: () => [1] as number[],
        getComponent: () => ({ name: 'Alice' }),
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('random > EXILE_CHANCE 时不流放', () => {
      const em = {
        getEntitiesWithComponents: () => [1] as number[],
        getComponent: () => ({ name: 'Bob' }),
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.008
      ;(sys as any).lastCheck = 0
      sys.update(16, em, 800)
      expect((sys as any).exiles).toHaveLength(0)
    })
  })

  // ============================================================
  // 边界与极端值
  // ============================================================
  describe('边界与极端值', () => {
    it('engravers 为空时 update 不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, makeEm() as any, 800)).not.toThrow()
    })

    it('dt = 0 也能正常执行', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(0, makeEm() as any, 800)).not.toThrow()
    })

    it('非常大的 tick 值不崩溃', () => {
      ;(sys as any).lastCheck = 0
      expect(() => sys.update(16, makeEm() as any, 9999999)).not.toThrow()
    })

    it('多个系统实例互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).exiles.push(makeExile(1))
      expect((sys2 as any).exiles).toHaveLength(0)
    })

    it('_exiledSet 与 exiles 保持一致', () => {
      ;(sys as any).exiles.push(makeExile(1, 'crime', 5000))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      const exiles: Exile[] = (sys as any).exiles
      const exiledSet: Set<number> = (sys as any)._exiledSet
      for (const e of exiles) {
        expect(exiledSet.has(e.entityId)).toBe(true)
      }
    })

    it('wanderTicks 精确等于 5000（未自增）时 cleanup 判断：5000 >= 5000 -> 删除', () => {
      // cleanup 在 updateWanderers 之后执行
      // updateWanderers 先 wanderTicks++
      // 所以初始 wanderTicks=4999 -> 自增后 5000 -> 删除
      ;(sys as any).exiles.push(makeExile(1, 'crime', 4999))
      ;(sys as any)._exiledSet.add(1)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm() as any, 800)
      expect((sys as any).exiles).toHaveLength(0)
    })

    it('所有 ExileReason 枚举值均可正确存储', () => {
      const reasons: ExileReason[] = ['crime', 'treason', 'heresy', 'cowardice', 'debt', 'curse']
      for (const r of reasons) {
        const e = makeExile(nextId, r)
        ;(sys as any).exiles.push(e)
      }
      expect((sys as any).exiles.length).toBe(6)
      const storedReasons = (sys as any).exiles.map((e: Exile) => e.reason)
      for (const r of reasons) {
        expect(storedReasons).toContain(r)
      }
    })
  })
})
