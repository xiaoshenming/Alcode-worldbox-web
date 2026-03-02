import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHobbySystem } from '../systems/CreatureHobbySystem'
import type { CreatureHobby } from '../systems/CreatureHobbySystem'

// CHECK_INTERVAL=600, PRACTICE_INTERVAL=400, SKILL_GAIN=2, MAX_SKILL=100, HOBBY_RANGE=10, MAX_HOBBIES=200

function makeSys() { return new CreatureHobbySystem() }

function makeHobby(entityId: number, hobby = 'fishing' as any, overrides: Partial<CreatureHobby> = {}): CreatureHobby {
  return { entityId, hobby, skill: 0, enjoyment: 10, lastPracticed: 0, socialPartner: null, ...overrides }
}

describe('CreatureHobbySystem', () => {
  let sys: CreatureHobbySystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ─────────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始化成功', () => { expect(sys).toBeInstanceOf(CreatureHobbySystem) })
    it('初始hobbies为空', () => { expect(sys.getHobbies().size).toBe(0) })
    it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
    it('初始 lastPractice 为 0', () => { expect((sys as any).lastPractice).toBe(0) })
    it('getHobbies返回Map实例', () => { expect(sys.getHobbies()).toBeInstanceOf(Map) })
    it('getHobbies 返回的是内部同一 Map 引用', () => {
      const m1 = sys.getHobbies()
      const m2 = sys.getHobbies()
      expect(m1).toBe(m2)
    })
  })

  // ── getHobbies 基本���作 ───────────────────────────────────────────────────────
  describe('getHobbies 基本操作', () => {
    it('手动插入后 getHobbies 反映变化', () => {
      sys.getHobbies().set(1, makeHobby(1))
      expect(sys.getHobbies().size).toBe(1)
    })

    it('手动插入多个 hobby 后 size 正确', () => {
      sys.getHobbies().set(1, makeHobby(1, 'fishing'))
      sys.getHobbies().set(2, makeHobby(2, 'painting'))
      sys.getHobbies().set(3, makeHobby(3, 'gardening'))
      expect(sys.getHobbies().size).toBe(3)
    })

    it('getHobbies 可用 get 获取已插入的 hobby', () => {
      const h = makeHobby(5, 'stargazing')
      sys.getHobbies().set(5, h)
      expect(sys.getHobbies().get(5)).toBe(h)
    })

    it('getHobbies 的 has 方法正确反映存在性', () => {
      sys.getHobbies().set(7, makeHobby(7))
      expect(sys.getHobbies().has(7)).toBe(true)
      expect(sys.getHobbies().has(99)).toBe(false)
    })
  })

  // ── practiceHobbies: skill 递增 ──────────────────────────────────────────────
  describe('practiceHobbies: skill 递增', () => {
    it('skill从0增加SKILL_GAIN(2)', () => {
      const em = {
        getComponent: (_id: number, type: string) => type === 'creature' ? { type: 'creature' } : null,
      } as any
      const hobby = makeHobby(1)
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.skill).toBe(2)
    })

    it('skill不超过MAX_SKILL(100)', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      hobby.skill = 99
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.skill).toBe(100)
    })

    it('skill=MAX_SKILL时不再增加', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      hobby.skill = 100
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.skill).toBe(100)
    })

    it('skill=98 增加后精确为 100（不溢出）', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      hobby.skill = 98
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.skill).toBe(100)
    })

    it('多个实体 skill 独立增长', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const h1 = makeHobby(1, 'fishing', { skill: 10 })
      const h2 = makeHobby(2, 'painting', { skill: 50 })
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      expect(h1.skill).toBe(12)
      expect(h2.skill).toBe(52)
    })

    it('skill 从 0 连续练习 5 次后为 10', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      sys.getHobbies().set(1, hobby)
      for (let i = 0; i < 5; i++) {
        ;(sys as any).practiceHobbies(em, i * 100)
      }
      expect(hobby.skill).toBe(10)
    })
  })

  // ── practiceHobbies: lastPracticed 更新 ──────────────────────────────────────
  describe('practiceHobbies: lastPracticed 更新', () => {
    it('lastPracticed更新为当前tick', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      hobby.lastPracticed = 0
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 500)
      expect(hobby.lastPracticed).toBe(500)
    })

    it('多次 practiceHobbies 后 lastPracticed 跟随最新 tick', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const hobby = makeHobby(1)
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 200)
      expect(hobby.lastPracticed).toBe(200)
      ;(sys as any).practiceHobbies(em, 700)
      expect(hobby.lastPracticed).toBe(700)
    })

    it('多个实体的 lastPracticed 均更新', () => {
      const em = { getComponent: () => ({ type: 'creature' }) } as any
      const h1 = makeHobby(1)
      const h2 = makeHobby(2)
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 999)
      expect(h1.lastPracticed).toBe(999)
      expect(h2.lastPracticed).toBe(999)
    })
  })

  // ── practiceHobbies: 无效实体删除 ────────────────────────────────────────────
  describe('practiceHobbies: 无效实体删除', () => {
    it('无creature组件时删除hobby', () => {
      const em = { getComponent: () => undefined } as any
      sys.getHobbies().set(1, makeHobby(1))
      ;(sys as any).practiceHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(0)
    })

    it('getComponent返回null时删除hobby', () => {
      const em = { getComponent: () => null } as any
      sys.getHobbies().set(1, makeHobby(1))
      ;(sys as any).practiceHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(0)
    })

    it('混合：有/无creature组件时只保留有效实体', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type !== 'creature') return null
          return id === 1 ? { type: 'creature' } : null
        }
      } as any
      sys.getHobbies().set(1, makeHobby(1))
      sys.getHobbies().set(2, makeHobby(2))
      ;(sys as any).practiceHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(1)
      expect(sys.getHobbies().has(1)).toBe(true)
    })

    it('多个无效实体全部删除', () => {
      const em = { getComponent: () => undefined } as any
      sys.getHobbies().set(1, makeHobby(1))
      sys.getHobbies().set(2, makeHobby(2))
      sys.getHobbies().set(3, makeHobby(3))
      ;(sys as any).practiceHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(0)
    })
  })

  // ── practiceHobbies: socialPartner 逻辑 ──────────────────────────────────────
  describe('practiceHobbies: socialPartner 与 enjoyment', () => {
    it('无 position 组件时 socialPartner 为 null', () => {
      const em = {
        getComponent: (_id: number, type: string) => type === 'creature' ? { type: 'creature' } : null,
      } as any
      const hobby = makeHobby(1)
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.socialPartner).toBeNull()
    })

    it('有相同 hobby 且在范围内时设置 socialPartner', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type === 'creature') return { type: 'creature' }
          if (type === 'position') return { x: id === 1 ? 0 : 5, y: 0 }
          return null
        }
      } as any
      const h1 = makeHobby(1, 'fishing')
      const h2 = makeHobby(2, 'fishing')
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      // 距离 5 <= HOBBY_RANGE(10)，应有 socialPartner
      expect(h1.socialPartner).toBe(2)
    })

    it('不同 hobby 时不设置 socialPartner', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type === 'creature') return { type: 'creature' }
          if (type === 'position') return { x: 0, y: 0 }
          return null
        }
      } as any
      const h1 = makeHobby(1, 'fishing')
      const h2 = makeHobby(2, 'painting')
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      expect(h1.socialPartner).toBeNull()
    })

    it('超出 HOBBY_RANGE(10) 时不设置 socialPartner', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type === 'creature') return { type: 'creature' }
          if (type === 'position') return { x: id === 1 ? 0 : 15, y: 0 }
          return null
        }
      } as any
      const h1 = makeHobby(1, 'fishing')
      const h2 = makeHobby(2, 'fishing')
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      expect(h1.socialPartner).toBeNull()
    })

    it('发现 socialPartner 时 enjoyment 增加 1', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type === 'creature') return { type: 'creature' }
          if (type === 'position') return { x: id === 1 ? 0 : 5, y: 0 }
          return null
        }
      } as any
      const h1 = makeHobby(1, 'fishing', { enjoyment: 10 })
      const h2 = makeHobby(2, 'fishing')
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      expect(h1.enjoyment).toBe(11)
    })

    it('enjoyment 不超过 25（上限夹紧）', () => {
      const em = {
        getComponent: (id: number, type: string) => {
          if (type === 'creature') return { type: 'creature' }
          if (type === 'position') return { x: id === 1 ? 0 : 3, y: 0 }
          return null
        }
      } as any
      const h1 = makeHobby(1, 'fishing', { enjoyment: 25 })
      const h2 = makeHobby(2, 'fishing')
      sys.getHobbies().set(1, h1)
      sys.getHobbies().set(2, h2)
      ;(sys as any).practiceHobbies(em, 100)
      expect(h1.enjoyment).toBeLessThanOrEqual(25)
    })

    it('每次 practiceHobbies 前 socialPartner 重置为 null', () => {
      const em = {
        getComponent: (_id: number, type: string) => type === 'creature' ? { type: 'creature' } : null,
      } as any
      const hobby = makeHobby(1, 'fishing', { socialPartner: 999 })
      sys.getHobbies().set(1, hobby)
      ;(sys as any).practiceHobbies(em, 100)
      expect(hobby.socialPartner).toBeNull()
    })
  })

  // ── pickHobby 权重分布 ────────────────────────────────────────────────────────
  describe('pickHobby 权重分布', () => {
    it('pickHobby返回有效的HobbyType', () => {
      const validTypes = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
      for (let i = 0; i < 20; i++) {
        const picked = (sys as any).pickHobby()
        expect(validTypes).toContain(picked)
      }
    })

    it('Math.random=0 时 pickHobby 返回 fishing（最先扣减）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const picked = (sys as any).pickHobby()
      expect(picked).toBe('fishing')
    })

    it('pickHobby 不会返回 undefined', () => {
      for (let i = 0; i < 50; i++) {
        const picked = (sys as any).pickHobby()
        expect(picked).toBeDefined()
      }
    })

    it('Math.random 极大值（接近1）时 pickHobby 返回 crafting（最后被扣减完）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999999)
      const picked = (sys as any).pickHobby()
      // 总权重=100，r≈99.999；逐步扣减: fishing(20)→painting(15)→stargazing(15)→gardening(20)→storytelling(15)→crafting(15)
      // 扣完 crafting 后 r≈-0.001<0，返回 crafting
      expect(picked).toBe('crafting')
    })

    it('pickHobby 多次调用返回值都在有效集合中', () => {
      const validTypes = new Set(['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting'])
      for (let i = 0; i < 100; i++) {
        expect(validTypes.has((sys as any).pickHobby())).toBe(true)
      }
    })
  })

  // ── CHECK_INTERVAL 节流（600）────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流（600）', () => {
    it('tick未达到CHECK_INTERVAL(600)时不assignHobbies', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 599)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick达到CHECK_INTERVAL(600)时更新lastCheck', () => {
      const em = { getEntitiesWithComponents: () => [] as number[], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 0
      sys.update(1, em, 600)
      expect((sys as any).lastCheck).toBe(600)
    })

    it('tick=599 时 lastCheck 保持为 0', () => {
      const em = { getEntitiesWithComponents: () => [] } as any
      ;(sys as any).lastCheck = 0
      sys.update(0, em, 599)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=600 时 lastCheck 变为 600', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 0
      sys.update(0, em, 600)
      expect((sys as any).lastCheck).toBe(600)
    })

    it('lastCheck=600 时 tick=1199 不触发（差=599）', () => {
      const em = { getEntitiesWithComponents: () => [] } as any
      ;(sys as any).lastCheck = 600
      sys.update(0, em, 1199)
      expect((sys as any).lastCheck).toBe(600)
    })

    it('lastCheck=600 时 tick=1200 触发（差=600）', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 600
      sys.update(0, em, 1200)
      expect((sys as any).lastCheck).toBe(1200)
    })
  })

  // ── PRACTICE_INTERVAL 节流（400）─────────────────────────────────────────────
  describe('PRACTICE_INTERVAL 节流（400）', () => {
    it('tick未达到PRACTICE_INTERVAL(400)时不practiceHobbies', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastPractice = 0
      ;(sys as any).lastCheck = -600
      sys.update(1, em, 399)
      expect((sys as any).lastPractice).toBe(0)
    })

    it('tick达到PRACTICE_INTERVAL(400)时更新lastPractice', () => {
      const em = { getEntitiesWithComponents: () => [] as number[] } as any
      ;(sys as any).lastPractice = 0
      ;(sys as any).lastCheck = -600
      sys.update(1, em, 400)
      expect((sys as any).lastPractice).toBe(400)
    })

    it('tick=399 时 lastPractice 保持 0', () => {
      const em = { getEntitiesWithComponents: () => [] } as any
      ;(sys as any).lastPractice = 0
      ;(sys as any).lastCheck = -600
      sys.update(0, em, 399)
      expect((sys as any).lastPractice).toBe(0)
    })

    it('tick=400 时 lastPractice 变为 400', () => {
      const em = { getEntitiesWithComponents: () => [] } as any
      ;(sys as any).lastPractice = 0
      ;(sys as any).lastCheck = -600
      sys.update(0, em, 400)
      expect((sys as any).lastPractice).toBe(400)
    })

    it('连续满足阈值时 lastPractice 正确递进', () => {
      const em = { getEntitiesWithComponents: () => [] } as any
      ;(sys as any).lastPractice = 0
      ;(sys as any).lastCheck = -600
      sys.update(0, em, 400)
      expect((sys as any).lastPractice).toBe(400)
      sys.update(0, em, 800)
      expect((sys as any).lastPractice).toBe(800)
    })
  })

  // ── assignHobbies 逻辑 ────────────────────────────────────────────────────────
  describe('assignHobbies 逻辑', () => {
    it('MAX_HOBBIES(200) 时不再分配', () => {
      for (let i = 0; i < 200; i++) {
        sys.getHobbies().set(i, makeHobby(i))
      }
      const em = {
        getEntitiesWithComponents: () => [201, 202],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(200)
    })

    it('已有 hobby 的实体不重复分配', () => {
      const h = makeHobby(1, 'fishing')
      sys.getHobbies().set(1, h)
      vi.spyOn(Math, 'random').mockReturnValue(0) // Math.random()=0 <= 0.08，会尝试分配
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(1)
      expect(sys.getHobbies().get(1)).toBe(h) // 原对象未变
    })

    it('Math.random > 0.08 时跳过分配', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const em = {
        getEntitiesWithComponents: () => [1, 2, 3],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(0)
    })

    it('Math.random <= 0.08 时分配 hobby', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      expect(sys.getHobbies().size).toBe(1)
    })

    it('新分配的 hobby 初始 skill 为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      if (sys.getHobbies().has(1)) {
        expect(sys.getHobbies().get(1)!.skill).toBe(0)
      }
    })

    it('新分配的 hobby socialPartner 为 null', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 500)
      if (sys.getHobbies().has(1)) {
        expect(sys.getHobbies().get(1)!.socialPartner).toBeNull()
      }
    })

    it('新分配的 hobby lastPracticed 等于当前 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 777)
      if (sys.getHobbies().has(1)) {
        expect(sys.getHobbies().get(1)!.lastPracticed).toBe(777)
      }
    })

    it('新分配的 hobby enjoyment 在 [5, 14] 范围内', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const em = {
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      } as any
      ;(sys as any).assignHobbies(em, 100)
      if (sys.getHobbies().has(1)) {
        const enjoyment = sys.getHobbies().get(1)!.enjoyment
        expect(enjoyment).toBeGreaterThanOrEqual(5)
        expect(enjoyment).toBeLessThanOrEqual(14)
      }
    })
  })

  // ── CreatureHobby 数据结构 ────────────────────────────────────────────────────
  describe('CreatureHobby 数据结构完整性', () => {
    it('makeHobby 默认字段正确', () => {
      const h = makeHobby(1, 'painting')
      expect(h.entityId).toBe(1)
      expect(h.hobby).toBe('painting')
      expect(h.skill).toBe(0)
      expect(h.enjoyment).toBe(10)
      expect(h.lastPracticed).toBe(0)
      expect(h.socialPartner).toBeNull()
    })

    it('所有 HobbyType 均为有效字符串', () => {
      const types = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
      types.forEach(t => {
        const h = makeHobby(1, t as any)
        expect(h.hobby).toBe(t)
      })
    })

    it('hobby 字段正确存入 Map', () => {
      const hobbies = ['fishing', 'painting', 'stargazing', 'gardening', 'storytelling', 'crafting']
      hobbies.forEach((type, idx) => {
        sys.getHobbies().set(idx, makeHobby(idx, type as any))
      })
      hobbies.forEach((type, idx) => {
        expect(sys.getHobbies().get(idx)!.hobby).toBe(type)
      })
    })
  })

  // ── 边界与极端情况 ───────────────────────────────────────────────────────────
  describe('边界与极端情况', () => {
    it('update 空实体列表时不报错', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      expect(() => sys.update(0, em, 600)).not.toThrow()
    })

    it('大 tick 值不影响 update 逻辑', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastPractice = 0
      expect(() => sys.update(0, em, 999999)).not.toThrow()
    })

    it('dt 参数不影响结果', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastPractice = 0
      sys.update(9999, em, 600)
      expect((sys as any).lastCheck).toBe(600)
    })

    it('同时触发 CHECK 和 PRACTICE 时均正确执行', () => {
      const em = { getEntitiesWithComponents: () => [], getComponent: () => undefined } as any
      ;(sys as any).lastCheck = 0
      ;(sys as any).lastPractice = 0
      // 600 >= CHECK_INTERVAL(600) 且 600 >= PRACTICE_INTERVAL(400)
      sys.update(0, em, 600)
      expect((sys as any).lastCheck).toBe(600)
      expect((sys as any).lastPractice).toBe(600)
    })
  })
})
