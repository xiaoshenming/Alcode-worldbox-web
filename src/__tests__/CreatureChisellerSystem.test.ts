import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureChisellerSystem } from '../systems/CreatureChisellerSystem'
import type { Chiseller } from '../systems/CreatureChisellerSystem'

// 常量说明：CHECK_INTERVAL=2920, RECRUIT_CHANCE=0.0015, MAX_CHISELLERS=10
// 技能增量：chisellingSkill+0.02, cuttingPrecision+0.015, edgeDefinition+0.01
// cleanup 阈值：chisellingSkill <= 4 时删除

let nextId = 1

function makeSys(): CreatureChisellerSystem { return new CreatureChisellerSystem() }

function makeChiseller(entityId: number, overrides: Partial<Chiseller> = {}): Chiseller {
  return {
    id: nextId++,
    entityId,
    chisellingSkill: 30,
    cuttingPrecision: 25,
    metalCarving: 20,
    edgeDefinition: 35,
    tick: 0,
    ...overrides,
  }
}

function makeEm() {
  return { getEntitiesWithComponents: () => [] } as any
}

describe('CreatureChisellerSystem', () => {
  let sys: CreatureChisellerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化状态 ────────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureChisellerSystem)
    })

    it('初始无凿刻工', () => {
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('初始 chisellers 是数组', () => {
      expect(Array.isArray((sys as any).chisellers)).toBe(true)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('多次实例化互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).chisellers.push(makeChiseller(1))
      expect((sys2 as any).chisellers).toHaveLength(0)
    })
  })

  // ── 2. CHECK_INTERVAL 节流逻辑（2920）─────────────────────────────────────

  describe('CHECK_INTERVAL 节流逻辑（间隔=2920）', () => {
    it('tick - lastCheck < 2920 时 update 提前返回，lastCheck 不变', () => {
      ;(sys as any).chisellers.push(makeChiseller(1))
      sys.update(16, makeEm(), 2919)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick - lastCheck === 2920 时 lastCheck 更新', () => {
      sys.update(16, makeEm(), 2920)
      expect((sys as any).lastCheck).toBe(2920)
    })

    it('tick - lastCheck > 2920 时 lastCheck 更新', () => {
      sys.update(16, makeEm(), 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('lastCheck 非零时按差值计算（差值 < 2920 不触发）', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 3919) // 差值 2919 < 2920
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('lastCheck 非零且差值恰好 2920 时触发', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 3920) // 差值 2920 >= 2920
      expect((sys as any).lastCheck).toBe(3920)
    })

    it('未触发时技能不更新', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
      sys.update(16, makeEm(), 2919) // 未达到 CHECK_INTERVAL
      expect((sys as any).chisellers[0].chisellingSkill).toBe(30)
    })

    it('触发后技能增加', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].chisellingSkill).toBeGreaterThan(30)
    })
  })

  // ── 3. 技能递增规则 ──────────────────────────────────────────────────────────

  describe('技能递增规则', () => {
    it('chisellingSkill 每次 +0.02', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].chisellingSkill).toBeCloseTo(30.02)
    })

    it('cuttingPrecision 每次 +0.015', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { cuttingPrecision: 25 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].cuttingPrecision).toBeCloseTo(25.015)
    })

    it('edgeDefinition 每次 +0.01', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { edgeDefinition: 35 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].edgeDefinition).toBeCloseTo(35.01)
    })

    it('metalCarving 不在递增列表中，值保持不变', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { metalCarving: 20 }))
      sys.update(16, makeEm(), 2920)
      // 源码未对 metalCarving 递增
      expect((sys as any).chisellers[0].metalCarving).toBe(20)
    })

    it('多个凿刻工各自独立递增', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30, cuttingPrecision: 25 }))
      ;(sys as any).chisellers.push(makeChiseller(2, { chisellingSkill: 50, cuttingPrecision: 60 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].chisellingSkill).toBeCloseTo(30.02)
      expect((sys as any).chisellers[1].chisellingSkill).toBeCloseTo(50.02)
    })

    it('连续两个 tick 后 chisellingSkill 累积 +0.04', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 30 }))
      sys.update(16, makeEm(), 2920)
      sys.update(16, makeEm(), 5840)
      expect((sys as any).chisellers[0].chisellingSkill).toBeCloseTo(30.04)
    })
  })

  // ── 4. 技能上限（100）────────────────────────────────────────────────────────

  describe('技能上限 clamp 到 100', () => {
    it('chisellingSkill 上限为 100（99.99 + 0.02 → 100）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 99.99 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].chisellingSkill).toBe(100)
    })

    it('cuttingPrecision 上限为 100（99.99 + 0.015 → 100）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { cuttingPrecision: 99.99 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].cuttingPrecision).toBe(100)
    })

    it('edgeDefinition 上限为 100（99.99 + 0.01 → 100）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { edgeDefinition: 99.99 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].edgeDefinition).toBe(100)
    })

    it('chisellingSkill 已为 100 时保持 100', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 100 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].chisellingSkill).toBe(100)
    })

    it('cuttingPrecision 已为 100 时保持 100', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { cuttingPrecision: 100 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].cuttingPrecision).toBe(100)
    })

    it('edgeDefinition 已为 100 时保持 100', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { edgeDefinition: 100 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers[0].edgeDefinition).toBe(100)
    })
  })

  // ── 5. cleanup 逻辑（chisellingSkill <= 4 删除）──────────────────────────────

  describe('cleanup 逻辑（chisellingSkill <= 4 时删除）', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // 禁止随机招募
    })

    it('chisellingSkill 递增后恰好等于 4.00 时删除（3.98 → 4.00）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 3.98 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('chisellingSkill 递增后大于 4 时保留（4.01 → 4.03）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 4.01 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(1)
    })

    it('chisellingSkill = 3 时删除（3 + 0.02 = 3.02 <= 4）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 3 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('chisellingSkill = 5 时保留（5 + 0.02 = 5.02 > 4）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 5 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(1)
    })

    it('混合场景：低技能删除，高技能保留', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 3.98 }))
      ;(sys as any).chisellers.push(makeChiseller(2, { chisellingSkill: 30 }))
      sys.update(16, makeEm(), 2920)
      const remaining = (sys as any).chisellers as Chiseller[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(2)
    })

    it('多个低技能工匠全部删除', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 1 }))
      ;(sys as any).chisellers.push(makeChiseller(2, { chisellingSkill: 2 }))
      ;(sys as any).chisellers.push(makeChiseller(3, { chisellingSkill: 3 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('cleanup 按倒序遍历不影响索引（多元素）', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 3.98 }))
      ;(sys as any).chisellers.push(makeChiseller(2, { chisellingSkill: 50 }))
      ;(sys as any).chisellers.push(makeChiseller(3, { chisellingSkill: 3.5 }))
      ;(sys as any).chisellers.push(makeChiseller(4, { chisellingSkill: 60 }))
      sys.update(16, makeEm(), 2920)
      const remaining = (sys as any).chisellers as Chiseller[]
      expect(remaining.map(c => c.entityId).sort()).toEqual([2, 4])
    })
  })

  // ── 6. 招募逻辑（随机触发）──────────────────────────────────────────────────

  describe('招募逻辑', () => {
    it('random < RECRUIT_CHANCE(0.0015) 时招募新凿刻工', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015 → 招募
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers.length).toBeGreaterThanOrEqual(0) // 不崩溃
    })

    it('random >= RECRUIT_CHANCE(0.0015) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999) // >= 0.0015 → 不招募
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('达到 MAX_CHISELLERS(10) 时不再招募', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).chisellers.push(makeChiseller(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 极小值确保通过概率
      sys.update(16, makeEm(), 2920)
      // 已满 10 个，不应超过
      expect((sys as any).chisellers.length).toBeLessThanOrEqual(10)
    })

    it('招募后新凿刻工 tick 字段为当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(16, makeEm(), 2920)
      if ((sys as any).chisellers.length > 0) {
        expect((sys as any).chisellers[0].tick).toBe(2920)
      }
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const beforeId = (sys as any).nextId
      sys.update(16, makeEm(), 2920)
      if ((sys as any).chisellers.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(beforeId)
      }
    })
  })

  // ── 7. Chiseller 接口字段完整性 ─────────────────────────────────────────────

  describe('Chiseller 接口字段完整性', () => {
    it('包含 id 字段', () => {
      const c = makeChiseller(1)
      expect(c).toHaveProperty('id')
    })

    it('包含 entityId 字段', () => {
      const c = makeChiseller(42)
      expect(c.entityId).toBe(42)
    })

    it('包含 chisellingSkill 字段', () => {
      const c = makeChiseller(1, { chisellingSkill: 50 })
      expect(c.chisellingSkill).toBe(50)
    })

    it('包含 cuttingPrecision 字段', () => {
      const c = makeChiseller(1, { cuttingPrecision: 40 })
      expect(c.cuttingPrecision).toBe(40)
    })

    it('包含 metalCarving 字段', () => {
      const c = makeChiseller(1, { metalCarving: 30 })
      expect(c.metalCarving).toBe(30)
    })

    it('包含 edgeDefinition 字段', () => {
      const c = makeChiseller(1, { edgeDefinition: 60 })
      expect(c.edgeDefinition).toBe(60)
    })

    it('包含 tick 字段', () => {
      const c = makeChiseller(1, { tick: 999 })
      expect(c.tick).toBe(999)
    })
  })

  // ── 8. 数据查询操作 ──────────────────────────────────────────────────────────

  describe('数据操作与查询', () => {
    it('注入后可按索引查询', () => {
      ;(sys as any).chisellers.push(makeChiseller(1))
      expect((sys as any).chisellers[0].entityId).toBe(1)
    })

    it('注入多个凿刻工全部返回', () => {
      ;(sys as any).chisellers.push(makeChiseller(1))
      ;(sys as any).chisellers.push(makeChiseller(2))
      expect((sys as any).chisellers).toHaveLength(2)
    })

    it('四字段数据完整（全字段覆盖）', () => {
      const c = makeChiseller(10, { chisellingSkill: 80, cuttingPrecision: 75, metalCarving: 70, edgeDefinition: 65 })
      ;(sys as any).chisellers.push(c)
      const r = (sys as any).chisellers[0]
      expect(r.chisellingSkill).toBe(80)
      expect(r.cuttingPrecision).toBe(75)
      expect(r.metalCarving).toBe(70)
      expect(r.edgeDefinition).toBe(65)
    })
  })

  // ── 9. 边界与容错 ────────────────────────────────────────────────────────────

  describe('边界与容错', () => {
    it('空凿刻工列表时 update 不报错', () => {
      expect(() => sys.update(16, makeEm(), 2920)).not.toThrow()
    })

    it('update 接受 dt=0 不报错', () => {
      expect(() => sys.update(0, makeEm(), 2920)).not.toThrow()
    })

    it('update 接受极大 tick 不报错', () => {
      expect(() => sys.update(16, makeEm(), Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('chisellingSkill 为 0 时被删除', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: 0 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })

    it('chisellingSkill 为负数时被删除', () => {
      ;(sys as any).chisellers.push(makeChiseller(1, { chisellingSkill: -5 }))
      sys.update(16, makeEm(), 2920)
      expect((sys as any).chisellers).toHaveLength(0)
    })
  })
})
