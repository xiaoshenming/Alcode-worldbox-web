import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFlatterSystem } from '../systems/CreatureFlatterSystem'
import type { Flatter } from '../systems/CreatureFlatterSystem'

let nextId = 1
function makeSys(): CreatureFlatterSystem { return new CreatureFlatterSystem() }
function makeFlatter(entityId: number, flattingSkill = 50): Flatter {
  return {
    id: nextId++,
    entityId,
    flattingSkill,
    rollingPressure: 60,
    sheetUniformity: 70,
    thicknessControl: 80,
    tick: 0,
  }
}

const CHECK_INTERVAL = 2910

describe('CreatureFlatterSystem', () => {
  let sys: CreatureFlatterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ============================================================
  // 一、初始状态测试
  // ============================================================
  describe('初始状态', () => {
    it('初始无压平工', () => {
      expect((sys as any).flatters).toHaveLength(0)
    })

    it('flatters 是数组实例', () => {
      expect(Array.isArray((sys as any).flatters)).toBe(true)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
  })

  // ============================================================
  // 二、数据注入与查询
  // ============================================================
  describe('数据注入与查询', () => {
    it('注入后可���询', () => {
      ;(sys as any).flatters.push(makeFlatter(1))
      expect((sys as any).flatters[0].entityId).toBe(1)
    })

    it('多个全部返回', () => {
      ;(sys as any).flatters.push(makeFlatter(1))
      ;(sys as any).flatters.push(makeFlatter(2))
      expect((sys as any).flatters).toHaveLength(2)
    })

    it('四字段数据完整（flattingSkill/rollingPressure/sheetUniformity/thicknessControl）', () => {
      const f = makeFlatter(10)
      f.flattingSkill = 90; f.rollingPressure = 85; f.sheetUniformity = 80; f.thicknessControl = 75
      ;(sys as any).flatters.push(f)
      const r = (sys as any).flatters[0]
      expect(r.flattingSkill).toBe(90)
      expect(r.rollingPressure).toBe(85)
      expect(r.sheetUniformity).toBe(80)
      expect(r.thicknessControl).toBe(75)
    })

    it('Flatter 结构包含必需字段 id/entityId/tick', () => {
      const f = makeFlatter(5)
      ;(sys as any).flatters.push(f)
      const r = (sys as any).flatters[0]
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('entityId')
      expect(r).toHaveProperty('tick')
    })

    it('注入10个后长度为10', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).flatters.push(makeFlatter(i))
      }
      expect((sys as any).flatters).toHaveLength(10)
    })

    it('sheetUniformity 字段读写正确', () => {
      const f = makeFlatter(1)
      f.sheetUniformity = 45
      ;(sys as any).flatters.push(f)
      expect((sys as any).flatters[0].sheetUniformity).toBe(45)
    })

    it('tick 字段初始为 0', () => {
      const f = makeFlatter(1)
      ;(sys as any).flatters.push(f)
      expect((sys as any).flatters[0].tick).toBe(0)
    })
  })

  // ============================================================
  // 三、update / tick 节流测试
  // ============================================================
  describe('update tick 节流 (CHECK_INTERVAL=2910)', () => {
    it('tick差值 < CHECK_INTERVAL 时不更新 lastCheck', () => {
      const em = {} as any
      sys.update(1, em, 100)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 = CHECK_INTERVAL-1 时不更新 lastCheck', () => {
      const em = {} as any
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 >= CHECK_INTERVAL 时更新 lastCheck', () => {
      const em = {} as any
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick差值 > CHECK_INTERVAL 时更新 lastCheck', () => {
      const em = {} as any
      sys.update(1, em, 3000)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('第二次触发：lastCheck=3000，tick=6000 时触发更新', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 3000
      sys.update(1, em, 3000 + CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(3000 + CHECK_INTERVAL)
    })

    it('第二次触发前 tick 不足时 lastCheck 不变', () => {
      const em = {} as any
      ;(sys as any).lastCheck = 3000
      sys.update(1, em, 3000 + CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(3000)
    })

    it('tick 未达到阈值时技能不增加', () => {
      const f = makeFlatter(1, 50)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      sys.update(1, em, CHECK_INTERVAL - 1)
      expect((sys as any).flatters[0].flattingSkill).toBe(50)
    })
  })

  // ============================================================
  // 四、技能增长测试
  // ============================================================
  describe('技能增长', () => {
    it('update 后 flattingSkill 增加 0.02', () => {
      const f = makeFlatter(1, 50)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].flattingSkill).toBeCloseTo(50.02)
    })

    it('update 后 rollingPressure 增加 0.015', () => {
      const f = makeFlatter(1, 50)
      f.rollingPressure = 40
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].rollingPressure).toBeCloseTo(40.015)
    })

    it('update 后 thicknessControl 增加 0.01', () => {
      const f = makeFlatter(1, 50)
      f.thicknessControl = 30
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].thicknessControl).toBeCloseTo(30.01)
    })

    it('sheetUniformity 不在增长列表，值保持不变', () => {
      const f = makeFlatter(1, 50)
      f.sheetUniformity = 55
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].sheetUniformity).toBe(55)
    })

    it('多个 flatter 都会增长 flattingSkill', () => {
      ;(sys as any).flatters.push(makeFlatter(1, 20))
      ;(sys as any).flatters.push(makeFlatter(2, 30))
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].flattingSkill).toBeCloseTo(20.02)
      expect((sys as any).flatters[1].flattingSkill).toBeCloseTo(30.02)
    })

    it('多个 flatter 都会增长 rollingPressure', () => {
      const f1 = makeFlatter(1, 50); f1.rollingPressure = 20
      const f2 = makeFlatter(2, 50); f2.rollingPressure = 30
      ;(sys as any).flatters.push(f1)
      ;(sys as any).flatters.push(f2)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].rollingPressure).toBeCloseTo(20.015)
      expect((sys as any).flatters[1].rollingPressure).toBeCloseTo(30.015)
    })
  })

  // ============================================================
  // 五、上限测试（100 封顶）
  // ============================================================
  describe('技能上限（100）', () => {
    it('flattingSkill 上限为 100（不超过）', () => {
      const f = makeFlatter(1, 99.99)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].flattingSkill).toBe(100)
    })

    it('rollingPressure 上限为 100（不超过）', () => {
      const f = makeFlatter(1, 50)
      f.rollingPressure = 99.99
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].rollingPressure).toBe(100)
    })

    it('thicknessControl 上限为 100（不超过）', () => {
      const f = makeFlatter(1, 50)
      f.thicknessControl = 99.99
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].thicknessControl).toBe(100)
    })

    it('flattingSkill 恰好为 100 后仍为 100', () => {
      const f = makeFlatter(1, 100)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].flattingSkill).toBe(100)
    })

    it('rollingPressure 恰好为 100 后仍为 100', () => {
      const f = makeFlatter(1, 50)
      f.rollingPressure = 100
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters[0].rollingPressure).toBe(100)
    })
  })

  // ============================================================
  // 六、cleanup 逻辑（flattingSkill <= 4 删除）
  // ============================================================
  describe('cleanup 逻辑', () => {
    it('cleanup: flattingSkill=3.98 递增后=4.00 <= 4 → 被删除', () => {
      const f = makeFlatter(1, 3.98)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(0)
    })

    it('cleanup: flattingSkill=3.97 递增后=3.99 <= 4 → 被删除', () => {
      const f = makeFlatter(1, 3.97)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(0)
    })

    it('cleanup: flattingSkill=1 远低于 4 → 被删除', () => {
      const f = makeFlatter(1, 1)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(0)
    })

    it('cleanup: flattingSkill > 4 时保留（5 → 5.02 → 保留）', () => {
      const f = makeFlatter(1, 5)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(1)
    })

    it('cleanup: flattingSkill=4.01 递增后=4.03 > 4 → 保留', () => {
      const f = makeFlatter(1, 4.01)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(1)
    })

    it('cleanup: entityId=1 删除，entityId=2 保留（混合场景）', () => {
      const f1 = makeFlatter(1, 3.98) // 3.98+0.02=4.00 -> 删除
      const f2 = makeFlatter(2, 50)   // 保留
      ;(sys as any).flatters.push(f1)
      ;(sys as any).flatters.push(f2)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(1)
      expect((sys as any).flatters[0].entityId).toBe(2)
    })

    it('cleanup: 多个低技能全部删除', () => {
      ;(sys as any).flatters.push(makeFlatter(1, 1))
      ;(sys as any).flatters.push(makeFlatter(2, 2))
      ;(sys as any).flatters.push(makeFlatter(3, 3))
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(0)
    })

    it('cleanup: 先增长后删除（顺序正确）—— 技能从3.99到4.01>4不删', () => {
      // 3.99 + 0.02 = 4.01 > 4 -> 保留
      const f = makeFlatter(1, 3.99)
      ;(sys as any).flatters.push(f)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(1)
    })

    it('cleanup 从尾部向前删除不影响前面元素顺序', () => {
      const f1 = makeFlatter(1, 50)   // 保留
      const f2 = makeFlatter(2, 3.98) // 删除
      const f3 = makeFlatter(3, 60)   // 保留
      ;(sys as any).flatters.push(f1)
      ;(sys as any).flatters.push(f2)
      ;(sys as any).flatters.push(f3)
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(2)
      expect((sys as any).flatters[0].entityId).toBe(1)
      expect((sys as any).flatters[1].entityId).toBe(3)
    })
  })

  // ============================================================
  // 七、随机招募相关（只测上限，不测随机）
  // ============================================================
  describe('MAX_FLATTERS 上限约束', () => {
    it('已达 MAX_FLATTERS=10 时，即使随机命中也不招募', () => {
      // 强制注入10个
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).flatters.push(makeFlatter(i, 50))
      }
      // 替换 Math.random 使其始终小于 RECRUIT_CHANCE 的补集，即直接让条件 length < MAX 不成立
      const em = {} as any
      ;(sys as any).lastCheck = 0
      const before = (sys as any).flatters.length
      // 调用一次 update，由于 length=10 不小于 MAX_FLATTERS，不招募
      vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < RECRUIT_CHANCE=0.0015，触发招募条件
      sys.update(1, em, CHECK_INTERVAL)
      // 不应超过 10（cleanup 可能减少，但不应增加）
      expect((sys as any).flatters.length).toBeLessThanOrEqual(10)
    })

    it('未达 MAX_FLATTERS 且 random=0 时会招募新压平工', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0015 → 触发招募
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      // 新招募的 flattingSkill 在 10~35 范围内 (10 + random*25)，
      // 用 random=0 则 flattingSkill=10, > 4，不会被 cleanup 删除
      expect((sys as any).flatters.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1) // 1 >= 0.0015 不触发
      const em = {} as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, CHECK_INTERVAL)
      expect((sys as any).flatters).toHaveLength(0)
    })
  })
})
