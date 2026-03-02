import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDrifterSystem } from '../systems/CreatureDrifterSystem'
import type { Drifter } from '../systems/CreatureDrifterSystem'

let nextId = 1
function makeSys(): CreatureDrifterSystem { return new CreatureDrifterSystem() }
function makeDrifter(entityId: number, driftingSkill = 30): Drifter {
  return { id: nextId++, entityId, driftingSkill, pinAlignment: 25, holeExpansion: 20, taperControl: 35, tick: 0 }
}
function makeEM(entities: number[] = []) {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue(entities) }
}

describe('CreatureDrifterSystem', () => {
  let sys: CreatureDrifterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ==================== 初始状态测试 ====================
  describe('初始状态', () => {
    it('初始无漂移工', () => {
      expect((sys as any).drifters).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('drifters 为数组类型', () => {
      expect(Array.isArray((sys as any).drifters)).toBe(true)
    })
  })

  // ==================== 数据结构测试 ====================
  describe('数据结构', () => {
    it('注入后可查询 entityId', () => {
      ;(sys as any).drifters.push(makeDrifter(1))
      expect((sys as any).drifters[0].entityId).toBe(1)
    })

    it('多个全部��回', () => {
      ;(sys as any).drifters.push(makeDrifter(1))
      ;(sys as any).drifters.push(makeDrifter(2))
      expect((sys as any).drifters).toHaveLength(2)
    })

    it('四字段数据完整', () => {
      const d = makeDrifter(10)
      d.driftingSkill = 80; d.pinAlignment = 75; d.holeExpansion = 70; d.taperControl = 65
      ;(sys as any).drifters.push(d)
      const r = (sys as any).drifters[0]
      expect(r.driftingSkill).toBe(80)
      expect(r.pinAlignment).toBe(75)
      expect(r.holeExpansion).toBe(70)
      expect(r.taperControl).toBe(65)
    })

    it('id 字段存在且为数字', () => {
      const d = makeDrifter(5)
      ;(sys as any).drifters.push(d)
      expect(typeof (sys as any).drifters[0].id).toBe('number')
    })

    it('tick 字段初始为 0', () => {
      const d = makeDrifter(1)
      ;(sys as any).drifters.push(d)
      expect((sys as any).drifters[0].tick).toBe(0)
    })

    it('返回内部引用稳定', () => {
      ;(sys as any).drifters.push(makeDrifter(1))
      expect((sys as any).drifters).toBe((sys as any).drifters)
    })

    it('driftingSkill 初始值默认30', () => {
      const d = makeDrifter(1)
      expect(d.driftingSkill).toBe(30)
    })

    it('pinAlignment 初始值默认25', () => {
      const d = makeDrifter(1)
      expect(d.pinAlignment).toBe(25)
    })

    it('holeExpansion 初始值默认20', () => {
      const d = makeDrifter(1)
      expect(d.holeExpansion).toBe(20)
    })

    it('taperControl 初始值默认35', () => {
      const d = makeDrifter(1)
      expect(d.taperControl).toBe(35)
    })

    it('多个漂移工 entityId 各不同', () => {
      ;(sys as any).drifters.push(makeDrifter(1))
      ;(sys as any).drifters.push(makeDrifter(2))
      ;(sys as any).drifters.push(makeDrifter(3))
      const ids = (sys as any).drifters.map((d: Drifter) => d.entityId)
      expect(new Set(ids).size).toBe(3)
    })
  })

  // ==================== tick 控制测试 ====================
  describe('tick 控制', () => {
    it('tick差值 < 3040 时不更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 4039)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差值 >= 3040 时更新 lastCheck', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 4040)
      expect((sys as any).lastCheck).toBe(4040)
    })

    it('tick差值 = 0 时不执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 5000
      sys.update(0, em as any, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('tick差值 = 3039 时不执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3039)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick差值 = 3040 时执行（边界值）', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).lastCheck).toBe(3040)
    })

    it('lastCheck 更新为当前 tick 值', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 9999)
      expect((sys as any).lastCheck).toBe(9999)
    })

    it('tick=0 时不执行（差值为0）', () => {
      const em = makeEM()
      sys.update(0, em as any, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续两次 update，第二次 tick 不足时不再更新', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).lastCheck).toBe(3040)
      sys.update(0, em as any, 4000)
      expect((sys as any).lastCheck).toBe(3040)
    })
  })

  // ==================== 技能增长测试 ====================
  describe('技能增长', () => {
    it('update后 driftingSkill 增加 0.02', () => {
      const d = makeDrifter(1, 30)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].driftingSkill).toBeCloseTo(30.02, 5)
    })

    it('update后 pinAlignment 增加 0.015', () => {
      const d = makeDrifter(1, 30)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].pinAlignment).toBeCloseTo(25.015, 5)
    })

    it('update后 taperControl 增加 0.01', () => {
      const d = makeDrifter(1, 30)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].taperControl).toBeCloseTo(35.01, 5)
    })

    it('driftingSkill 上限为 100，不超过', () => {
      const d = makeDrifter(1, 99.99)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].driftingSkill).toBe(100)
    })

    it('taperControl 上限为 100，不超过', () => {
      const d = makeDrifter(1, 30)
      d.taperControl = 99.995
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].taperControl).toBe(100)
    })

    it('pinAlignment 上限为 100，不超过', () => {
      const d = makeDrifter(1, 30)
      d.pinAlignment = 99.99
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].pinAlignment).toBe(100)
    })

    it('已满100的 driftingSkill 不再增长', () => {
      const d = makeDrifter(1, 100)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].driftingSkill).toBe(100)
    })

    it('已满100的 pinAlignment 不再增长', () => {
      const d = makeDrifter(1, 30)
      d.pinAlignment = 100
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].pinAlignment).toBe(100)
    })

    it('多个漂移工同时增长 driftingSkill', () => {
      const d1 = makeDrifter(1, 20)
      const d2 = makeDrifter(2, 50)
      ;(sys as any).drifters.push(d1, d2)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].driftingSkill).toBeCloseTo(20.02, 5)
      expect((sys as any).drifters[1].driftingSkill).toBeCloseTo(50.02, 5)
    })

    it('holeExpansion 字段不被 update 修改', () => {
      const d = makeDrifter(1, 30)
      d.holeExpansion = 55
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].holeExpansion).toBe(55)
    })
  })

  // ==================== cleanup 测试 ====================
  describe('cleanup 删除逻辑', () => {
    it('cleanup: driftingSkill <= 4 后删除', () => {
      const d = makeDrifter(1, 3.97)  // 3.97 + 0.02 = 3.99 <= 4 → 删除
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(0)
    })

    it('cleanup: driftingSkill=3.98 递增到4.00 再删除（边界值）', () => {
      const d1 = makeDrifter(1, 3.98)   // 3.98 + 0.02 = 4.00 → <=4 → 删除
      const d2 = makeDrifter(2, 10.0)   // 10.0 + 0.02 = 10.02 → >4 → 保留
      ;(sys as any).drifters.push(d1, d2)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      const remaining = (sys as any).drifters
      expect(remaining).toHaveLength(1)
      expect(remaining[0].entityId).toBe(2)
    })

    it('cleanup: driftingSkill=4.01 递增后 > 4，不删除', () => {
      const d = makeDrifter(1, 4.01)  // 4.01 + 0.02 = 4.03 → >4 → 保留
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(1)
    })

    it('cleanup: driftingSkill=5 保留', () => {
      const d = makeDrifter(1, 5)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(1)
    })

    it('cleanup: 混合高低技能，只删除低技能', () => {
      const low = makeDrifter(1, 1.0)   // 1+0.02=1.02<=4 → 删除
      const mid = makeDrifter(2, 4.0)   // 4+0.02=4.02>4 → 保留
      const high = makeDrifter(3, 80)   // 保留
      ;(sys as any).drifters.push(low, mid, high)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      const remaining = (sys as any).drifters as Drifter[]
      expect(remaining).toHaveLength(2)
      expect(remaining.some(d => d.entityId === 1)).toBe(false)
      expect(remaining.some(d => d.entityId === 2)).toBe(true)
      expect(remaining.some(d => d.entityId === 3)).toBe(true)
    })

    it('cleanup: driftingSkill=0 被删除', () => {
      const d = makeDrifter(1, 0)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(0)
    })

    it('cleanup: driftingSkill=4.00 exactly 被删除（<=4）', () => {
      const d = makeDrifter(1, 3.98)  // 3.98 + 0.02 = 4.00, <=4 → 删除
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(0)
    })

    it('空列表 cleanup 无副作用', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(0)
    })
  })

  // ==================== 招募逻辑测试 ====================
  describe('招募逻辑', () => {
    it('random < RECRUIT_CHANCE(0.0015) 时招募新漂移工', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0015
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters.length).toBeGreaterThanOrEqual(1)
    })

    it('random >= RECRUIT_CHANCE(0.0015) 时不招募', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.5) // > 0.0015
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters).toHaveLength(0)
    })

    it('已达最大数量 MAX_DRIFTERS(10) 时不招募', () => {
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).drifters.push(makeDrifter(i, 30))
      }
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < 0.0015
      sys.update(0, em as any, 3040)
      // 注意：cleanup会先增长技能，低技能者被删，但10个30技能的都保留，招募被跳过
      // 招募发生在技能增长前，所以此时还有10个，不招募
      const driftersAfter = (sys as any).drifters as Drifter[]
      // 新招募的不存在，所有的都是原来注入的（entityId 1-10）
      const newOnes = driftersAfter.filter(d => d.entityId > 10)
      expect(newOnes).toHaveLength(0)
    })

    it('招募时 nextId 递增', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      ;(sys as any).nextId = 1
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 3040)
      expect((sys as any).nextId).toBe(2)
    })

    it('tick不足时不招募', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(0, em as any, 4039) // diff = 3039 < 3040
      expect((sys as any).drifters).toHaveLength(0)
    })
  })

  // ==================== 边界与特殊场景测试 ====================
  describe('边界与特殊场景', () => {
    it('dt 参数不影响 tick 检查逻辑', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(999, em as any, 3040)
      expect((sys as any).lastCheck).toBe(3040)
    })

    it('负数 tick 差值不触发执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 5000
      sys.update(0, em as any, 100) // tick - lastCheck = 100 - 5000 = -4900 < 3040
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('超大 tick 值正常处理', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 999999999)
      expect((sys as any).lastCheck).toBe(999999999)
    })

    it('多次 update 后技能持续增长', () => {
      const d = makeDrifter(1, 30)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      sys.update(0, em as any, 6080)
      sys.update(0, em as any, 9120)
      expect((sys as any).drifters[0].driftingSkill).toBeCloseTo(30.06, 4)
    })

    it('同一漂移工的三个技能字段独立增长', () => {
      const d = makeDrifter(1, 50)
      d.pinAlignment = 60
      d.taperControl = 70
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      const r = (sys as any).drifters[0]
      expect(r.driftingSkill).toBeCloseTo(50.02, 5)
      expect(r.pinAlignment).toBeCloseTo(60.015, 5)
      expect(r.taperControl).toBeCloseTo(70.01, 5)
    })

    it('5个漂移工同时技能增长都正确', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).drifters.push(makeDrifter(i, 10 * i))
      }
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      const drifters = (sys as any).drifters as Drifter[]
      for (let i = 0; i < 5; i++) {
        expect(drifters[i].driftingSkill).toBeCloseTo(10 * (i + 1) + 0.02, 4)
      }
    })

    it('tick 差值恰好等于 CHECK_INTERVAL 时执行', () => {
      const em = makeEM()
      ;(sys as any).lastCheck = 2000
      sys.update(0, em as any, 5040) // diff = 3040 === 3040
      expect((sys as any).lastCheck).toBe(5040)
    })

    it('drifters 数组索引从0开始', () => {
      ;(sys as any).drifters.push(makeDrifter(99))
      expect((sys as any).drifters[0].entityId).toBe(99)
    })

    it('cleanup 后剩余漂移工索引紧凑', () => {
      const d1 = makeDrifter(1, 2.0)  // 2+0.02=2.02 <= 4 → 删除
      const d2 = makeDrifter(2, 50.0) // 保留
      const d3 = makeDrifter(3, 1.5)  // 1.5+0.02=1.52 <= 4 → 删除
      const d4 = makeDrifter(4, 60.0) // 保留
      ;(sys as any).drifters.push(d1, d2, d3, d4)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, em as any, 3040)
      const remaining = (sys as any).drifters as Drifter[]
      expect(remaining).toHaveLength(2)
      expect(remaining[0].entityId).toBe(2)
      expect(remaining[1].entityId).toBe(4)
    })

    it('单个漂移工 taperControl 不超过100', () => {
      const d = makeDrifter(1, 30)
      d.taperControl = 100
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 0
      sys.update(0, em as any, 3040)
      expect((sys as any).drifters[0].taperControl).toBe(100)
    })

    it('tick 不足时所有字段不变', () => {
      const d = makeDrifter(1, 50)
      ;(sys as any).drifters.push(d)
      const em = makeEM()
      ;(sys as any).lastCheck = 1000
      sys.update(0, em as any, 2000)  // diff = 1000 < 3040
      expect((sys as any).drifters[0].driftingSkill).toBe(50)
      expect((sys as any).drifters[0].pinAlignment).toBe(25)
      expect((sys as any).drifters[0].taperControl).toBe(35)
    })
  })
})
