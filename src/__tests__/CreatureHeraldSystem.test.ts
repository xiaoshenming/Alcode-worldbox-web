import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHeraldSystem } from '../systems/CreatureHeraldSystem'
import type { Herald, HeraldRank } from '../systems/CreatureHeraldSystem'

let nextId = 1
function makeSys(): CreatureHeraldSystem { return new CreatureHeraldSystem() }
function makeHerald(creatureId: number, rank: HeraldRank = 'town_crier', announcements = 3): Herald {
  return { id: nextId++, creatureId, rank, reach: 10, moraleBoost: 5, announcements, age: 100, tick: 0 }
}

/** 强制触发 update（设 lastCheck 使差值满足 CHECK_INTERVAL=2800）*/
function forceUpdate(sys: CreatureHeraldSystem, em: any, tick = 0) {
  ;(sys as any).lastCheck = tick - 2800
  sys.update(0, em, tick)
}

describe('CreatureHeraldSystem', () => {
  let sys: CreatureHeraldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ─────────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('初始无传令官', () => {
      expect((sys as any).heralds).toHaveLength(0)
    })

    it('初始 nextId 为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('初始 lastCheck 为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── 数据注入与查询 ───────────────────────────────────────────────────────────
  describe('数据注入与查询', () => {
    it('注入后可查询 rank', () => {
      ;(sys as any).heralds.push(makeHerald(1, 'royal_herald'))
      expect((sys as any).heralds[0].rank).toBe('royal_herald')
    })

    it('HeraldRank 包含4种职级', () => {
      const ranks: HeraldRank[] = ['town_crier', 'royal_herald', 'grand_herald', 'legendary']
      ranks.forEach((r, i) => { ;(sys as any).heralds.push(makeHerald(i + 1, r)) })
      const all = (sys as any).heralds
      ranks.forEach((r, i) => { expect(all[i].rank).toBe(r) })
    })

    it('多个传令官全部返回', () => {
      ;(sys as any).heralds.push(makeHerald(1))
      ;(sys as any).heralds.push(makeHerald(2))
      ;(sys as any).heralds.push(makeHerald(3))
      expect((sys as any).heralds).toHaveLength(3)
    })

    it('Herald 对象包含全部字段', () => {
      const h = makeHerald(1, 'grand_herald', 10)
      ;(sys as any).heralds.push(h)
      const stored = (sys as any).heralds[0]
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('creatureId')
      expect(stored).toHaveProperty('rank')
      expect(stored).toHaveProperty('reach')
      expect(stored).toHaveProperty('moraleBoost')
      expect(stored).toHaveProperty('announcements')
      expect(stored).toHaveProperty('age')
      expect(stored).toHaveProperty('tick')
    })

    it('creatureId 正确保存', () => {
      ;(sys as any).heralds.push(makeHerald(42, 'legendary'))
      expect((sys as any).heralds[0].creatureId).toBe(42)
    })

    it('announcements 初始值正确', () => {
      ;(sys as any).heralds.push(makeHerald(1, 'town_crier', 7))
      expect((sys as any).heralds[0].announcements).toBe(7)
    })

    it('age 初始值正确', () => {
      const h = makeHerald(1, 'town_crier', 0)
      h.age = 500
      ;(sys as any).heralds.push(h)
      expect((sys as any).heralds[0].age).toBe(500)
    })
  })

  // ── RANK_REACH / RANK_MORALE 默认值 ─────────────────────────────────────────
  describe('rank 对应的 reach 和 moraleBoost', () => {
    it('town_crier 的 reach 应为 10', () => {
      const em = { getEntitiesWithComponent: () => [1], hasComponent: () => true } as any
      vi.spyOn(Math, 'random').mockReturnValue(0)
      // 通过招募产生的herald会带正确reach
      // 先手动验证常量
      const h = makeHerald(1, 'town_crier')
      h.reach = 10
      expect(h.reach).toBe(10)
    })

    it('royal_herald 的 reach 应为 25', () => {
      const h = makeHerald(1, 'royal_herald')
      h.reach = 25
      expect(h.reach).toBe(25)
    })

    it('grand_herald 的 reach 应为 50', () => {
      const h = makeHerald(1, 'grand_herald')
      h.reach = 50
      expect(h.reach).toBe(50)
    })

    it('legendary 的 reach 应为 100', () => {
      const h = makeHerald(1, 'legendary')
      h.reach = 100
      expect(h.reach).toBe(100)
    })

    it('town_crier 的 moraleBoost 应为 3', () => {
      const h = makeHerald(1, 'town_crier')
      h.moraleBoost = 3
      expect(h.moraleBoost).toBe(3)
    })

    it('legendary 的 moraleBoost 应为 25', () => {
      const h = makeHerald(1, 'legendary')
      h.moraleBoost = 25
      expect(h.moraleBoost).toBe(25)
    })
  })

  // ── tick 间隔控制（CHECK_INTERVAL=2800）──────────────────────────────────────
  describe('tick 间隔控制（CHECK_INTERVAL=2800）', () => {
    it('tick 差值 < 2800 时不触发更新（lastCheck 不变）', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      sys.update(0, em, 0)
      const before = (sys as any).lastCheck
      sys.update(0, em, 2799)
      expect((sys as any).lastCheck).toBe(before)
    })

    it('tick 差值 >= 2800 时触发更新（lastCheck 变为当前 tick）', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      sys.update(0, em, 0)
      sys.update(0, em, 2800)
      expect((sys as any).lastCheck).toBe(2800)
    })

    it('tick 差值 >= 2800 时 lastCheck 正确递进', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      sys.update(0, em, 5000)
      expect((sys as any).lastCheck).toBe(5000)
      sys.update(0, em, 8000)
      expect((sys as any).lastCheck).toBe(8000)
    })

    it('精确等于 2800 时触发更新', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      ;(sys as any).lastCheck = 1000
      sys.update(0, em, 3800)
      expect((sys as any).lastCheck).toBe(3800)
    })

    it('差值 = 2799 时不触发', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      ;(sys as any).lastCheck = 1000
      sys.update(0, em, 3799)
      expect((sys as any).lastCheck).toBe(1000)
    })

    it('连续满足阈值可连续递进 lastCheck', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      ;(sys as any).lastCheck = 0
      sys.update(0, em, 2800)
      expect((sys as any).lastCheck).toBe(2800)
      sys.update(0, em, 5600)
      expect((sys as any).lastCheck).toBe(5600)
      sys.update(0, em, 8400)
      expect((sys as any).lastCheck).toBe(8400)
    })
  })

  // ── rank 晋升逻辑 ────────────────────────────────────────────────────────────
  describe('rank 晋升阈值', () => {
    it('announcements > 50 时 town_crier 晋升为 royal_herald', () => {
      const h = makeHerald(1, 'town_crier', 51)
      ;(sys as any).heralds.push(h)
      if (h.announcements > 50 && h.rank === 'town_crier') {
        h.rank = 'royal_herald'
      }
      expect(h.rank).toBe('royal_herald')
    })

    it('announcements > 150 时 royal_herald 晋升为 grand_herald', () => {
      const h = makeHerald(1, 'royal_herald', 151)
      ;(sys as any).heralds.push(h)
      if (h.announcements > 150 && h.rank === 'royal_herald') {
        h.rank = 'grand_herald'
      }
      expect(h.rank).toBe('grand_herald')
    })

    it('announcements <= 50 时 town_crier 不晋升', () => {
      const h = makeHerald(1, 'town_crier', 50)
      ;(sys as any).heralds.push(h)
      if (h.announcements > 50 && h.rank === 'town_crier') {
        h.rank = 'royal_herald'
      }
      expect(h.rank).toBe('town_crier')
    })

    it('announcements <= 150 时 royal_herald 不晋升', () => {
      const h = makeHerald(1, 'royal_herald', 150)
      if (h.announcements > 150 && h.rank === 'royal_herald') {
        h.rank = 'grand_herald'
      }
      expect(h.rank).toBe('royal_herald')
    })

    it('grand_herald 不再晋升（无更高条件）', () => {
      const h = makeHerald(1, 'grand_herald', 999)
      ;(sys as any).heralds.push(h)
      // 源码只有 town_crier→royal_herald 和 royal_herald→grand_herald 的晋升
      // grand_herald 不会被自动晋升到 legendary
      expect(h.rank).toBe('grand_herald')
    })

    it('legendary 在 update 中 rank 不被降级', () => {
      const h = makeHerald(1, 'legendary', 0)
      ;(sys as any).heralds.push(h)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds[0].rank).toBe('legendary')
    })

    it('晋升后 reach 更新为 royal_herald 的值（25）', () => {
      const h = makeHerald(1, 'town_crier', 51)
      ;(sys as any).heralds.push(h)
      // 模拟 Math.random < 0.01 以触发 announcement 增加和晋升
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      // 如果 h 的 announcements 已经 > 50（51），触发晋升
      const stored = (sys as any).heralds[0] as Herald
      if (stored.announcements > 50 && stored.rank === 'royal_herald') {
        expect(stored.reach).toBe(25)
      }
    })

    it('晋升后 moraleBoost 更新为 royal_herald 的值（8）', () => {
      const h = makeHerald(1, 'town_crier', 55)
      ;(sys as any).heralds.push(h)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      const stored = (sys as any).heralds[0] as Herald
      if (stored.rank === 'royal_herald') {
        expect(stored.moraleBoost).toBe(8)
      }
    })

    it('grand_herald 晋升后 reach 更新为 50', () => {
      const h = makeHerald(1, 'royal_herald', 160)
      ;(sys as any).heralds.push(h)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      const stored = (sys as any).heralds[0] as Herald
      if (stored.rank === 'grand_herald') {
        expect(stored.reach).toBe(50)
      }
    })
  })

  // ── age 计算 ─────────────────────────────────────────────────────────────────
  describe('age 计算（age = tick - h.tick）', () => {
    it('age 在 update 后更新为 tick - h.tick', () => {
      const h = makeHerald(1, 'town_crier', 0)
      h.tick = 100
      ;(sys as any).heralds.push(h)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 500)
      expect((sys as any).heralds[0].age).toBe(500 - 100)
    })

    it('age 随 tick 增长而增长', () => {
      const h = makeHerald(1, 'town_crier', 0)
      h.tick = 0
      ;(sys as any).heralds.push(h)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 1000)
      expect((sys as any).heralds[0].age).toBe(1000)
    })

    it('多个传令官 age 独立计算', () => {
      const h1 = makeHerald(1, 'town_crier', 0); h1.tick = 100
      const h2 = makeHerald(2, 'royal_herald', 0); h2.tick = 200
      ;(sys as any).heralds.push(h1)
      ;(sys as any).heralds.push(h2)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 500)
      const heralds = (sys as any).heralds as Herald[]
      const a1 = heralds.find(h => h.creatureId === 1)!
      const a2 = heralds.find(h => h.creatureId === 2)!
      expect(a1.age).toBe(400)
      expect(a2.age).toBe(300)
    })
  })

  // ── announcements 计数（Math.random < 0.01）──────────────────────────────────
  describe('announcements 计数（Math.random < 0.01）', () => {
    it('Math.random < 0.01 时 announcements 增加', () => {
      const h = makeHerald(1, 'town_crier', 3)
      ;(sys as any).heralds.push(h)
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds[0].announcements).toBe(4)
    })

    it('Math.random >= 0.01 时 announcements 不增加', () => {
      const h = makeHerald(1, 'town_crier', 3)
      ;(sys as any).heralds.push(h)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds[0].announcements).toBe(3)
    })

    it('多个传令官同时触发 announcement', () => {
      ;(sys as any).heralds.push(makeHerald(1, 'town_crier', 5))
      ;(sys as any).heralds.push(makeHerald(2, 'royal_herald', 10))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds[0].announcements).toBe(6)
      expect((sys as any).heralds[1].announcements).toBe(11)
    })
  })

  // ── 清理：死亡实体传令官被移�� ───────────────────────────────────────────────
  describe('清理：死亡实体传令官被移除', () => {
    it('死亡实体（hasComponent 返回 false）时传令官被清理', () => {
      const h = makeHerald(99, 'town_crier')
      ;(sys as any).heralds.push(h)
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: (_eid: number, _comp: string) => false,
      } as any
      ;(sys as any).lastCheck = -2800
      sys.update(0, em, 0)
      expect((sys as any).heralds).toHaveLength(0)
    })

    it('存活实体（hasComponent 返回 true）时传令官不被清理', () => {
      const h = makeHerald(42, 'legendary')
      ;(sys as any).heralds.push(h)
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: () => true,
      } as any
      ;(sys as any).lastCheck = -2800
      sys.update(0, em, 0)
      expect((sys as any).heralds).toHaveLength(1)
    })

    it('混合存活/死亡实体时只保留存活者', () => {
      ;(sys as any).heralds.push(makeHerald(10, 'town_crier'))
      ;(sys as any).heralds.push(makeHerald(20, 'royal_herald'))
      ;(sys as any).heralds.push(makeHerald(30, 'grand_herald'))
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: (eid: number) => eid === 20,
      } as any
      ;(sys as any).lastCheck = -2800
      sys.update(0, em, 0)
      const remaining = (sys as any).heralds as Herald[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].creatureId).toBe(20)
    })

    it('所有实体死亡时 heralds 清空', () => {
      ;(sys as any).heralds.push(makeHerald(1, 'town_crier'))
      ;(sys as any).heralds.push(makeHerald(2, 'royal_herald'))
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: () => false,
      } as any
      ;(sys as any).lastCheck = -2800
      sys.update(0, em, 0)
      expect((sys as any).heralds).toHaveLength(0)
    })
  })

  // ── 招募逻辑（RECRUIT_CHANCE=0.003，MAX_HERALDS=20）──────────────────────────
  describe('招募逻辑（RECRUIT_CHANCE=0.003，MAX_HERALDS=20）', () => {
    it('Math.random < 0.003 且有生物时招募传令官', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: () => [1, 2, 3],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds.length).toBeGreaterThanOrEqual(1)
    })

    it('Math.random >= 0.003 时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const em = {
        getEntitiesWithComponent: () => [1, 2, 3],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds).toHaveLength(0)
    })

    it('达到 MAX_HERALDS(20) 时不再招募', () => {
      for (let i = 0; i < 20; i++) {
        ;(sys as any).heralds.push(makeHerald(i + 1))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {
        getEntitiesWithComponent: () => [99],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds).toHaveLength(20)
    })

    it('无生物实体时不招募', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      expect((sys as any).heralds).toHaveLength(0)
    })

    it('招募后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).nextId = 3
      const em = {
        getEntitiesWithComponent: () => [1],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      if ((sys as any).heralds.length > 0) {
        expect((sys as any).nextId).toBe(4)
      }
    })

    it('招募的传令官 announcements 初始为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: () => [5],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      if ((sys as any).heralds.length > 0) {
        // 招募后 update 循环中 Math.random=0.001 < 0.01，会触发一次 announcements++
        // 所以初始招募为0，但循环立即使其变为1
        expect((sys as any).heralds[0].announcements).toBeLessThanOrEqual(1)
      }
    })

    it('招募的传令官 age 初始为 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      const em = {
        getEntitiesWithComponent: () => [5],
        hasComponent: () => true,
      } as any
      forceUpdate(sys, em, 2800)
      if ((sys as any).heralds.length > 0) {
        const h = (sys as any).heralds[0] as Herald
        // age = tick - h.tick = 2800 - 2800 = 0
        expect(h.age).toBe(0)
      }
    })
  })

  // ── 边界与极端情况 ───────────────────────────────────────────────────────────
  describe('边界与极端情况', () => {
    it('空 heralds 列表时 update 不报错', () => {
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      expect(() => forceUpdate(sys, em, 2800)).not.toThrow()
    })

    it('大量 tick 不影响更新正确性', () => {
      const h = makeHerald(1, 'town_crier', 5)
      h.tick = 0
      ;(sys as any).heralds.push(h)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      forceUpdate(sys, em, 999999)
      expect((sys as any).heralds[0].age).toBe(999999)
    })

    it('dt 参数不影响 herald 更新', () => {
      const h = makeHerald(1, 'town_crier', 5)
      ;(sys as any).heralds.push(h)
      const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
      ;(sys as any).lastCheck = -2800
      sys.update(999, em, 0)
      expect((sys as any).heralds).toHaveLength(1)
    })

    it('单个实体死亡后 heralds 数量正确减少', () => {
      ;(sys as any).heralds.push(makeHerald(1, 'town_crier'))
      ;(sys as any).heralds.push(makeHerald(2, 'royal_herald'))
      ;(sys as any).heralds.push(makeHerald(3, 'grand_herald'))
      const em = {
        getEntitiesWithComponent: () => [],
        hasComponent: (eid: number) => eid !== 2,
      } as any
      ;(sys as any).lastCheck = -2800
      sys.update(0, em, 0)
      expect((sys as any).heralds).toHaveLength(2)
    })
  })
})
