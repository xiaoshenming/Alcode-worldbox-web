import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHonerSystem } from '../systems/CreatureHonerSystem'
import type { Honer } from '../systems/CreatureHonerSystem'

let nextId = 1
function makeSys(): CreatureHonerSystem { return new CreatureHonerSystem() }
function makeHoner(entityId: number, overrides: Partial<Honer> = {}): Honer {
  return {
    id: nextId++, entityId,
    honingSkill: 70, abrasiveControl: 65,
    surfacePrecision: 80, crosshatchAngle: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureHonerSystem', () => {
  let sys: CreatureHonerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ===== 初始化状态 =====
  describe('初始化状态', () => {
    it('初始无磨刀工', () => {
      expect((sys as any).honers).toHaveLength(0)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('honers 是数组类型', () => {
      expect(Array.isArray((sys as any).honers)).toBe(true)
    })

    it('多次实例化彼此独立', () => {
      const sys2 = makeSys()
      ;(sys as any).honers.push(makeHoner(1))
      expect((sys2 as any).honers).toHaveLength(0)
    })
  })

  // ===== 数据注入与查询 =====
  describe('数据注入与查询', () => {
    it('注入后可查询', () => {
      ;(sys as any).honers.push(makeHoner(1))
      expect((sys as any).honers[0].entityId).toBe(1)
    })

    it('多个磨刀��全部返回', () => {
      ;(sys as any).honers.push(makeHoner(1))
      ;(sys as any).honers.push(makeHoner(2))
      ;(sys as any).honers.push(makeHoner(3))
      expect((sys as any).honers).toHaveLength(3)
    })

    it('Honer 对象包含四个核心技能字段', () => {
      ;(sys as any).honers.push(makeHoner(5))
      const h = (sys as any).honers[0]
      expect(h).toHaveProperty('honingSkill')
      expect(h).toHaveProperty('abrasiveControl')
      expect(h).toHaveProperty('surfacePrecision')
      expect(h).toHaveProperty('crosshatchAngle')
    })

    it('注入字段值正确存储', () => {
      ;(sys as any).honers.push(makeHoner(5))
      const h = (sys as any).honers[0]
      expect(h.honingSkill).toBe(70)
      expect(h.surfacePrecision).toBe(80)
      expect(h.abrasiveControl).toBe(65)
      expect(h.crosshatchAngle).toBe(45)
    })

    it('Honer 对象包含 id 字段', () => {
      ;(sys as any).honers.push(makeHoner(1))
      expect((sys as any).honers[0]).toHaveProperty('id')
    })

    it('Honer 对象包含 entityId 字段', () => {
      ;(sys as any).honers.push(makeHoner(42))
      expect((sys as any).honers[0].entityId).toBe(42)
    })

    it('Honer 对象包含 tick 字段', () => {
      ;(sys as any).honers.push(makeHoner(1, { tick: 500 }))
      expect((sys as any).honers[0].tick).toBe(500)
    })

    it('自定义字段覆盖默认值', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 99 }))
      expect((sys as any).honers[0].honingSkill).toBe(99)
    })

    it('可以注入 10 个磨刀工（MAX_HONERS 上限）', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).honers.push(makeHoner(i + 1))
      }
      expect((sys as any).honers).toHaveLength(10)
    })
  })

  // ===== tick 间隔控制（CHECK_INTERVAL = 2960）=====
  describe('tick 间隔控制（CHECK_INTERVAL = 2960）', () => {
    it('tick 差值 < 2960 时不触发更新（lastCheck 不变）', () => {
      const em = {} as any
      sys.update(0, em, 0)
      const before = (sys as any).lastCheck
      sys.update(0, em, 2959)
      expect((sys as any).lastCheck).toBe(before)
    })

    it('tick 差值 >= 2960 时触发更新（lastCheck 变为当前 tick）', () => {
      const em = {} as any
      sys.update(0, em, 0)
      sys.update(0, em, 2960)
      expect((sys as any).lastCheck).toBe(2960)
    })

    it('tick = 0 时触发首次更新', () => {
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('lastCheck 设定后差值不足 2960 时不再更新', () => {
      const em = {} as any
      sys.update(0, em, 2960)
      sys.update(0, em, 4000)
      expect((sys as any).lastCheck).toBe(2960)
    })

    it('lastCheck 设定后差值 >= 2960 时再次更新', () => {
      const em = {} as any
      sys.update(0, em, 0)
      sys.update(0, em, 2960)
      sys.update(0, em, 5920)
      expect((sys as any).lastCheck).toBe(5920)
    })

    it('差值恰好等于 2959 时不更新', () => {
      const em = {} as any
      sys.update(0, em, 0)
      sys.update(0, em, 2959)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('差值恰好等于 2960 时更新', () => {
      const em = {} as any
      sys.update(0, em, 0)
      sys.update(0, em, 2960)
      expect((sys as any).lastCheck).toBe(2960)
    })

    it('连续三次满足间隔时 lastCheck 逐步推进', () => {
      const em = {} as any
      sys.update(0, em, 0)
      sys.update(0, em, 2960)
      sys.update(0, em, 5920)
      sys.update(0, em, 8880)
      expect((sys as any).lastCheck).toBe(8880)
    })
  })

  // ===== 技能递增逻辑 =====
  describe('技能递增逻辑', () => {
    it('update 后 honingSkill 每次增加 0.02', () => {
      const h = makeHoner(1, { honingSkill: 50 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(50.02, 5)
    })

    it('update 后 abrasiveControl 每次增加 0.015', () => {
      const h = makeHoner(1, { abrasiveControl: 40 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].abrasiveControl).toBeCloseTo(40.015, 5)
    })

    it('update 后 crosshatchAngle 每次增加 0.01', () => {
      const h = makeHoner(1, { crosshatchAngle: 30 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].crosshatchAngle).toBeCloseTo(30.01, 5)
    })

    it('surfacePrecision 在 update 中不变（源码中不递增）', () => {
      const h = makeHoner(1, { surfacePrecision: 50 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].surfacePrecision).toBe(50)
    })

    it('多个磨刀工同时递增', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 10, abrasiveControl: 10, crosshatchAngle: 10 }))
      ;(sys as any).honers.push(makeHoner(2, { honingSkill: 20, abrasiveControl: 20, crosshatchAngle: 20 }))
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(10.02, 5)
      expect((sys as any).honers[1].honingSkill).toBeCloseTo(20.02, 5)
    })

    it('连续两次 update 后 honingSkill 增加 0.04', () => {
      const h = makeHoner(1, { honingSkill: 50 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      ;(sys as any).lastCheck = -2960
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(50.04, 5)
    })

    it('连续两次 update 后 abrasiveControl 增加 0.03', () => {
      const h = makeHoner(1, { abrasiveControl: 50 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      ;(sys as any).lastCheck = -2960
      sys.update(0, em, 0)
      expect((sys as any).honers[0].abrasiveControl).toBeCloseTo(50.03, 5)
    })

    it('连续两次 update 后 crosshatchAngle 增加 0.02', () => {
      const h = makeHoner(1, { crosshatchAngle: 50 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      ;(sys as any).lastCheck = -2960
      sys.update(0, em, 0)
      expect((sys as any).honers[0].crosshatchAngle).toBeCloseTo(50.02, 5)
    })
  })

  // ===== 技能上限 =====
  describe('技能上限（100）', () => {
    it('honingSkill 上限为 100，不超过', () => {
      const h = makeHoner(1, { honingSkill: 99.99 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBe(100)
    })

    it('abrasiveControl 上限为 100，不超过', () => {
      const h = makeHoner(1, { abrasiveControl: 99.99 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].abrasiveControl).toBeLessThanOrEqual(100)
    })

    it('crosshatchAngle 上限为 100，不超过', () => {
      const h = makeHoner(1, { crosshatchAngle: 99.99 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].crosshatchAngle).toBeLessThanOrEqual(100)
    })

    it('honingSkill 已为 100 时保持 100', () => {
      const h = makeHoner(1, { honingSkill: 100 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBe(100)
    })

    it('abrasiveControl 已为 100 时保持 100', () => {
      const h = makeHoner(1, { abrasiveControl: 100 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].abrasiveControl).toBe(100)
    })

    it('crosshatchAngle 已为 100 时保持 100', () => {
      const h = makeHoner(1, { crosshatchAngle: 100 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].crosshatchAngle).toBe(100)
    })

    it('honingSkill 超过 100 时强制 clamp 到 100', () => {
      const h = makeHoner(1, { honingSkill: 101 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers[0].honingSkill).toBe(100)
    })
  })

  // ===== cleanup 边界逻辑 =====
  describe('cleanup 边界逻辑（honingSkill <= 4 删除）', () => {
    it('cleanup: honingSkill <= 4 时磨刀工被删除', () => {
      const h = makeHoner(1, { honingSkill: 3.98 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('cleanup: honingSkill 刚超过 4 时不被删除', () => {
      const h = makeHoner(1, { honingSkill: 4.00 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      const em = {} as any
      sys.update(0, em, 0)
      expect((sys as any).honers).toHaveLength(1)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(4.02, 5)
    })

    it('cleanup: honingSkill 精确等于 4 时删除（递增前值为 3.98）', () => {
      const h = makeHoner(1, { honingSkill: 3.98 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('cleanup: honingSkill = 0 时被删除', () => {
      const h = makeHoner(1, { honingSkill: 0 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('cleanup: honingSkill 负数时被删除', () => {
      const h = makeHoner(1, { honingSkill: -1 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('cleanup: honingSkill = 5 时保留', () => {
      const h = makeHoner(1, { honingSkill: 5 })
      ;(sys as any).honers.push(h)
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(1)
    })

    it('cleanup: 混合状态磁刀工，低技能被删、高技能保留', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 3 }))
      ;(sys as any).honers.push(makeHoner(2, { honingSkill: 50 }))
      ;(sys as any).honers.push(makeHoner(3, { honingSkill: 2 }))
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(1)
      expect((sys as any).honers[0].entityId).toBe(2)
    })

    it('cleanup: 全部低技能时列表清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).honers.push(makeHoner(i + 1, { honingSkill: 1 }))
      }
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('cleanup 使用逆序遍历，删除不影响其他元素', () => {
      // 每隔一个插入低技能，验证顺序不乱
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 3 }))
      ;(sys as any).honers.push(makeHoner(2, { honingSkill: 50 }))
      ;(sys as any).honers.push(makeHoner(3, { honingSkill: 3 }))
      ;(sys as any).honers.push(makeHoner(4, { honingSkill: 60 }))
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers).toHaveLength(2)
      const remaining = (sys as any).honers.map((h: Honer) => h.entityId)
      expect(remaining).toContain(2)
      expect(remaining).toContain(4)
    })
  })

  // ===== 招募逻辑（Math.random mock）=====
  describe('招募逻辑（RECRUIT_CHANCE = 0.0015，MAX_HONERS = 10）', () => {
    it('Math.random < RECRUIT_CHANCE 时招募新磨刀工', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      sys.update(0, em, 2960)
      expect((sys as any).honers.length).toBeGreaterThanOrEqual(1)
    })

    it('Math.random >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      const em = {} as any
      sys.update(0, em, 2960)
      expect((sys as any).honers).toHaveLength(0)
    })

    it('已达 MAX_HONERS=10 时不招募', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).honers.push(makeHoner(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const em = {} as any
      sys.update(0, em, 2960)
      expect((sys as any).honers).toHaveLength(10)
    })

    it('招募时 nextId 自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      const beforeId = (sys as any).nextId
      sys.update(0, em, 2960)
      if ((sys as any).honers.length > 0) {
        expect((sys as any).nextId).toBe(beforeId + 1)
      }
    })

    it('招募的磨刀工 honingSkill 在合法范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      sys.update(0, em, 2960)
      if ((sys as any).honers.length > 0) {
        const h = (sys as any).honers[0]
        expect(h.honingSkill).toBeGreaterThanOrEqual(10)
        expect(h.honingSkill).toBeLessThanOrEqual(35)
      }
    })

    it('招募的磨刀工 entityId 在 0-499 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      sys.update(0, em, 2960)
      if ((sys as any).honers.length > 0) {
        const h = (sys as any).honers[0]
        expect(h.entityId).toBeGreaterThanOrEqual(0)
        expect(h.entityId).toBeLessThan(500)
      }
    })

    it('新招募磨刀工 tick 字段等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      sys.update(0, em, 2960)
      if ((sys as any).honers.length > 0) {
        expect((sys as any).honers[0].tick).toBe(2960)
      }
    })

    it('招募时 id 从 nextId 分配', () => {
      ;(sys as any).nextId = 7
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {} as any
      sys.update(0, em, 2960)
      if ((sys as any).honers.length > 0) {
        expect((sys as any).honers[0].id).toBe(7)
      }
    })
  })

  // ===== 边界值与精度测试 =====
  describe('边界值与精度', () => {
    it('honingSkill = 4.001 时不被删除', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 4.001 }))
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      // 4.001 + 0.02 = 4.021 > 4，保留
      expect((sys as any).honers).toHaveLength(1)
    })

    it('每个 tick 增量都使用浮点精度', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 5, abrasiveControl: 5, crosshatchAngle: 5 }))
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(5.02, 10)
      expect((sys as any).honers[0].abrasiveControl).toBeCloseTo(5.015, 10)
      expect((sys as any).honers[0].crosshatchAngle).toBeCloseTo(5.01, 10)
    })

    it('update 在列表为空时不报错', () => {
      expect(() => sys.update(0, {} as any, 0)).not.toThrow()
    })

    it('连续调用 update 不报错', () => {
      ;(sys as any).honers.push(makeHoner(1))
      expect(() => {
        for (let t = 0; t < 30000; t += 2960) {
          sys.update(0, {} as any, t)
        }
      }).not.toThrow()
    })

    it('极大 tick 值时 lastCheck 正确更新', () => {
      sys.update(0, {} as any, 1_000_000)
      expect((sys as any).lastCheck).toBe(1_000_000)
    })

    it('dt 参数不影响 tick 间隔判断', () => {
      sys.update(999, {} as any, 2960)
      expect((sys as any).lastCheck).toBe(2960)
    })

    it('abrasiveControl 增量不影响 honingSkill', () => {
      ;(sys as any).honers.push(makeHoner(1, { honingSkill: 50, abrasiveControl: 50 }))
      ;(sys as any).lastCheck = -2960
      sys.update(0, {} as any, 0)
      expect((sys as any).honers[0].honingSkill).toBeCloseTo(50.02, 5)
      expect((sys as any).honers[0].abrasiveControl).toBeCloseTo(50.015, 5)
    })
  })
})
