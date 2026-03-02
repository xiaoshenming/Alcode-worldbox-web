import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCooperSystem } from '../systems/CreatureCooperSystem'
import type { Cooper } from '../systems/CreatureCooperSystem'

// 常量参考：CHECK_INTERVAL=2590, RECRUIT_CHANCE=0.0016, MAX_COOPERS=11
// 每轮 staveShaping+0.02, sealingSkill+0.015, outputQuality+0.01，上限100
// cleanup: staveShaping<=4 删除

let nextId = 1
function makeSys(): CreatureCooperSystem { return new CreatureCooperSystem() }
function makeCooper(entityId: number, staveShaping = 30): Cooper {
  return { id: nextId++, entityId, staveShaping, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
}

const EM_EMPTY = {} as any

describe('CreatureCooperSystem', () => {
  let sys: CreatureCooperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 构造与初始状态 ──────────────────────────────────────────────────────────

  describe('构造与初始状态', () => {
    it('实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureCooperSystem)
    })

    it('初始无桶匠', () => {
      expect((sys as any).coopers).toHaveLength(0)
    })

    it('初始coopers为空数组', () => {
      expect(Array.isArray((sys as any).coopers)).toBe(true)
    })

    it('初始nextId为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始lastCheck为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('具有update方法', () => {
      expect(typeof sys.update).toBe('function')
    })
  })

  // ── Cooper 数据结构 ─────────────────────────────────────────────────────────

  describe('Cooper 数据结构完整性', () => {
    it('注入后可通过索引查询entityId', () => {
      ;(sys as any).coopers.push(makeCooper(1))
      expect((sys as any).coopers[0].entityId).toBe(1)
    })

    it('多个桶匠全部存在', () => {
      ;(sys as any).coopers.push(makeCooper(1))
      ;(sys as any).coopers.push(makeCooper(2))
      ;(sys as any).coopers.push(makeCooper(3))
      expect((sys as any).coopers).toHaveLength(3)
    })

    it('四个技能字段均可设置', () => {
      const c = makeCooper(10)
      c.staveShaping = 80; c.hoopFitting = 75; c.sealingSkill = 70; c.outputQuality = 65
      ;(sys as any).coopers.push(c)
      const r = (sys as any).coopers[0]
      expect(r.staveShaping).toBe(80)
      expect(r.hoopFitting).toBe(75)
      expect(r.sealingSkill).toBe(70)
      expect(r.outputQuality).toBe(65)
    })

    it('Cooper.id唯一自增', () => {
      const c1 = makeCooper(1)
      const c2 = makeCooper(2)
      expect(c2.id).toBe(c1.id + 1)
    })

    it('Cooper.tick字段可用', () => {
      const c = makeCooper(1)
      c.tick = 9999
      expect(c.tick).toBe(9999)
    })

    it('Cooper字段完整：id, entityId, staveShaping, hoopFitting, sealingSkill, outputQuality, tick', () => {
      const c = makeCooper(5)
      expect('id' in c).toBe(true)
      expect('entityId' in c).toBe(true)
      expect('staveShaping' in c).toBe(true)
      expect('hoopFitting' in c).toBe(true)
      expect('sealingSkill' in c).toBe(true)
      expect('outputQuality' in c).toBe(true)
      expect('tick' in c).toBe(true)
    })
  })

  // ── CHECK_INTERVAL 节流（2590）─────────────────────────────────────────────

  describe('CHECK_INTERVAL 节流（2590）', () => {
    it('tick差=100 < 2590 时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 1100)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差=2589 < 2590 时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 1000 + 2589)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差=2590 >= 2590 时更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      const tick = 1000 + 2590
      sys.update(1, EM_EMPTY, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('tick差=3000 >= 2590 时更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 4000)
      expect((sys as any).lastCheck).toBe(4000)
    })

    it('lastCheck=0时，tick=2590触发更新', () => {
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).lastCheck).toBe(2590)
    })

    it('lastCheck=0时，tick=2589不触发更新', () => {
      sys.update(1, EM_EMPTY, 2589)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续两次update满足间隔，lastCheck更新两次', () => {
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).lastCheck).toBe(2590)
      sys.update(1, EM_EMPTY, 5180)
      expect((sys as any).lastCheck).toBe(5180)
    })

    it('连续两次update第二次不满足间隔，lastCheck保持', () => {
      sys.update(1, EM_EMPTY, 2590)
      sys.update(1, EM_EMPTY, 3000)  // 3000-2590=410 < 2590
      expect((sys as any).lastCheck).toBe(2590)
    })
  })

  // ── staveShaping 增长与上限 ─────────────────────────────────────────────────

  describe('staveShaping 增长与上限', () => {
    it('每次update后staveShaping+0.02', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.02)
    })

    it('staveShaping上限为100，不超过100', () => {
      const c = makeCooper(1, 99.99)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBe(100)
    })

    it('staveShaping恰好100时再update仍为100', () => {
      const c = makeCooper(1, 100)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBe(100)
    })

    it('staveShaping从99.99+0.02=100.01，钳制到100', () => {
      const c = makeCooper(1, 99.99)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBeLessThanOrEqual(100)
    })

    it('多次update后staveShaping累积增长', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5180)
      expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.04)
    })

    it('staveShaping=50.00经过3轮累积到50.06', () => {
      const c = makeCooper(1, 50)
      ;(sys as any).coopers.push(c)
      for (let i = 1; i <= 3; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(1, EM_EMPTY, 2590 * i)
      }
      expect((sys as any).coopers[0].staveShaping).toBeCloseTo(50.06)
    })
  })

  // ── sealingSkill 增长与上限 ─────────────────────────────────────────────────

  describe('sealingSkill 增长与上限', () => {
    it('每次update后sealingSkill+0.015', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].sealingSkill).toBeCloseTo(20.015)
    })

    it('sealingSkill上限为100', () => {
      const c = makeCooper(1, 30)
      c.sealingSkill = 99.99
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].sealingSkill).toBe(100)
    })

    it('sealingSkill恰好100时不超过100', () => {
      const c = makeCooper(1, 30)
      c.sealingSkill = 100
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].sealingSkill).toBe(100)
    })

    it('多次update后sealingSkill累积', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5180)
      expect((sys as any).coopers[0].sealingSkill).toBeCloseTo(20.030)
    })
  })

  // ── outputQuality 增长与上限 ────────────────────────────────────────────────

  describe('outputQuality 增长与上限', () => {
    it('每次update后outputQuality+0.01', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].outputQuality).toBeCloseTo(35.01)
    })

    it('outputQuality上限为100', () => {
      const c = makeCooper(1, 30)
      c.outputQuality = 99.99
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].outputQuality).toBe(100)
    })

    it('outputQuality恰好100时不超过100', () => {
      const c = makeCooper(1, 30)
      c.outputQuality = 100
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].outputQuality).toBe(100)
    })

    it('多次update后outputQuality累积', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5180)
      expect((sys as any).coopers[0].outputQuality).toBeCloseTo(35.02)
    })
  })

  // ── hoopFitting 不被修改 ────────────────────────────────────────────────────

  describe('hoopFitting 字段保持不变', () => {
    it('update后hoopFitting不被改变', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].hoopFitting).toBe(25)
    })

    it('hoopFitting=99，update后仍为99', () => {
      const c = makeCooper(1, 30)
      c.hoopFitting = 99
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].hoopFitting).toBe(99)
    })

    it('hoopFitting=0，update后仍为0', () => {
      const c = makeCooper(1, 30)
      c.hoopFitting = 0
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].hoopFitting).toBe(0)
    })
  })

  // ── cleanup：staveShaping<=4 删除 ──────────────────────────────────────────

  describe('cleanup：staveShaping<=4 时删除', () => {
    it('staveShaping=3.98+0.02=4.00，<=4，删除', () => {
      const c1: Cooper = { id: nextId++, entityId: 1, staveShaping: 3.98, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      const c2: Cooper = { id: nextId++, entityId: 2, staveShaping: 30, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 1)).toBeUndefined()
      expect(coopers.find((c: Cooper) => c.entityId === 2)).toBeDefined()
    })

    it('staveShaping=4.00，update后=4.02，>4，保留', () => {
      const c: Cooper = { id: nextId++, entityId: 1, staveShaping: 4.00, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 1)).toBeDefined()
    })

    it('staveShaping=3.0，update后=3.02，<=4，删除', () => {
      const c: Cooper = { id: nextId++, entityId: 5, staveShaping: 3.0, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 5)).toBeUndefined()
    })

    it('staveShaping=4.1，update后=4.12，>4，保留', () => {
      const c: Cooper = { id: nextId++, entityId: 7, staveShaping: 4.1, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 7)).toBeDefined()
    })

    it('staveShaping=0，update后=0.02，<=4，删除', () => {
      const c: Cooper = { id: nextId++, entityId: 9, staveShaping: 0, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 9)).toBeUndefined()
    })

    it('多个低技能桶匠同批删除，高技能保留', () => {
      const low1: Cooper = { id: nextId++, entityId: 1, staveShaping: 1, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      const low2: Cooper = { id: nextId++, entityId: 2, staveShaping: 2, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      const high: Cooper = { id: nextId++, entityId: 3, staveShaping: 50, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(low1, low2, high)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 1)).toBeUndefined()
      expect(coopers.find((c: Cooper) => c.entityId === 2)).toBeUndefined()
      expect(coopers.find((c: Cooper) => c.entityId === 3)).toBeDefined()
    })

    it('所有桶匠staveShaping<=4，update后全部删除', () => {
      const c1: Cooper = { id: nextId++, entityId: 1, staveShaping: 1, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      const c2: Cooper = { id: nextId++, entityId: 2, staveShaping: 2, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
      ;(sys as any).coopers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers).toHaveLength(0)
    })

    it('cleanup从数组末尾向前遍历，顺序删除不出界', () => {
      for (let i = 0; i < 5; i++) {
        const c: Cooper = { id: nextId++, entityId: i, staveShaping: i === 2 ? 1 : 50, hoopFitting: 25, sealingSkill: 20, outputQuality: 35, tick: 0 }
        ;(sys as any).coopers.push(c)
      }
      expect(() => sys.update(1, EM_EMPTY, 2590)).not.toThrow()
      const coopers = (sys as any).coopers as Cooper[]
      expect(coopers.find((c: Cooper) => c.entityId === 2)).toBeUndefined()
    })
  })

  // ── 招募逻辑（RECRUIT_CHANCE 概率）─────────────────────────────────────────

  describe('招募逻辑', () => {
    it('Math.random() < RECRUIT_CHANCE且未满11时招募新桶匠', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 0.001 < 0.0016
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers.length).toBeGreaterThanOrEqual(1)
    })

    it('Math.random() >= RECRUIT_CHANCE时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)  // 0.999 > 0.0016
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers).toHaveLength(0)
    })

    it('已有11个桶匠时不再招募', () => {
      for (let i = 0; i < 11; i++) {
        ;(sys as any).coopers.push(makeCooper(i, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 触发招募
      sys.update(1, EM_EMPTY, 2590)
      // 11个已满，不再增加（cleanup可能删除低技能但50>4不删）
      expect((sys as any).coopers.length).toBeLessThanOrEqual(11)
    })

    it('招募的新桶匠id自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, EM_EMPTY, 2590)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5180)
      const coopers = (sys as any).coopers as Cooper[]
      if (coopers.length >= 2) {
        expect(coopers[1].id).toBeGreaterThan(coopers[0].id)
      }
    })

    it('新招募桶匠的staveShaping在[10,35)范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      if (coopers.length > 0) {
        const s = coopers[coopers.length - 1].staveShaping
        // 由于mock random=0.001，staveShaping=10+0.001*25=10.025
        expect(s).toBeGreaterThanOrEqual(10)
        expect(s).toBeLessThanOrEqual(35)
      }
    })
  })

  // ── 多桶匠并发处理 ──────────────────────────────────────────────────────────

  describe('多桶匠并发处理', () => {
    it('多个桶匠同时增长技能', () => {
      const c1 = makeCooper(1, 30)
      const c2 = makeCooper(2, 50)
      ;(sys as any).coopers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.02)
      expect((sys as any).coopers[1].staveShaping).toBeCloseTo(50.02)
    })

    it('10个桶匠全部正常增长', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).coopers.push(makeCooper(i, 20 + i * 5))
      }
      sys.update(1, EM_EMPTY, 2590)
      const coopers = (sys as any).coopers as Cooper[]
      for (let i = 0; i < coopers.length; i++) {
        expect(coopers[i].staveShaping).toBeGreaterThan(20 + i * 5)
      }
    })

    it('空桶匠列表时update不崩溃', () => {
      expect(() => sys.update(1, EM_EMPTY, 2590)).not.toThrow()
    })

    it('多次update后桶匠技能持续增长', () => {
      const c = makeCooper(1, 30)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5180)
      expect((sys as any).coopers[0].staveShaping).toBeCloseTo(30.04)
    })
  })

  // ── 独立实例隔离 ─────────────────────────────────────────────────────────────

  describe('独立实例隔离', () => {
    it('两个系统实例状态互相独立', () => {
      const sys2 = makeSys()
      ;(sys as any).coopers.push(makeCooper(1, 50))
      expect((sys2 as any).coopers).toHaveLength(0)
    })

    it('实例A更新不影响实例B的lastCheck', () => {
      const sys2 = makeSys()
      sys.update(1, EM_EMPTY, 2590)
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })

  // ── 边界情况 ────────────────────────────────────────────────────────────────

  describe('边界与特殊情况', () => {
    it('dt参数不影响节流逻辑', () => {
      sys.update(9999, EM_EMPTY, 2590)
      expect((sys as any).lastCheck).toBe(2590)
    })

    it('tick=0时不触发（0-0=0 < 2590）', () => {
      sys.update(1, EM_EMPTY, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=2590恰好触发，lastCheck=2590', () => {
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).lastCheck).toBe(2590)
    })

    it('staveShaping极大值100+0.02钳制到100', () => {
      const c = makeCooper(1, 100)
      ;(sys as any).coopers.push(c)
      sys.update(1, EM_EMPTY, 2590)
      expect((sys as any).coopers[0].staveShaping).toBe(100)
    })

    it('连续50轮update不崩溃', () => {
      const c = makeCooper(1, 50)
      ;(sys as any).coopers.push(c)
      for (let i = 1; i <= 50; i++) {
        ;(sys as any).lastCheck = 0
        expect(() => sys.update(1, EM_EMPTY, 2590 * i)).not.toThrow()
      }
    })
  })
})
