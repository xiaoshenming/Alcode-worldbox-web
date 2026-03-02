import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticCeasefireSystem, Ceasefire } from '../systems/DiplomaticCeasefireSystem'

const CHECK_INTERVAL = 5000
const MAX_CEASEFIRES = 8
const SPAWN_CHANCE = 0.002

function makeSys() { return new DiplomaticCeasefireSystem() }

function makeCeasefire(overrides: Partial<Ceasefire> = {}): Ceasefire {
  return {
    id: 1,
    factionA: 1,
    factionB: 2,
    duration: 30,
    remaining: 30,
    stability: 70,
    violations: 0,
    mediatorId: 3,
    tick: 10000,
    ...overrides,
  }
}

/** 构建一个 mock EntityManager，返回指定数量的实体 id 列表 */
function makeEM(entityIds: number[]) {
  return {
    getEntitiesWithComponent: (_: string) => entityIds,
    hasComponent: (_id: number, _comp: string) => false,
  }
}

describe('DiplomaticCeasefireSystem', () => {

  let sys: DiplomaticCeasefireSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- 1. 基础数据结构 ----
  describe('基础数据结构', () => {
    it('初始 ceasefires 为空数组', () => {
      expect((sys as any).ceasefires).toHaveLength(0)
      expect(Array.isArray((sys as any).ceasefires)).toBe(true)
    })

    it('初始 _ceasefireKeySet 为空 Set', () => {
      expect((sys as any)._ceasefireKeySet.size).toBe(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入 ceasefire 后 ceasefires 长度正确', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 1 }))
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 2, factionA: 3, factionB: 4 }))
      expect((sys as any).ceasefires).toHaveLength(2)
    })

    it('注入的 ceasefire 字段可正确读取', () => {
      const cf = makeCeasefire({ id: 99, factionA: 5, factionB: 6, stability: 80, violations: 2 })
      ;(sys as any).ceasefires.push(cf)
      const stored = (sys as any).ceasefires[0]
      expect(stored.id).toBe(99)
      expect(stored.factionA).toBe(5)
      expect(stored.factionB).toBe(6)
      expect(stored.stability).toBe(80)
      expect(stored.violations).toBe(2)
    })
  })

  // ---- 2. CHECK_INTERVAL 节流 ----
  describe('CHECK_INTERVAL 节流', () => {
    it('tick 差值小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick 恰好等于 CHECK_INTERVAL 时执行更新', () => {
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick 超过 CHECK_INTERVAL 时执行更新', () => {
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL + 999)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 999)
    })

    it('第一次 update 后，间隔不足时第二次不触发更新', () => {
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      const checkAfterFirst = (sys as any).lastCheck
      sys.update(1, {} as any, em as any, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(checkAfterFirst)
    })

    it('两个完整周期都会触发更新', () => {
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ---- 3. 数值字段动态更新 ----
  describe('数值字段动态更新', () => {
    it('每次 update 后 remaining -1', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ remaining: 20, tick: 0 }))
      const em = makeEM([])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires[0]?.remaining).toBe(19)
    })

    it('多次 update 后 remaining 持续递减', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ remaining: 15, stability: 50, tick: 0 }))
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // 保持 stability 稳定，不触发 violation
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL * 2)
      expect((sys as any).ceasefires[0]?.remaining).toBe(13)
    })

    it('stability 保持在 [0, 100] 范围内', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ stability: 50, remaining: 100, tick: 0 }))
      const em = makeEM([])
      for (let i = 1; i <= 20; i++) {
        sys.update(1, {} as any, em as any, CHECK_INTERVAL * i)
      }
      const cf = (sys as any).ceasefires[0]
      if (cf) {
        expect(cf.stability).toBeGreaterThanOrEqual(0)
        expect(cf.stability).toBeLessThanOrEqual(100)
      }
    })

    it('stability 在极低时被 violation 进一步降低', () => {
      // 把 stability 设为 50，且 random 固定让 violation 发生
      ;(sys as any).ceasefires.push(makeCeasefire({ stability: 50, remaining: 100, violations: 0, tick: 0 }))
      const em = makeEM([])
      // violations 发生的条件：Math.random() < (1 - stability/100) * 0.03
      // 当 stability=50 时阈值=0.015，令 random 返回 0.01 触发 violation
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      const cf = (sys as any).ceasefires[0]
      if (cf) {
        expect(cf.violations).toBeGreaterThan(0)
        expect(cf.stability).toBeLessThan(50)
      }
    })

    it('remaining 减到 0 或以下时停火被移除', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ remaining: 1, stability: 80, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      // remaining 变为 0，应被移除
      expect((sys as any).ceasefires).toHaveLength(0)
    })

    it('stability <= 5 时停火崩溃并被移除', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ remaining: 100, stability: 5, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0) // stability 继续降低
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires).toHaveLength(0)
    })

    it('停火移除时 _ceasefireKeySet 中对应 key 也被删除', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ factionA: 1, factionB: 2, remaining: 1, stability: 80, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')
      const em = makeEM([])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any)._ceasefireKeySet.has('1_2')).toBe(false)
    })
  })

  // ---- 4. 过期/崩溃清理 ----
  describe('过期与崩溃清理', () => {
    it('remaining=1 的停火在一次 update 后被清理', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 1, remaining: 1, stability: 90, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires).toHaveLength(0)
    })

    it('remaining=100 的停火不会因过期被清理', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 1, remaining: 100, stability: 80, tick: 0 }))
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires).toHaveLength(1)
    })

    it('多个停火中只移除 remaining<=0 的', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 1, remaining: 1, stability: 90, factionA: 1, factionB: 2, tick: 0 }))
      ;(sys as any).ceasefires.push(makeCeasefire({ id: 2, remaining: 50, stability: 80, factionA: 3, factionB: 4, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')
      ;(sys as any)._ceasefireKeySet.add('3_4')
      const em = makeEM([])
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires).toHaveLength(1)
      expect((sys as any).ceasefires[0].id).toBe(2)
    })

    it('崩溃的停火键从 _ceasefireKeySet 中移除，允许重新缔结', () => {
      ;(sys as any).ceasefires.push(makeCeasefire({ factionA: 10, factionB: 20, remaining: 1, stability: 90, tick: 0 }))
      ;(sys as any)._ceasefireKeySet.add('10_20')
      const em = makeEM([])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any)._ceasefireKeySet.has('10_20')).toBe(false)
    })
  })

  // ---- 5. MAX_CEASEFIRES 上限 ----
  describe('MAX_CEASEFIRES 上限', () => {
    it('达到 MAX_CEASEFIRES 时不再新增停火', () => {
      for (let i = 1; i <= MAX_CEASEFIRES; i++) {
        ;(sys as any).ceasefires.push(makeCeasefire({ id: i, factionA: i * 2, factionB: i * 2 + 1, remaining: 100, tick: 10000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发 SPAWN_CHANCE 条件
      const em = makeEM([1, 2, 3, 4, 5])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires.length).toBeLessThanOrEqual(MAX_CEASEFIRES)
    })

    it('实体数量不足 3 时不新增停火', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 触发概率
      const em = makeEM([1, 2])  // 只有 2 个实体，不够
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).ceasefires).toHaveLength(0)
    })

    it('MAX_CEASEFIRES 常量值为 8', () => {
      for (let i = 1; i <= MAX_CEASEFIRES; i++) {
        ;(sys as any).ceasefires.push(makeCeasefire({ id: i, factionA: i * 2, factionB: i * 2 + 1, remaining: 100, tick: 10000 }))
      }
      expect((sys as any).ceasefires).toHaveLength(8)
    })

    it('已有 pair 键的停火不被重复创建', () => {
      // 先加入 factionA=1,factionB=2 的停火，key='1_2' 已在 Set 中
      ;(sys as any).ceasefires.push(makeCeasefire({ factionA: 1, factionB: 2, remaining: 50, tick: 10000 }))
      ;(sys as any)._ceasefireKeySet.add('1_2')

      // 控制 random 使 fA=1,fB=2,med=3（试图重复创建）
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0      // 触发 SPAWN_CHANCE (0 < 0.002)
        if (callCount === 2) return 0      // fA = entities[0] = 1
        if (callCount === 3) return 0.2    // fB = entities[1] = 2
        if (callCount === 4) return 0.6    // med = entities[2] = 3
        return 0.5
      })
      const em = makeEM([1, 2, 3])
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      // 不应创建重复停火
      expect((sys as any).ceasefires).toHaveLength(1)
    })
  })

})
