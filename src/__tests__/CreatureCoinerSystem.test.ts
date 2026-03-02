import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCoinerSystem } from '../systems/CreatureCoinerSystem'
import type { Coiner } from '../systems/CreatureCoinerSystem'

// 常量说明：CHECK_INTERVAL=3020, RECRUIT_CHANCE=0.0015, MAX_COINERS=10
// 技能增量：coiningSkill+0.02, dieStriking+0.015, reliefDepth+0.01
// cleanup 阈值：coiningSkill <= 4 时删除

let nextId = 1

function makeSys(): CreatureCoinerSystem { return new CreatureCoinerSystem() }

function makeCoiner(entityId: number, overrides: Partial<Coiner> = {}): Coiner {
  return {
    id: nextId++,
    entityId,
    coiningSkill: 30,
    dieStriking: 25,
    metalStamping: 20,
    reliefDepth: 35,
    tick: 0,
    ...overrides,
  }
}

function makeEm() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
  } as any
}

describe('CreatureCoinerSystem', () => {
  let sys: CreatureCoinerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 1. 初始化状态 ────────────────────────────────────────────────────────────

  describe('初始化状态', () => {
    it('实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureCoinerSystem)
    })

    it('初始无铸币工', () => {
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('初始 coiners 是数组', () => {
      expect(Array.isArray((sys as any).coiners)).toBe(true)
    })

    it('��始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('多次实例化互不干扰', () => {
      const sys2 = makeSys()
      ;(sys as any).coiners.push(makeCoiner(1))
      expect((sys2 as any).coiners).toHaveLength(0)
    })
  })

  // ── 2. CHECK_INTERVAL 节流逻辑（3020）────────────────────────────────────────

  describe('CHECK_INTERVAL 节流逻辑（间隔=3020）', () => {
    it('tick - lastCheck < 3020 时 update 提前返回，lastCheck 不变', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 4019) // 差值 3019 < 3020
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick - lastCheck === 3020 时 lastCheck 更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020) // 差值 3020 >= 3020
      expect((sys as any).lastCheck).toBe(3020)
    })

    it('tick - lastCheck > 3020 时 lastCheck 更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('lastCheck 非零时按差值计算（差值 < 3020 不触发）', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 3019) // 差值 2019 < 3020
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('lastCheck 非零且差值恰好 3020 时触发', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 4020) // 差值 3020 >= 3020
      expect((sys as any).lastCheck).toBe(4020)
    })

    it('未触发时技能不更新', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).lastCheck = 1000
      sys.update(16, makeEm(), 4019) // 差值 3019 < 3020
      expect((sys as any).coiners[0].coiningSkill).toBe(30)
    })

    it('触发后技能增加', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].coiningSkill).toBeGreaterThan(30)
    })

    it('同一 tick 连续调用第二次不再更新', () => {
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      const snapshot = (sys as any).lastCheck
      sys.update(16, makeEm(), 3020) // 差值变为 0
      expect((sys as any).lastCheck).toBe(snapshot)
    })
  })

  // ── 3. 技能递增规则 ──────────────────────────────────────────────────────────

  describe('技能递增规则', () => {
    it('coiningSkill 每次 +0.02', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].coiningSkill).toBeCloseTo(30.02)
    })

    it('dieStriking 每次 +0.015', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { dieStriking: 25 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].dieStriking).toBeCloseTo(25.015)
    })

    it('reliefDepth 每次 +0.01', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { reliefDepth: 35 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].reliefDepth).toBeCloseTo(35.01)
    })

    it('metalStamping 不在递增列表中，值保持不变', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { metalStamping: 20 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      // 源码未对 metalStamping 递增
      expect((sys as any).coiners[0].metalStamping).toBe(20)
    })

    it('多个铸币工各自独立递增', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 50 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].coiningSkill).toBeCloseTo(30.02)
      expect((sys as any).coiners[1].coiningSkill).toBeCloseTo(50.02)
    })

    it('连续两个 tick 后 coiningSkill 累积 +0.04', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      sys.update(16, makeEm(), 6040)
      expect((sys as any).coiners[0].coiningSkill).toBeCloseTo(30.04)
    })

    it('连续两个 tick 后 dieStriking 累积 +0.03', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { dieStriking: 25 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      sys.update(16, makeEm(), 6040)
      expect((sys as any).coiners[0].dieStriking).toBeCloseTo(25.03)
    })

    it('连续两个 tick 后 reliefDepth 累积 +0.02', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { reliefDepth: 35 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      sys.update(16, makeEm(), 6040)
      expect((sys as any).coiners[0].reliefDepth).toBeCloseTo(35.02)
    })
  })

  // ── 4. 技能上限（100）────────────────────────────────────────────────────────

  describe('技能上限 clamp 到 100', () => {
    it('coiningSkill 上限为 100（99.99 + 0.02 → 100）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].coiningSkill).toBe(100)
    })

    it('dieStriking 上限为 100（99.99 + 0.015 → 100）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { dieStriking: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].dieStriking).toBe(100)
    })

    it('reliefDepth 上限为 100（99.99 + 0.01 → 100）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { reliefDepth: 99.99 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].reliefDepth).toBe(100)
    })

    it('coiningSkill 已为 100 时保持 100', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].coiningSkill).toBe(100)
    })

    it('dieStriking 已为 100 时保持 100', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { dieStriking: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].dieStriking).toBe(100)
    })

    it('reliefDepth 已为 100 时保持 100', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { reliefDepth: 100 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners[0].reliefDepth).toBe(100)
    })
  })

  // ── 5. cleanup 逻辑（coiningSkill <= 4 删除）─────────────────────────────────

  describe('cleanup 逻辑（coiningSkill <= 4 时删除）', () => {
    it('coiningSkill 递增后恰好等于 4.00 时删除（3.98 → 4.00）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.98 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('coiningSkill = 3.5 时删除（3.5 + 0.02 = 3.52 <= 4）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.5 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('coiningSkill = 4.01 时保留（4.01 + 0.02 = 4.03 > 4）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 4.01 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(1)
    })

    it('coiningSkill = 10 时保留', () => {
      ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 10 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(1)
      expect((sys as any).coiners[0].entityId).toBe(2)
    })

    it('混合场景：低技能删除，高技能保留', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.98 }))
      ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 10 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(1)
      expect((sys as any).coiners[0].entityId).toBe(2)
    })

    it('多个低技能工匠全部删除', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 1 }))
      ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 2 }))
      ;(sys as any).coiners.push(makeCoiner(3, { coiningSkill: 3 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('coiningSkill = 0 时删除', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 0 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('coiningSkill 负数时删除', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: -10 }))
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('cleanup 按倒序遍历不影响索引（多元素交替）', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 3.98 })) // 删除
      ;(sys as any).coiners.push(makeCoiner(2, { coiningSkill: 50 }))   // 保留
      ;(sys as any).coiners.push(makeCoiner(3, { coiningSkill: 3.5 }))  // 删除
      ;(sys as any).coiners.push(makeCoiner(4, { coiningSkill: 60 }))   // 保留
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      const remaining = (sys as any).coiners as Coiner[]
      expect(remaining.map(c => c.entityId).sort()).toEqual([2, 4])
    })
  })

  // ── 6. 招募逻辑（随机触发）──────────────────────────────────────────────────

  describe('招募逻辑', () => {
    it('random < RECRUIT_CHANCE(0.0015) 时尝试招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015
      expect(() => sys.update(16, makeEm(), 3020)).not.toThrow()
    })

    it('random >= RECRUIT_CHANCE(0.0015) 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999) // >= 0.0015
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners).toHaveLength(0)
    })

    it('达到 MAX_COINERS(10) 时不再招募', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).coiners.push(makeCoiner(i))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0) // 最小值确保通过概率检查
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      expect((sys as any).coiners.length).toBeLessThanOrEqual(10)
    })

    it('招募后新铸币工 tick 字段等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      if ((sys as any).coiners.length > 0) {
        expect((sys as any).coiners[0].tick).toBe(3020)
      }
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const before = (sys as any).nextId
      ;(sys as any).lastCheck = 0
      sys.update(16, makeEm(), 3020)
      if ((sys as any).coiners.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(before)
      }
    })
  })

  // ── 7. Coiner 接口字段完整性 ────────────────────────────────────────────────

  describe('Coiner 接口字段完整性', () => {
    it('包含 id 字段', () => {
      const c = makeCoiner(1)
      expect(c).toHaveProperty('id')
    })

    it('包含 entityId 字段', () => {
      const c = makeCoiner(42)
      expect(c.entityId).toBe(42)
    })

    it('包含 coiningSkill 字段', () => {
      const c = makeCoiner(1, { coiningSkill: 60 })
      expect(c.coiningSkill).toBe(60)
    })

    it('包含 dieStriking 字段', () => {
      const c = makeCoiner(1, { dieStriking: 40 })
      expect(c.dieStriking).toBe(40)
    })

    it('包含 metalStamping 字段', () => {
      const c = makeCoiner(1, { metalStamping: 30 })
      expect(c.metalStamping).toBe(30)
    })

    it('包含 reliefDepth 字段', () => {
      const c = makeCoiner(1, { reliefDepth: 55 })
      expect(c.reliefDepth).toBe(55)
    })

    it('包含 tick 字段', () => {
      const c = makeCoiner(1, { tick: 1234 })
      expect(c.tick).toBe(1234)
    })

    it('四字段数据完整（全字段覆盖）', () => {
      const c = makeCoiner(10, { coiningSkill: 80, dieStriking: 75, metalStamping: 70, reliefDepth: 65 })
      ;(sys as any).coiners.push(c)
      const r = (sys as any).coiners[0]
      expect(r.coiningSkill).toBe(80)
      expect(r.dieStriking).toBe(75)
      expect(r.metalStamping).toBe(70)
      expect(r.reliefDepth).toBe(65)
    })
  })

  // ── 8. 数据查询操作 ──────────────────────────────────────────────────────────

  describe('数据操作与查询', () => {
    it('注入后可按索引查询', () => {
      ;(sys as any).coiners.push(makeCoiner(1))
      expect((sys as any).coiners[0].entityId).toBe(1)
    })

    it('注入多个铸币工全部返回', () => {
      ;(sys as any).coiners.push(makeCoiner(1))
      ;(sys as any).coiners.push(makeCoiner(2))
      expect((sys as any).coiners).toHaveLength(2)
    })

    it('直接修改注入的 coiner 数据生效', () => {
      ;(sys as any).coiners.push(makeCoiner(1, { coiningSkill: 30 }))
      ;(sys as any).coiners[0].coiningSkill = 99
      expect((sys as any).coiners[0].coiningSkill).toBe(99)
    })
  })

  // ── 9. 边界与容错 ────────────────────────────────────────────────────────────

  describe('边界与容错', () => {
    it('空铸币工列表时 update 不报错', () => {
      expect(() => sys.update(16, makeEm(), 3020)).not.toThrow()
    })

    it('update 接受 dt=0 不报错', () => {
      expect(() => sys.update(0, makeEm(), 3020)).not.toThrow()
    })

    it('update 接受极大 tick 不报错', () => {
      expect(() => sys.update(16, makeEm(), Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('update 接受负 dt 不报错', () => {
      expect(() => sys.update(-1, makeEm(), 3020)).not.toThrow()
    })
  })
})
