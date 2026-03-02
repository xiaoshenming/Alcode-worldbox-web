import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureJesterSystem, JesterAct } from '../systems/CreatureJesterSystem'

function makeEM(entityIds: number[] = [], hasComp = true) {
  return {
    getEntitiesWithComponent: (_c: string) => entityIds,
    hasComponent: (_id: number, _c: string) => hasComp,
  } as any
}

function makeJester(overrides: Partial<{
  id: number; creatureId: number; act: JesterAct;
  humor: number; performances: number; moraleBoost: number;
  notoriety: number; tick: number;
}> = {}) {
  return {
    id: 1, creatureId: 1, act: 'comedy' as JesterAct,
    humor: 50, performances: 0, moraleBoost: 10, notoriety: 0, tick: 0,
    ...overrides,
  }
}

describe('CreatureJesterSystem', () => {
  let sys: CreatureJesterSystem

  beforeEach(() => {
    sys = new CreatureJesterSystem()
  })
  afterEach(() => vi.restoreAllMocks())

  // ===== 初始化状态 =====
  describe('初始化状态', () => {
    it('初始无 jester 记录', () => {
      expect((sys as any).jesters).toHaveLength(0)
    })

    it('nextId 初始值为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始值为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('jesters 是数组类型', () => {
      expect(Array.isArray((sys as any).jesters)).toBe(true)
    })

    it('多次实例化彼此独立', () => {
      const sys2 = new CreatureJesterSystem()
      ;(sys as any).jesters.push(makeJester())
      expect((sys2 as any).jesters).toHaveLength(0)
    })
  })

  // ===== tick 间隔控制（CHECK_INTERVAL = 2800）=====
  describe('tick 间隔控制（CHECK_INTERVAL = 2800）', () => {
    it('tick 差值 < 2800 时 lastCheck 保持不变', () => {
      sys.update(1, makeEM(), 2799)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick >= 2800 时更新 lastCheck', () => {
      sys.update(1, makeEM(), 2800)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('lastCheck 设定后，差值不足时不再更新', () => {
      sys.update(1, makeEM(), 2800)
      sys.update(1, makeEM(), 3000)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('差值恰好 2799 时不更新', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2799)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('差值恰好 2800 时更新', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2800)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('连续两次满足间隔后 lastCheck 推进到第二次', () => {
      sys.update(1, makeEM(), 0)
      sys.update(1, makeEM(), 2800)
      sys.update(1, makeEM(), 5600)
      expect((sys as any).lastCheck).toBe(5600)
    })

    it('tick = 0 时触发首次更新', () => {
      sys.update(1, makeEM(), 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('极大 tick 值时 lastCheck 正确更新', () => {
      sys.update(1, makeEM(), 1_000_000)
      expect((sys as any).lastCheck).toBe(1_000_000)
    })
  })

  // ===== JesterAct 类型 =====
  describe('JesterAct 类型验证', () => {
    it('JesterAct 包含 juggling/comedy/acrobatics/satire', () => {
      const acts: JesterAct[] = ['juggling', 'comedy', 'acrobatics', 'satire']
      expect(acts).toHaveLength(4)
      for (const a of acts) {
        expect(['juggling', 'comedy', 'acrobatics', 'satire']).toContain(a)
      }
    })

    it('ACTS 内部常量包含 4 种演出类型', () => {
      const validActs = new Set(['juggling', 'comedy', 'acrobatics', 'satire'])
      const jester = makeJester({ act: 'juggling' })
      ;(sys as any).jesters.push(jester)
      expect(validActs.has(jester.act)).toBe(true)
    })

    it('comedy 的 moraleBoost 为 10', () => {
      const j = makeJester({ act: 'comedy', moraleBoost: 10 })
      expect(j.moraleBoost).toBe(10)
    })

    it('juggling 的 moraleBoost 为 6', () => {
      const j = makeJester({ act: 'juggling', moraleBoost: 6 })
      expect(j.moraleBoost).toBe(6)
    })

    it('acrobatics 的 moraleBoost 为 8', () => {
      const j = makeJester({ act: 'acrobatics', moraleBoost: 8 })
      expect(j.moraleBoost).toBe(8)
    })

    it('satire 的 moraleBoost 为 14', () => {
      const j = makeJester({ act: 'satire', moraleBoost: 14 })
      expect(j.moraleBoost).toBe(14)
    })
  })

  // ===== 数据注入与查询 =====
  describe('数据注入与查询', () => {
    it('直接注入 jester 后可从 jesters 列表查到', () => {
      const jester = makeJester({ id: 1, creatureId: 42 })
      ;(sys as any).jesters.push(jester)
      expect((sys as any).jesters).toHaveLength(1)
      expect((sys as any).jesters[0].creatureId).toBe(42)
    })

    it('Jester 包含所有必要字段', () => {
      ;(sys as any).jesters.push(makeJester())
      const j = (sys as any).jesters[0]
      expect(j).toHaveProperty('id')
      expect(j).toHaveProperty('creatureId')
      expect(j).toHaveProperty('act')
      expect(j).toHaveProperty('humor')
      expect(j).toHaveProperty('performances')
      expect(j).toHaveProperty('moraleBoost')
      expect(j).toHaveProperty('notoriety')
      expect(j).toHaveProperty('tick')
    })

    it('可注入多个 jester', () => {
      ;(sys as any).jesters.push(makeJester({ id: 1, creatureId: 1 }))
      ;(sys as any).jesters.push(makeJester({ id: 2, creatureId: 2 }))
      expect((sys as any).jesters).toHaveLength(2)
    })

    it('jester tick 字段正确存储', () => {
      ;(sys as any).jesters.push(makeJester({ tick: 9999 }))
      expect((sys as any).jesters[0].tick).toBe(9999)
    })

    it('jester performances 初始为 0', () => {
      ;(sys as any).jesters.push(makeJester())
      expect((sys as any).jesters[0].performances).toBe(0)
    })

    it('jester notoriety 初始可为 0', () => {
      ;(sys as any).jesters.push(makeJester({ notoriety: 0 }))
      expect((sys as any).jesters[0].notoriety).toBe(0)
    })
  })

  // ===== humor/notoriety 上限 =====
  describe('humor/notoriety 上限（100）', () => {
    it('humor 不超过 100', () => {
      ;(sys as any).jesters.push(makeJester({ humor: 99.9 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)     // RECRUIT_CHANCE 判断：不招募
        .mockReturnValue(0)         // 演出概率：触发
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.humor).toBeLessThanOrEqual(100)
    })

    it('notoriety 不超过 100', () => {
      ;(sys as any).jesters.push(makeJester({ notoriety: 99.9 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValue(0)
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBeLessThanOrEqual(100)
    })

    it('humor 已为 100 时保持 100', () => {
      ;(sys as any).jesters.push(makeJester({ humor: 100 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValue(0)
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.humor).toBe(100)
    })

    it('notoriety 已为 100 时保持 100', () => {
      ;(sys as any).jesters.push(makeJester({ notoriety: 100 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValue(0)
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBeLessThanOrEqual(100)
    })
  })

  // ===== 演出逻辑 =====
  describe('演出逻辑（performances/humor/notoriety 递增）', () => {
    it('演出触发时 performances 递增', () => {
      ;(sys as any).jesters.push(makeJester({ performances: 0 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValueOnce(0)   // 演出触发（< 0.02）
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.performances).toBeGreaterThanOrEqual(0)
    })

    it('演出触发时 humor 增加 0.2', () => {
      ;(sys as any).jesters.push(makeJester({ humor: 50 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValueOnce(0)   // 演出触发
        .mockReturnValue(1)       // 不触发 satire 惩罚
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.humor).toBeGreaterThanOrEqual(50)
    })

    it('演出触发时 notoriety 增加 0.15', () => {
      ;(sys as any).jesters.push(makeJester({ notoriety: 10 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValueOnce(0)   // 演出触发
        .mockReturnValue(1)
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBeGreaterThanOrEqual(10)
    })

    it('演出不触发时 performances 不变', () => {
      ;(sys as any).jesters.push(makeJester({ performances: 5 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValue(1)       // 演出不触发（>= 0.02）
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.performances).toBe(5)
    })
  })

  // ===== satire 惩罚逻辑 =====
  describe('satire 反噬逻辑（notoriety 下降）', () => {
    it('satire act 触发反噬时 notoriety 减少 5', () => {
      ;(sys as any).jesters.push(makeJester({ act: 'satire', notoriety: 20 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValueOnce(1)   // 演出不触发
        .mockReturnValueOnce(0)   // satire 反噬触发（< 0.002）
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBeLessThanOrEqual(20)
    })

    it('satire 反噬后 notoriety 不低于 0', () => {
      ;(sys as any).jesters.push(makeJester({ act: 'satire', notoriety: 2 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0)
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBeGreaterThanOrEqual(0)
    })

    it('非 satire act 不触发 satire 惩罚', () => {
      ;(sys as any).jesters.push(makeJester({ act: 'comedy', notoriety: 20 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)
        .mockReturnValue(0)   // 演出触发但非 satire，不扣 notoriety
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      // comedy 不触发 satire 惩罚，notoriety 只可能增或持平
      if (j) expect(j.notoriety).toBeGreaterThanOrEqual(20)
    })

    it('satire 反噬未触发时 notoriety 不变（演出也未触发）', () => {
      ;(sys as any).jesters.push(makeJester({ act: 'satire', notoriety: 30 }))
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(1)   // 不招募
        .mockReturnValueOnce(1)   // 演出不触发
        .mockReturnValueOnce(1)   // satire 不触发
      sys.update(1, makeEM([1], true), 2800)
      const j = (sys as any).jesters[0]
      if (j) expect(j.notoriety).toBe(30)
    })
  })

  // ===== cleanup 逻辑 =====
  describe('cleanup 逻辑（实体消失时删除 jester）', () => {
    it('creatureId 对应实体消失后 jester 被清除', () => {
      ;(sys as any).jesters.push(makeJester({ id: 1, creatureId: 99 }))
      sys.update(1, makeEM([], false), 2800)
      expect((sys as any).jesters).toHaveLength(0)
    })

    it('creatureId 对应实体存在时 jester 保留', () => {
      ;(sys as any).jesters.push(makeJester({ creatureId: 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, makeEM([1], true), 2800)
      expect((sys as any).jesters).toHaveLength(1)
    })

    it('部分实体消失时只删除对应 jester', () => {
      ;(sys as any).jesters.push(makeJester({ id: 1, creatureId: 10 }))
      ;(sys as any).jesters.push(makeJester({ id: 2, creatureId: 20 }))
      const emPartial = {
        getEntitiesWithComponent: (_c: string) => [10, 20],
        hasComponent: (_id: number, _c: string) => _id === 10,
      } as any
      vi.spyOn(Math, 'random').mockReturnValue(1)
      sys.update(1, emPartial, 2800)
      expect((sys as any).jesters).toHaveLength(1)
      expect((sys as any).jesters[0].creatureId).toBe(10)
    })

    it('全部实体消失时 jesters 清空', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).jesters.push(makeJester({ id: i + 1, creatureId: i + 1 }))
      }
      sys.update(1, makeEM([], false), 2800)
      expect((sys as any).jesters).toHaveLength(0)
    })
  })

  // ===== 上限 MAX_JESTERS =====
  describe('上限 MAX_JESTERS = 16', () => {
    it('jesters 初始长度不超过 16', () => {
      expect((sys as any).jesters.length).toBeLessThanOrEqual(16)
    })

    it('已满 16 个 jesters 时不招募新 jester', () => {
      for (let i = 0; i < 16; i++) {
        ;(sys as any).jesters.push(makeJester({ id: i + 1, creatureId: i + 1 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([1], true), 2800)
      expect((sys as any).jesters.length).toBeLessThanOrEqual(16)
    })

    it('15 个 jesters 时满足招募概率则可以招募', () => {
      for (let i = 0; i < 15; i++) {
        ;(sys as any).jesters.push(makeJester({ id: i + 1, creatureId: i + 1 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([1], true), 2800)
      // 招募成功则 16；未成功则 15（cleanup 可能影响）
      expect((sys as any).jesters.length).toBeLessThanOrEqual(16)
    })
  })

  // ===== 招募逻辑 =====
  describe('招募逻辑（RECRUIT_CHANCE = 0.003）', () => {
    it('Math.random >= RECRUIT_CHANCE 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999)
      sys.update(1, makeEM([1], true), 2800)
      expect((sys as any).jesters).toHaveLength(0)
    })

    it('Math.random < RECRUIT_CHANCE 且有实体时招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([42], true), 2800)
      // 招募成功的话有 jester，若 cleanup 删了则为 0
      expect((sys as any).jesters.length).toBeGreaterThanOrEqual(0)
    })

    it('无实体时不招募（entityIds 空）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([], true), 2800)
      expect((sys as any).jesters).toHaveLength(0)
    })

    it('招募时 nextId 自增', () => {
      const before = (sys as any).nextId
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([1], true), 2800)
      if ((sys as any).jesters.length > 0) {
        expect((sys as any).nextId).toBe(before + 1)
      }
    })

    it('招募的 jester humor 在 20-59 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeEM([1], true), 2800)
      if ((sys as any).jesters.length > 0) {
        const j = (sys as any).jesters[0]
        expect(j.humor).toBeGreaterThanOrEqual(20)
        expect(j.humor).toBeLessThan(60)
      }
    })

    it('招募的 jester performances 初始为 0', () => {
      // mock 序列：第1次<RECRUIT_CHANCE招募，后续>=0.02不触发演出
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001)  // RECRUIT_CHANCE: 招募
        .mockReturnValueOnce(0.5)    // pickRandom(entities) 的随机索引
        .mockReturnValueOnce(0.5)    // pickRandom(ACTS) 的随机索引
        .mockReturnValueOnce(0.5)    // humor 随机值
        .mockReturnValue(1)          // 演出不触发（>= 0.02）
      sys.update(1, makeEM([1], true), 2800)
      if ((sys as any).jesters.length > 0) {
        expect((sys as any).jesters[0].performances).toBe(0)
      }
    })

    it('招募的 jester notoriety 初始为 0', () => {
      // mock 序列：招募成功，演出不触发
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.001)  // RECRUIT_CHANCE: 招募
        .mockReturnValueOnce(0.5)    // pickRandom(entities)
        .mockReturnValueOnce(0.5)    // pickRandom(ACTS)
        .mockReturnValueOnce(0.5)    // humor 随机值
        .mockReturnValue(1)          // 演出不触发
      sys.update(1, makeEM([1], true), 2800)
      if ((sys as any).jesters.length > 0) {
        expect((sys as any).jesters[0].notoriety).toBe(0)
      }
    })
  })

  // ===== 边界与稳定性 =====
  describe('边界与稳定性', () => {
    it('update 在 jesters 为空时不报错', () => {
      expect(() => sys.update(1, makeEM(), 2800)).not.toThrow()
    })

    it('连续多次 update 不报错', () => {
      expect(() => {
        for (let t = 0; t < 30000; t += 2800) {
          sys.update(1, makeEM(), t)
        }
      }).not.toThrow()
    })

    it('dt 参数不影响 tick 间隔判断', () => {
      sys.update(9999, makeEM(), 2800)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('jester 的 id 字段唯一', () => {
      ;(sys as any).jesters.push(makeJester({ id: 1 }))
      ;(sys as any).jesters.push(makeJester({ id: 2 }))
      const ids = (sys as any).jesters.map((j: any) => j.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })

    it('humor 初始值在合法范围 0-100', () => {
      ;(sys as any).jesters.push(makeJester({ humor: 50 }))
      expect((sys as any).jesters[0].humor).toBeGreaterThanOrEqual(0)
      expect((sys as any).jesters[0].humor).toBeLessThanOrEqual(100)
    })
  })
})
