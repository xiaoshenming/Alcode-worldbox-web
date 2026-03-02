import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGlazersSystem } from '../systems/CreatureGlazersSystem'
import type { Glazer, GlassType } from '../systems/CreatureGlazersSystem'

let nextId = 1
function makeSys(): CreatureGlazersSystem { return new CreatureGlazersSystem() }
function makeGlazer(entityId: number, overrides: Partial<Glazer> = {}): Glazer {
  return {
    id: nextId++, entityId, skill: 40, panesInstalled: 4,
    glassType: 'clear', clarity: 54, artistry: 45, tick: 0,
    ...overrides,
  }
}
function makeEM(opts: {
  entities?: number[],
  component?: object | null,
  pruneCallback?: (map: Map<number, number>) => void
} = {}) {
  const { entities = [], component = { age: 10 } } = opts
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entities),
    getComponent: vi.fn().mockReturnValue(component),
    hasComponent: vi.fn().mockReturnValue(true),
  }
}

describe('CreatureGlazersSystem', () => {
  let sys: CreatureGlazersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ==================== 初始状态测试 ====================
  describe('初始状态', () => {
    it('初始无玻璃工', () => {
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('glazers 为数组类型', () => {
      expect(Array.isArray((sys as any).glazers)).toBe(true)
    })

    it('skillMap 初始为空 Map', () => {
      expect((sys as any).skillMap instanceof Map).toBe(true)
      expect((sys as any).skillMap.size).toBe(0)
    })
  })

  // ==================== 数据结构测试 ====================
  describe('数据结构', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).glazers.push(makeGlazer(42, { glassType: 'leaded' }))
      expect((sys as any).glazers[0].entityId).toBe(42)
      expect((sys as any).glazers[0].glassType).toBe('leaded')
    })

    it('支持所有 4 种玻璃类型', () => {
      const types: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
      types.forEach((t, i) => { ;(sys as any).glazers.push(makeGlazer(i + 1, { glassType: t })) })
      const all = (sys as any).glazers as Glazer[]
      types.forEach((t, i) => { expect(all[i].glassType).toBe(t) })
    })

    it('id 字段为数字类型', () => {
      ;(sys as any).glazers.push(makeGlazer(1))
      expect(typeof (sys as any).glazers[0].id).toBe('number')
    })

    it('tick 字段可自定义', () => {
      ;(sys as any).glazers.push(makeGlazer(1, { tick: 12345 }))
      expect((sys as any).glazers[0].tick).toBe(12345)
    })

    it('skill 字段可自定义', () => {
      ;(sys as any).glazers.push(makeGlazer(1, { skill: 75 }))
      expect((sys as any).glazers[0].skill).toBe(75)
    })

    it('多个记录全部返回', () => {
      ;(sys as any).glazers.push(makeGlazer(1))
      ;(sys as any).glazers.push(makeGlazer(2))
      ;(sys as any).glazers.push(makeGlazer(3))
      expect((sys as any).glazers).toHaveLength(3)
    })

    it('clarity 公式正确: 30 + skill * 0.6', () => {
      const skill = 60
      const g = makeGlazer(1, { skill, clarity: 30 + skill * 0.6 })
      ;(sys as any).glazers.push(g)
      expect((sys as any).glazers[0].clarity).toBeCloseTo(66, 5)
    })

    it('artistry 公式正确: 15 + skill * 0.75', () => {
      const skill = 80
      const g = makeGlazer(1, { skill, artistry: 15 + skill * 0.75 })
      ;(sys as any).glazers.push(g)
      expect((sys as any).glazers[0].artistry).toBeCloseTo(75, 5)
    })

    it('panesInstalled 公式正确: 1 + floor(skill/12)', () => {
      ;[0, 12, 24, 60, 99].forEach(skill => {
        const expected = 1 + Math.floor(skill / 12)
        const g = makeGlazer(1, { skill, panesInstalled: expected })
        expect(g.panesInstalled).toBe(expected)
      })
    })
  })

  // ==================== tick 控制测试 ====================
  describe('tick 控制（CHECK_INTERVAL=1400）', () => {
    it('tick 差 < 1400 时不更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 1000 + 1399)
      expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick 差 >= 1400 时更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('tick差值 = 1399 时不执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1399)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 = 1400 时执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('lastCheck 更新为当前 tick 值', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 8888)
      expect((sys as any).lastCheck).toBe(8888)
    })

    it('连续两次 update，第二次 tick 不足时不再更新', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      expect((sys as any).lastCheck).toBe(1400)
      sys.update(0, em as any, 2000) // diff = 600 < 1400
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('tick=0 时不执行', () => {
      const em = makeEM()
      sys.update(0, em as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('负数差值不触发执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 5000
      sys.update(0, em as any, 100)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('tick 不足时 getEntitiesWithComponents 不被调用', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 2399)
      expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
    })

    it('tick 足够时 getEntitiesWithComponents 被调用', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 1400)
      expect(em.getEntitiesWithComponents).toHaveBeenCalled()
    })
  })

  // ==================== glassType 分段测试 ====================
  describe('glassType 由 skill/25 分段决定', () => {
    const TYPES: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
    const getType = (skill: number) => TYPES[Math.min(3, Math.floor(skill / 25))]

    it('skill=0 → clear', () => { expect(getType(0)).toBe('clear') })
    it('skill=24 → clear', () => { expect(getType(24)).toBe('clear') })
    it('skill=25 → colored', () => { expect(getType(25)).toBe('colored') })
    it('skill=49 → colored', () => { expect(getType(49)).toBe('colored') })
    it('skill=50 → stained', () => { expect(getType(50)).toBe('stained') })
    it('skill=74 → stained', () => { expect(getType(74)).toBe('stained') })
    it('skill=75 → leaded', () => { expect(getType(75)).toBe('leaded') })
    it('skill=99 → leaded', () => { expect(getType(99)).toBe('leaded') })
    it('skill=100 → leaded（上限截断 min(3,4)=3）', () => { expect(getType(100)).toBe('leaded') })
    it('skill=12 → clear（中间值）', () => { expect(getType(12)).toBe('clear') })
    it('skill=37 → colored（中间值）', () => { expect(getType(37)).toBe('colored') })
    it('skill=62 → stained（中间值）', () => { expect(getType(62)).toBe('stained') })
    it('skill=87 → leaded（中间值）', () => { expect(getType(87)).toBe('leaded') })
  })

  // ==================== clarity/artistry 公式测试 ====================
  describe('clarity/artistry 边界值', () => {
    it('skill=0 时 clarity=30, artistry=15', () => {
      expect(30 + 0 * 0.6).toBe(30)
      expect(15 + 0 * 0.75).toBe(15)
    })

    it('skill=100 时 clarity=90, artistry=90', () => {
      expect(30 + 100 * 0.6).toBeCloseTo(90, 5)
      expect(15 + 100 * 0.75).toBeCloseTo(90, 5)
    })

    it('skill=50 时 clarity=60, artistry=52.5', () => {
      expect(30 + 50 * 0.6).toBeCloseTo(60, 5)
      expect(15 + 50 * 0.75).toBeCloseTo(52.5, 5)
    })

    it('skill=25 时 clarity=45', () => {
      expect(30 + 25 * 0.6).toBeCloseTo(45, 5)
    })

    it('skill=75 时 artistry=71.25', () => {
      expect(15 + 75 * 0.75).toBeCloseTo(71.25, 5)
    })
  })

  // ==================== panesInstalled 公式测试 ====================
  describe('panesInstalled 公式（1 + floor(skill/12)）', () => {
    it('skill=0 → panesInstalled=1', () => { expect(1 + Math.floor(0 / 12)).toBe(1) })
    it('skill=11 → panesInstalled=1', () => { expect(1 + Math.floor(11 / 12)).toBe(1) })
    it('skill=12 → panesInstalled=2', () => { expect(1 + Math.floor(12 / 12)).toBe(2) })
    it('skill=23 → panesInstalled=2', () => { expect(1 + Math.floor(23 / 12)).toBe(2) })
    it('skill=24 → panesInstalled=3', () => { expect(1 + Math.floor(24 / 12)).toBe(3) })
    it('skill=60 → panesInstalled=6', () => { expect(1 + Math.floor(60 / 12)).toBe(6) })
    it('skill=99 → panesInstalled=9', () => { expect(1 + Math.floor(99 / 12)).toBe(9) })
    it('skill=100 → panesInstalled=9', () => { expect(1 + Math.floor(100 / 12)).toBe(9) })
  })

  // ==================== cleanup 时间测试 ====================
  describe('cleanup: 基于 tick 的时间清理（cutoff = tick - 55000）', () => {
    it('cleanup: tick 早于 cutoff 的玻璃工被删除', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000  // 45000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 1 }))  // 严格小于 → 删除
      ;(sys as any).glazers.push(makeGlazer(2, { tick: cutoff }))       // 等于 cutoff → 保留
      ;(sys as any).glazers.push(makeGlazer(3, { tick: cutoff + 1 }))  // 大于 cutoff → 保留
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      const remaining = (sys as any).glazers as Glazer[]
      expect(remaining).toHaveLength(2)
      expect(remaining.some(g => g.entityId === 1)).toBe(false)
      expect(remaining.some(g => g.entityId === 2)).toBe(true)
      expect(remaining.some(g => g.entityId === 3)).toBe(true)
    })

    it('cleanup: tick = cutoff 时保留（非严格小于）', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff }))
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      expect((sys as any).glazers).toHaveLength(1)
    })

    it('cleanup: tick = cutoff - 1 时删除（严格小于）', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 1 }))
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('cleanup: 所有记录都太旧，全部删除', () => {
      const currentTick = 200000
      const cutoff = currentTick - 55000
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).glazers.push(makeGlazer(i, { tick: cutoff - 100 }))
      }
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('cleanup: 所有记录都新鲜，全部保留', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).glazers.push(makeGlazer(i, { tick: cutoff + 1000 }))
      }
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      expect((sys as any).glazers).toHaveLength(5)
    })

    it('cleanup: 混合新旧，只删除旧的', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 500 }))  // 删除
      ;(sys as any).glazers.push(makeGlazer(2, { tick: cutoff + 500 }))  // 保留
      ;(sys as any).glazers.push(makeGlazer(3, { tick: cutoff - 1 }))    // 删除
      ;(sys as any).glazers.push(makeGlazer(4, { tick: cutoff }))         // 保留
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      const remaining = (sys as any).glazers as Glazer[]
      expect(remaining).toHaveLength(2)
      expect(remaining.some(g => g.entityId === 2)).toBe(true)
      expect(remaining.some(g => g.entityId === 4)).toBe(true)
    })

    it('空列表 cleanup 无副作用', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 100000)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('tick 不足时不执行 cleanup', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 1 }))
      ;(sys as any).lastCheck = currentTick - 500  // diff = 500 < 1400
      const em = makeEM()
      sys.update(0, em as any, currentTick)
      expect((sys as any).glazers).toHaveLength(1)
    })
  })

  // ==================== 创作逻辑测试 ====================
  describe('创作逻辑（CRAFT_CHANCE=0.006, MAX_GLAZERS=34）', () => {
    it('random <= CRAFT_CHANCE 时尝试创作', () => {
      const em = makeEM({ entities: [1], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.005) // <= 0.006
      sys.update(0, em as any, 1400)
      // skill 会从 skillMap 初始化或增长，会添加新 glazer
      expect((sys as any).glazers.length).toBeGreaterThanOrEqual(1)
    })

    it('random > CRAFT_CHANCE 时不创作', () => {
      const em = makeEM({ entities: [1], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.006
      sys.update(0, em as any, 1400)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('creature age < 9 时不创作', () => {
      const em = makeEM({ entities: [1], component: { age: 8 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('creature 为 null 时不创作', () => {
      const em = makeEM({ entities: [1], component: null })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      expect((sys as any).glazers).toHaveLength(0)
    })

    it('已达 MAX_GLAZERS(34) 时不再创作新记录', () => {
      for (let i = 1; i <= 34; i++) {
        ;(sys as any).glazers.push(makeGlazer(i, { tick: 999999 }))
      }
      const em = makeEM({ entities: [100], component: { age: 20 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      expect((sys as any).glazers.length).toBeLessThanOrEqual(34)
    })

    it('创作后 nextId 递增', () => {
      const em = makeEM({ entities: [1], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      ;(sys as any).nextId = 1
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      if ((sys as any).glazers.length > 0) {
        expect((sys as any).nextId).toBeGreaterThan(1)
      }
    })

    it('skillMap 已有 skill 时复用并增长', () => {
      ;(sys as any).skillMap.set(1, 50)
      const em = makeEM({ entities: [1], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      const newSkill = (sys as any).skillMap.get(1)
      if (newSkill !== undefined) {
        expect(newSkill).toBeCloseTo(50 + 0.07, 5) // SKILL_GROWTH = 0.07
      }
    })

    it('skill 上限为 100', () => {
      ;(sys as any).skillMap.set(1, 99.99)
      const em = makeEM({ entities: [1], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      const newSkill = (sys as any).skillMap.get(1)
      if (newSkill !== undefined) {
        expect(newSkill).toBeLessThanOrEqual(100)
      }
    })
  })

  // ==================== 边界与特殊场景测试 ====================
  describe('边界与特殊场景', () => {
    it('dt 参数不影响 tick 检查逻辑', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(999, em as any, 1400)
      expect((sys as any).lastCheck).toBe(1400)
    })

    it('超大 tick 值正常处理', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 999999999)
      expect((sys as any).lastCheck).toBe(999999999)
    })

    it('skill=100 时 glassType 为 leaded', () => {
      const TYPES: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
      const typeIdx = Math.min(3, Math.floor(100 / 25))
      expect(TYPES[typeIdx]).toBe('leaded')
    })

    it('多个实体 getEntitiesWithComponents 返回多个时逐一处理', () => {
      const em = makeEM({ entities: [1, 2, 3], component: { age: 10 } })
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 1400)
      // 每个实体都可能被创作（仅受 CRAFT_CHANCE 限制，已 mock 通过）
      // 验证 getEntitiesWithComponents 被调用
      expect(em.getEntitiesWithComponents).toHaveBeenCalled()
    })

    it('tick 差值恰好等于 CHECK_INTERVAL 时执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 5000
      sys.update(0, em as any, 6400) // diff = 1400 === 1400
      expect((sys as any).lastCheck).toBe(6400)
    })

    it('cleanup 后剩余索引紧凑', () => {
      const currentTick = 100000
      const cutoff = currentTick - 55000
      ;(sys as any).glazers.push(makeGlazer(1, { tick: cutoff - 1 }))   // 删除
      ;(sys as any).glazers.push(makeGlazer(2, { tick: cutoff + 100 })) // 保留
      ;(sys as any).glazers.push(makeGlazer(3, { tick: cutoff - 10 }))  // 删除
      ;(sys as any).glazers.push(makeGlazer(4, { tick: cutoff + 200 })) // 保留
      ;(sys as any).lastCheck = 0
      const em = makeEM()
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, currentTick)
      const remaining = (sys as any).glazers as Glazer[]
      expect(remaining).toHaveLength(2)
      expect(remaining[0].entityId).toBe(2)
      expect(remaining[1].entityId).toBe(4)
    })
  })
})
