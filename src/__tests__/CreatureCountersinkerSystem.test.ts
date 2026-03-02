import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCountersinkerSystem } from '../systems/CreatureCountersinkerSystem'
import type { Countersinker } from '../systems/CreatureCountersinkerSystem'

// 常量参考：CHECK_INTERVAL=2990, RECRUIT_CHANCE=0.0015, MAX_COUNTERSINKERS=10
// 每轮 countersinkingSkill+0.02, angleControl+0.015, flushAlignment+0.01，上限100
// cleanup: countersinkingSkill<=4 删除, depthPrecision不被修改

let nextId = 1
function makeSys(): CreatureCountersinkerSystem { return new CreatureCountersinkerSystem() }
function makeCountersinker(entityId: number, countersinkingSkill = 30): Countersinker {
  return { id: nextId++, entityId, countersinkingSkill, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
}

const EM_EMPTY = {} as any

describe('CreatureCountersinkerSystem', () => {
  let sys: CreatureCountersinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 构造与初始状态 ──────────────────────────────────────────────────────────

  describe('构造与初始状态', () => {
    it('实例化成功', () => {
      expect(sys).toBeInstanceOf(CreatureCountersinkerSystem)
    })

    it('初始无沉孔工', () => {
      expect((sys as any).countersinkers).toHaveLength(0)
    })

    it('初始countersinkers为空数组', () => {
      expect(Array.isArray((sys as any).countersinkers)).toBe(true)
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

  // ── Countersinker 数据结构 ──────────────────────────────────────────────────

  describe('Countersinker 数据结构完整性', () => {
    it('注入后可通过索引查询entityId', () => {
      ;(sys as any).countersinkers.push(makeCountersinker(1))
      expect((sys as any).countersinkers[0].entityId).toBe(1)
    })

    it('多个沉孔工全部存在', () => {
      ;(sys as any).countersinkers.push(makeCountersinker(1))
      ;(sys as any).countersinkers.push(makeCountersinker(2))
      ;(sys as any).countersinkers.push(makeCountersinker(3))
      expect((sys as any).countersinkers).toHaveLength(3)
    })

    it('四个技能字段均可设置', () => {
      const c = makeCountersinker(10)
      c.countersinkingSkill = 80; c.angleControl = 75; c.depthPrecision = 70; c.flushAlignment = 65
      ;(sys as any).countersinkers.push(c)
      const r = (sys as any).countersinkers[0]
      expect(r.countersinkingSkill).toBe(80)
      expect(r.angleControl).toBe(75)
      expect(r.depthPrecision).toBe(70)
      expect(r.flushAlignment).toBe(65)
    })

    it('Countersinker.id唯一自增', () => {
      const c1 = makeCountersinker(1)
      const c2 = makeCountersinker(2)
      expect(c2.id).toBe(c1.id + 1)
    })

    it('Countersinker.tick字段可用', () => {
      const c = makeCountersinker(1)
      c.tick = 8888
      expect(c.tick).toBe(8888)
    })

    it('Countersinker字段完整：id, entityId, countersinkingSkill, angleControl, depthPrecision, flushAlignment, tick', () => {
      const c = makeCountersinker(5)
      expect('id' in c).toBe(true)
      expect('entityId' in c).toBe(true)
      expect('countersinkingSkill' in c).toBe(true)
      expect('angleControl' in c).toBe(true)
      expect('depthPrecision' in c).toBe(true)
      expect('flushAlignment' in c).toBe(true)
      expect('tick' in c).toBe(true)
    })
  })

  // ── CHECK_INTERVAL 节流（2990）─────────────────────────────────────────────

  describe('CHECK_INTERVAL 节流（2990）', () => {
    it('tick差=100 < 2990 时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 1100)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差=2989 < 2990 时不更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 1000 + 2989)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('tick差=2990 >= 2990 时更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      const tick = 1000 + 2990
      sys.update(1, EM_EMPTY, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('tick差=3000 >= 2990 时更新lastCheck', () => {
      ;(sys as any).lastCheck = 1000
      sys.update(1, EM_EMPTY, 4000)
      expect((sys as any).lastCheck).toBe(4000)
    })

    it('lastCheck=0时，tick=2990触发更新', () => {
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).lastCheck).toBe(2990)
    })

    it('lastCheck=0时，tick=2989不触发更新', () => {
      sys.update(1, EM_EMPTY, 2989)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('连续两次update满足间隔，lastCheck更新两次', () => {
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).lastCheck).toBe(2990)
      sys.update(1, EM_EMPTY, 5980)
      expect((sys as any).lastCheck).toBe(5980)
    })

    it('连续两次update第二次不满足间隔，lastCheck保持', () => {
      sys.update(1, EM_EMPTY, 2990)
      sys.update(1, EM_EMPTY, 3500)  // 3500-2990=510 < 2990
      expect((sys as any).lastCheck).toBe(2990)
    })

    it('update传入dt参数不影响节流逻辑', () => {
      sys.update(9999, EM_EMPTY, 2990)
      expect((sys as any).lastCheck).toBe(2990)
    })
  })

  // ── countersinkingSkill 增长与上限 ─────────────────────────────────────────

  describe('countersinkingSkill 增长与上限', () => {
    it('每次update后countersinkingSkill+0.02', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.02)
    })

    it('countersinkingSkill上限为100，不超过100', () => {
      const c = makeCountersinker(1, 99.99)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBe(100)
    })

    it('countersinkingSkill恰好100时再update仍为100', () => {
      const c = makeCountersinker(1, 100)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBe(100)
    })

    it('多次update后countersinkingSkill累积增长', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5980)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.04)
    })

    it('countersinkingSkill从50经过5轮累积到50.10', () => {
      const c = makeCountersinker(1, 50)
      ;(sys as any).countersinkers.push(c)
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(1, EM_EMPTY, 2990 * i)
      }
      expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(50.10)
    })
  })

  // ── angleControl 增长与上限 ─────────────────────────────────────────────────

  describe('angleControl 增长与上限', () => {
    it('每次update后angleControl+0.015', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].angleControl).toBeCloseTo(25.015)
    })

    it('angleControl上限为100', () => {
      const c = makeCountersinker(1, 30)
      c.angleControl = 99.99
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].angleControl).toBe(100)
    })

    it('angleControl恰好100时不超过100', () => {
      const c = makeCountersinker(1, 30)
      c.angleControl = 100
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].angleControl).toBe(100)
    })

    it('多次update后angleControl累积', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5980)
      expect((sys as any).countersinkers[0].angleControl).toBeCloseTo(25.030)
    })

    it('angleControl从0开始，update后=0.015', () => {
      const c = makeCountersinker(1, 30)
      c.angleControl = 0
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].angleControl).toBeCloseTo(0.015)
    })
  })

  // ── flushAlignment 增长与上限 ──────────────────────────────────────────────

  describe('flushAlignment 增长与上限', () => {
    it('每次update后flushAlignment+0.01', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].flushAlignment).toBeCloseTo(35.01)
    })

    it('flushAlignment上限为100', () => {
      const c = makeCountersinker(1, 30)
      c.flushAlignment = 99.99
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].flushAlignment).toBe(100)
    })

    it('flushAlignment恰好100时不超过100', () => {
      const c = makeCountersinker(1, 30)
      c.flushAlignment = 100
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].flushAlignment).toBe(100)
    })

    it('多次update后flushAlignment累积', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5980)
      expect((sys as any).countersinkers[0].flushAlignment).toBeCloseTo(35.02)
    })
  })

  // ── depthPrecision 不被修改 ─────────────────────────────────────────────────

  describe('depthPrecision 字段保持不变', () => {
    it('update后depthPrecision不被改变', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].depthPrecision).toBe(20)
    })

    it('depthPrecision=99，update后仍为99', () => {
      const c = makeCountersinker(1, 30)
      c.depthPrecision = 99
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].depthPrecision).toBe(99)
    })

    it('depthPrecision=0，update后仍为0', () => {
      const c = makeCountersinker(1, 30)
      c.depthPrecision = 0
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].depthPrecision).toBe(0)
    })

    it('多次update后depthPrecision始终不变', () => {
      const c = makeCountersinker(1, 30)
      c.depthPrecision = 42
      ;(sys as any).countersinkers.push(c)
      for (let i = 1; i <= 3; i++) {
        ;(sys as any).lastCheck = 0
        sys.update(1, EM_EMPTY, 2990 * i)
      }
      expect((sys as any).countersinkers[0].depthPrecision).toBe(42)
    })
  })

  // ── cleanup：countersinkingSkill<=4 删除 ───────────────────────────────────

  describe('cleanup：countersinkingSkill<=4 时删除', () => {
    it('countersinkingSkill=3.98+0.02=4.00，<=4，删除', () => {
      const c1: Countersinker = { id: nextId++, entityId: 1, countersinkingSkill: 3.98, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      const c2: Countersinker = { id: nextId++, entityId: 2, countersinkingSkill: 30, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 1)).toBeUndefined()
      expect(list.find((c: Countersinker) => c.entityId === 2)).toBeDefined()
    })

    it('countersinkingSkill=4.00+0.02=4.02，>4，保留', () => {
      const c: Countersinker = { id: nextId++, entityId: 1, countersinkingSkill: 4.00, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 1)).toBeDefined()
    })

    it('countersinkingSkill=3.0+0.02=3.02，<=4，删除', () => {
      const c: Countersinker = { id: nextId++, entityId: 5, countersinkingSkill: 3.0, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 5)).toBeUndefined()
    })

    it('countersinkingSkill=4.1+0.02=4.12，>4，保留', () => {
      const c: Countersinker = { id: nextId++, entityId: 7, countersinkingSkill: 4.1, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 7)).toBeDefined()
    })

    it('countersinkingSkill=0+0.02=0.02，<=4，删除', () => {
      const c: Countersinker = { id: nextId++, entityId: 9, countersinkingSkill: 0, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 9)).toBeUndefined()
    })

    it('多个低技能沉孔工同批删除，高技能保留', () => {
      const low1: Countersinker = { id: nextId++, entityId: 1, countersinkingSkill: 1, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      const low2: Countersinker = { id: nextId++, entityId: 2, countersinkingSkill: 2, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      const high: Countersinker = { id: nextId++, entityId: 3, countersinkingSkill: 50, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(low1, low2, high)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 1)).toBeUndefined()
      expect(list.find((c: Countersinker) => c.entityId === 2)).toBeUndefined()
      expect(list.find((c: Countersinker) => c.entityId === 3)).toBeDefined()
    })

    it('所有沉孔工countersinkingSkill<=4，update后全部删除', () => {
      const c1: Countersinker = { id: nextId++, entityId: 1, countersinkingSkill: 1, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      const c2: Countersinker = { id: nextId++, entityId: 2, countersinkingSkill: 2, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers).toHaveLength(0)
    })

    it('cleanup从数组末尾向前遍历，删除中间元素不出界', () => {
      for (let i = 0; i < 5; i++) {
        const c: Countersinker = { id: nextId++, entityId: i, countersinkingSkill: i === 2 ? 1 : 50, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
        ;(sys as any).countersinkers.push(c)
      }
      expect(() => sys.update(1, EM_EMPTY, 2990)).not.toThrow()
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 2)).toBeUndefined()
    })

    it('countersinkingSkill=4.00（恰好边界），update后=4.02，>4，保留', () => {
      const c: Countersinker = { id: nextId++, entityId: 11, countersinkingSkill: 4.00, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      const found = list.find((c: Countersinker) => c.entityId === 11)
      expect(found).toBeDefined()
      if (found) expect(found.countersinkingSkill).toBeCloseTo(4.02)
    })
  })

  // ── 招募逻辑（RECRUIT_CHANCE 概率）─────────────────────────────────────────

  describe('招募逻辑', () => {
    it('Math.random() < RECRUIT_CHANCE且未满10时招募新沉孔工', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 0.001 < 0.0015
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers.length).toBeGreaterThanOrEqual(1)
    })

    it('Math.random() >= RECRUIT_CHANCE时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)  // 0.999 > 0.0015
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers).toHaveLength(0)
    })

    it('已有10个沉孔工时不再招募', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).countersinkers.push(makeCountersinker(i, 50))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers.length).toBeLessThanOrEqual(10)
    })

    it('招募的新沉孔工id自增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, EM_EMPTY, 2990)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5980)
      const list = (sys as any).countersinkers as Countersinker[]
      if (list.length >= 2) {
        expect(list[1].id).toBeGreaterThan(list[0].id)
      }
    })

    it('新招募沉孔工的countersinkingSkill在[10,35)范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      if (list.length > 0) {
        const s = list[list.length - 1].countersinkingSkill
        expect(s).toBeGreaterThanOrEqual(10)
        expect(s).toBeLessThanOrEqual(35)
      }
    })

    it('RECRUIT_CHANCE=0.0015时，random=0.0015刚好不触发（>而非>=）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0015)  // 0.0015 < 0.0015 为false
      sys.update(1, EM_EMPTY, 2990)
      // 实际取决于源码用的是 < 还是 <=
      // 源码: Math.random() < RECRUIT_CHANCE → 0.0015 < 0.0015 = false → 不招募
      expect((sys as any).countersinkers).toHaveLength(0)
    })
  })

  // ── 多沉孔工并发处理 ────────────────────────────────────────────────────────

  describe('多沉孔工并发处理', () => {
    it('多个沉孔工同时增长技能', () => {
      const c1 = makeCountersinker(1, 30)
      const c2 = makeCountersinker(2, 50)
      ;(sys as any).countersinkers.push(c1, c2)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.02)
      expect((sys as any).countersinkers[1].countersinkingSkill).toBeCloseTo(50.02)
    })

    it('10个沉孔工全部正常增长', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).countersinkers.push(makeCountersinker(i, 20 + i * 5))
      }
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      for (let i = 0; i < list.length; i++) {
        expect(list[i].countersinkingSkill).toBeGreaterThan(20 + i * 5)
      }
    })

    it('空列表时update不崩溃', () => {
      expect(() => sys.update(1, EM_EMPTY, 2990)).not.toThrow()
    })

    it('多次update后技能持续增长', () => {
      const c = makeCountersinker(1, 30)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      ;(sys as any).lastCheck = 0
      sys.update(1, EM_EMPTY, 5980)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBeCloseTo(30.04)
    })

    it('混合高低技能，高技能保留低技能删除', () => {
      const low: Countersinker = { id: nextId++, entityId: 100, countersinkingSkill: 2, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      const high: Countersinker = { id: nextId++, entityId: 200, countersinkingSkill: 80, angleControl: 25, depthPrecision: 20, flushAlignment: 35, tick: 0 }
      ;(sys as any).countersinkers.push(low, high)
      sys.update(1, EM_EMPTY, 2990)
      const list = (sys as any).countersinkers as Countersinker[]
      expect(list.find((c: Countersinker) => c.entityId === 100)).toBeUndefined()
      expect(list.find((c: Countersinker) => c.entityId === 200)).toBeDefined()
    })
  })

  // ── 独立实例隔离 ─────────────────────────────────────────────────────────────

  describe('独立实例隔离', () => {
    it('两个系统实例状态互相独立', () => {
      const sys2 = makeSys()
      ;(sys as any).countersinkers.push(makeCountersinker(1, 50))
      expect((sys2 as any).countersinkers).toHaveLength(0)
    })

    it('实例A更新不影响实例B的lastCheck', () => {
      const sys2 = makeSys()
      sys.update(1, EM_EMPTY, 2990)
      expect((sys2 as any).lastCheck).toBe(0)
    })
  })

  // ── 边界与特殊情况 ──────────────────────────────────────────────────────────

  describe('边界与特殊情况', () => {
    it('tick=0时不触发（0-0=0 < 2990）', () => {
      sys.update(1, EM_EMPTY, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=2990恰好触发，lastCheck=2990', () => {
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).lastCheck).toBe(2990)
    })

    it('countersinkingSkill极大值100+0.02钳制到100', () => {
      const c = makeCountersinker(1, 100)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      expect((sys as any).countersinkers[0].countersinkingSkill).toBe(100)
    })

    it('连续50轮update不崩溃', () => {
      const c = makeCountersinker(1, 50)
      ;(sys as any).countersinkers.push(c)
      for (let i = 1; i <= 50; i++) {
        ;(sys as any).lastCheck = 0
        expect(() => sys.update(1, EM_EMPTY, 2990 * i)).not.toThrow()
      }
    })

    it('三个技能字段增长速率不同（stave>angle>flush）', () => {
      const c = makeCountersinker(1, 50)
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const updated = (sys as any).countersinkers[0]
      const staveDelta = updated.countersinkingSkill - 50
      const angleDelta = updated.angleControl - 25
      const flushDelta = updated.flushAlignment - 35
      expect(staveDelta).toBeCloseTo(0.02)
      expect(angleDelta).toBeCloseTo(0.015)
      expect(flushDelta).toBeCloseTo(0.01)
      expect(staveDelta).toBeGreaterThan(angleDelta)
      expect(angleDelta).toBeGreaterThan(flushDelta)
    })

    it('单次update后技能增长量精确符合预期', () => {
      const c = makeCountersinker(1, 50)
      c.angleControl = 60
      c.flushAlignment = 70
      ;(sys as any).countersinkers.push(c)
      sys.update(1, EM_EMPTY, 2990)
      const updated = (sys as any).countersinkers[0]
      expect(updated.countersinkingSkill).toBeCloseTo(50.02)
      expect(updated.angleControl).toBeCloseTo(60.015)
      expect(updated.flushAlignment).toBeCloseTo(70.01)
      expect(updated.depthPrecision).toBe(20)  // 不变
    })
  })
})
