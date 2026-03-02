import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAllianceSystem } from '../systems/CreatureAllianceSystem'
import type { PersonalAlliance } from '../systems/CreatureAllianceSystem'

let nextId = 1

function makeALS(): CreatureAllianceSystem {
  return new CreatureAllianceSystem()
}

function makeAlliance(
  memberA: number,
  memberB: number,
  type: PersonalAlliance['type'] = 'friendship',
  overrides: Partial<PersonalAlliance> = {}
): PersonalAlliance {
  return {
    id: nextId++,
    memberA,
    memberB,
    strength: 50,
    formedAt: 0,
    lastInteraction: 0,
    type,
    ...overrides,
  }
}

// 构造最小 EntityManager mock
function makeEM(overrides: Record<string, unknown> = {}) {
  return {
    getComponent: (_id: number, _comp: string) => undefined,
    getEntitiesWithComponents: (..._args: string[]) => [] as number[],
    ...overrides,
  } as any
}

describe('CreatureAllianceSystem', () => {
  let als: CreatureAllianceSystem

  beforeEach(() => {
    als = makeALS()
    nextId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  // ── 基础构造 ────────────────────────────────────────────────────────────────

  describe('初始状态', () => {
    it('初始联盟数量为0', () => {
      expect((als as any).alliances).toHaveLength(0)
    })

    it('alliances 是数组', () => {
      expect(Array.isArray((als as any).alliances)).toBe(true)
    })

    it('_allianceKeySet 是 Set', () => {
      expect((als as any)._allianceKeySet).toBeInstanceOf(Set)
    })

    it('初始 _allianceKeySet 为空', () => {
      expect((als as any)._allianceKeySet.size).toBe(0)
    })

    it('lastCheck 初始为 0', () => {
      expect((als as any).lastCheck).toBe(0)
    })

    it('lastDecay 初始为 0', () => {
      expect((als as any).lastDecay).toBe(0)
    })
  })

  // ── PersonalAlliance 数据结构 ────────────────────────────────────────────

  describe('PersonalAlliance 数据结构', () => {
    it('注入1个联盟后数量为1', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      expect((als as any).alliances).toHaveLength(1)
    })

    it('注入多个联盟数量累加', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      ;(als as any).alliances.push(makeAlliance(2, 3))
      ;(als as any).alliances.push(makeAlliance(3, 4))
      expect((als as any).alliances).toHaveLength(3)
    })

    it('注入 blood_oath 联盟后 type 正确', () => {
      const alliance = makeAlliance(1, 2, 'blood_oath')
      ;(als as any).alliances.push(alliance)
      expect((als as any).alliances[0].type).toBe('blood_oath')
      expect((als as any).alliances[0].memberA).toBe(1)
      expect((als as any).alliances[0].memberB).toBe(2)
    })

    it('注入 mentor 联盟后 type 正确', () => {
      ;(als as any).alliances.push(makeAlliance(3, 4, 'mentor'))
      expect((als as any).alliances[0].type).toBe('mentor')
    })

    it('注入 rival_respect 联盟后 type 正确', () => {
      ;(als as any).alliances.push(makeAlliance(5, 6, 'rival_respect'))
      expect((als as any).alliances[0].type).toBe('rival_respect')
    })

    it('支持所有4种联盟类型', () => {
      const types: PersonalAlliance['type'][] = ['friendship', 'blood_oath', 'mentor', 'rival_respect']
      types.forEach((t, i) => {
        ;(als as any).alliances.push(makeAlliance(i + 1, i + 10, t))
      })
      expect((als as any).alliances).toHaveLength(4)
      types.forEach((t, i) => {
        expect((als as any).alliances[i].type).toBe(t)
      })
    })

    it('联盟 strength 在 0-100 范围内', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 75 })
      ;(als as any).alliances.push(a)
      expect((als as any).alliances[0].strength).toBe(75)
    })

    it('联盟 formedAt 可自定义', () => {
      const a = makeAlliance(1, 2, 'friendship', { formedAt: 9999 })
      ;(als as any).alliances.push(a)
      expect((als as any).alliances[0].formedAt).toBe(9999)
    })

    it('联盟 lastInteraction 可自定义', () => {
      const a = makeAlliance(1, 2, 'friendship', { lastInteraction: 5000 })
      ;(als as any).alliances.push(a)
      expect((als as any).alliances[0].lastInteraction).toBe(5000)
    })

    it('联盟 id 字段存在', () => {
      const a = makeAlliance(1, 2)
      ;(als as any).alliances.push(a)
      expect(typeof (als as any).alliances[0].id).toBe('number')
    })
  })

  // ── 查找过滤 ────────────────────────────��───────────────────────────────

  describe('联盟查找与过滤', () => {
    it('特定 id 在 memberA 联盟中可手动查找', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      const found = (als as any).alliances.filter(
        (a: PersonalAlliance) => a.memberA === 1 || a.memberB === 1
      )
      expect(found).toHaveLength(1)
    })

    it('特定 id 在 memberB 联盟中可手动查找', () => {
      ;(als as any).alliances.push(makeAlliance(5, 1))
      const found = (als as any).alliances.filter(
        (a: PersonalAlliance) => a.memberA === 1 || a.memberB === 1
      )
      expect(found).toHaveLength(1)
    })

    it('过滤指定实体的联盟（实体2参与2个联盟）', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      ;(als as any).alliances.push(makeAlliance(2, 3))
      ;(als as any).alliances.push(makeAlliance(3, 4))
      const forId2 = (als as any).alliances.filter(
        (a: PersonalAlliance) => a.memberA === 2 || a.memberB === 2
      )
      expect(forId2).toHaveLength(2)
    })

    it('实体不在任何联盟时返回空数组', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      ;(als as any).alliances.push(makeAlliance(3, 4))
      const forId9 = (als as any).alliances.filter(
        (a: PersonalAlliance) => a.memberA === 9 || a.memberB === 9
      )
      expect(forId9).toHaveLength(0)
    })

    it('按 type 过滤仅返回 blood_oath', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2, 'friendship'))
      ;(als as any).alliances.push(makeAlliance(2, 3, 'blood_oath'))
      ;(als as any).alliances.push(makeAlliance(3, 4, 'mentor'))
      const oaths = (als as any).alliances.filter(
        (a: PersonalAlliance) => a.type === 'blood_oath'
      )
      expect(oaths).toHaveLength(1)
      expect(oaths[0].memberA).toBe(2)
    })

    it('按 strength 排序后最强联盟在首位', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2, 'friendship', { strength: 30 }))
      ;(als as any).alliances.push(makeAlliance(3, 4, 'friendship', { strength: 90 }))
      ;(als as any).alliances.push(makeAlliance(5, 6, 'friendship', { strength: 60 }))
      const sorted = [...(als as any).alliances].sort(
        (a: PersonalAlliance, b: PersonalAlliance) => b.strength - a.strength
      )
      expect(sorted[0].strength).toBe(90)
    })
  })

  // ── hasAlliance 私有方法 ─────────────────────────────────────────────────

  describe('hasAlliance 私有方法', () => {
    it('KeySet 为空时 hasAlliance 返回 false', () => {
      expect((als as any).hasAlliance(1, 2)).toBe(false)
    })

    it('手动注入 KeySet 后 hasAlliance 返回 true（正序）', () => {
      ;(als as any)._allianceKeySet.add('1_2')
      expect((als as any).hasAlliance(1, 2)).toBe(true)
    })

    it('hasAlliance 顺序无关（反序也能找到）', () => {
      ;(als as any)._allianceKeySet.add('1_2')
      expect((als as any).hasAlliance(2, 1)).toBe(true)
    })

    it('KeySet 中有其他 key 时不误报', () => {
      ;(als as any)._allianceKeySet.add('3_5')
      expect((als as any).hasAlliance(1, 2)).toBe(false)
    })

    it('大编号实体也能正确生成 key', () => {
      ;(als as any)._allianceKeySet.add('100_200')
      expect((als as any).hasAlliance(100, 200)).toBe(true)
      expect((als as any).hasAlliance(200, 100)).toBe(true)
    })

    it('相同编号不产生有效联盟 key（min=max）', () => {
      ;(als as any)._allianceKeySet.add('5_5')
      expect((als as any).hasAlliance(5, 5)).toBe(true)
    })
  })

  // ── CHECK_INTERVAL 节流（CHECK_INTERVAL = 800）─────────────────────────

  describe('CHECK_INTERVAL 节流 (800)', () => {
    it('tick 差值 < 800 时不触发 formAlliances，lastCheck 不变', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 0
      als.update(1, em, 799)
      expect((als as any).lastCheck).toBe(0)
    })

    it('tick 差值 == 800 时触发 formAlliances，lastCheck 更新', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 0
      als.update(1, em, 800)
      expect((als as any).lastCheck).toBe(800)
    })

    it('tick 差值 > 800 时触发 formAlliances，lastCheck 更新', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 0
      als.update(1, em, 1500)
      expect((als as any).lastCheck).toBe(1500)
    })

    it('第二次 update lastCheck=800，tick=1599 时不触发', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 800
      als.update(1, em, 1599)
      expect((als as any).lastCheck).toBe(800)
    })

    it('第二次 update lastCheck=800，tick=1600 时触发', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 800
      als.update(1, em, 1600)
      expect((als as any).lastCheck).toBe(1600)
    })
  })

  // ── DECAY_INTERVAL 节流（DECAY_INTERVAL = 1200）───────────────────────

  describe('DECAY_INTERVAL 节流 (1200)', () => {
    it('tick 差值 < 1200 时不触发 decayAlliances，lastDecay 不变', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1199)
      expect((als as any).lastDecay).toBe(0)
    })

    it('tick 差值 == 1200 时触发 decayAlliances，lastDecay 更新', () => {
      const em = makeEM({
        getEntitiesWithComponents: () => [],
        getComponent: () => ({ x: 0, y: 0 }),
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).lastDecay).toBe(1200)
    })

    it('tick 差值 > 1200 时触发 decayAlliances，lastDecay 更新', () => {
      const em = makeEM({
        getEntitiesWithComponents: () => [],
        getComponent: () => ({ x: 0, y: 0 }),
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 2000)
      expect((als as any).lastDecay).toBe(2000)
    })
  })

  // ── decayAlliances 行为 ──────────────────────────────────────────────────

  describe('decayAlliances 行为', () => {
    it('成员死亡时联盟被删除', () => {
      const a = makeAlliance(10, 20)
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('10_20')
      // getComponent 返回 undefined 表示实体已死
      const em = makeEM({ getComponent: () => undefined })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).alliances).toHaveLength(0)
    })

    it('memberA 死亡时 KeySet 也清除', () => {
      const a = makeAlliance(10, 20)
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('10_20')
      const em = makeEM({ getComponent: (_id: number, _comp: string) => undefined })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any)._allianceKeySet.has('10_20')).toBe(false)
    })

    it('两成员均存活且在范围内时 strength 增加 BOND_GAIN(3)', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 50 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') return { x: 0, y: 0 }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).alliances[0].strength).toBe(53)
    })

    it('strength 不超过 100（BOND_GAIN 截断）', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 99 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') return { x: 0, y: 0 }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).alliances[0].strength).toBe(100)
    })

    it('两成员均存活但超出 ALLIANCE_RANGE(12) 时 strength 衰减', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 50 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      let callIdx = 0
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') {
            callIdx++
            return callIdx === 1 ? { x: 0, y: 0 } : { x: 20, y: 20 } // 超过12
          }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      // strength - BOND_DECAY(1) = 49
      expect((als as any).alliances[0].strength).toBe(49)
    })

    it('strength 衰减至 < MIN_BOND(10) 时联盟被删除', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 10 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      let callIdx = 0
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') {
            callIdx++
            return callIdx === 1 ? { x: 0, y: 0 } : { x: 100, y: 100 }
          }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      // strength = 10 - 1 = 9 < MIN_BOND(10) => 删除
      expect((als as any).alliances).toHaveLength(0)
    })

    it('strength 衰减到 MIN_BOND(10) 时（恰好等于）不被删除', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 11 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      let callIdx = 0
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') {
            callIdx++
            return callIdx === 1 ? { x: 0, y: 0 } : { x: 100, y: 100 }
          }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      // 11 - 1 = 10 >= MIN_BOND(10) => 保留
      expect((als as any).alliances).toHaveLength(1)
      expect((als as any).alliances[0].strength).toBe(10)
    })

    it('多联盟中仅删除已过期的', () => {
      // a1: strength=10, 超出range => 衰减 => 9 < 10 => 删除
      // a2: strength=50, 在range内 => 增强 => 保留
      const a1 = makeAlliance(1, 2, 'friendship', { strength: 10 })
      const a2 = makeAlliance(3, 4, 'friendship', { strength: 50 })
      ;(als as any).alliances.push(a1)
      ;(als as any).alliances.push(a2)
      ;(als as any)._allianceKeySet.add('1_2')
      ;(als as any)._allianceKeySet.add('3_4')

      const posMap: Record<number, { x: number; y: number }> = {
        1: { x: 0, y: 0 },
        2: { x: 100, y: 100 }, // 超出 range
        3: { x: 5, y: 5 },
        4: { x: 5, y: 5 },    // 在 range 内
      }
      const em = makeEM({
        getComponent: (id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') return posMap[id]
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).alliances).toHaveLength(1)
      expect((als as any).alliances[0].memberA).toBe(3)
    })

    it('decayAlliances 在 range 内时更新 lastInteraction', () => {
      const a = makeAlliance(1, 2, 'friendship', { strength: 50, lastInteraction: 0 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') return { x: 0, y: 0 }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).alliances[0].lastInteraction).toBe(1200)
    })
  })

  // ── formAlliances 行为 ──────────────────────────────────────────────────

  describe('formAlliances 行为', () => {
    it('update 不崩溃（空实体列表）', () => {
      const em = makeEM()
      expect(() => als.update(1, em, 0)).not.toThrow()
    })

    it('update 不崩溃（tick < CHECK_INTERVAL 时不调用 formAlliances）', () => {
      const em = makeEM()
      expect(() => als.update(1, em, 799)).not.toThrow()
    })

    it('实体少于2时不形成联盟', () => {
      const em = makeEM({
        getEntitiesWithComponents: () => [1],
        getComponent: () => undefined,
      })
      ;(als as any).lastCheck = 0
      als.update(1, em, 800)
      expect((als as any).alliances).toHaveLength(0)
    })

    it('alliances 已达 MAX_ALLIANCES(100) 时不再新增', () => {
      for (let i = 0; i < 100; i++) {
        ;(als as any).alliances.push(makeAlliance(i * 2 + 1, i * 2 + 2))
      }
      const em = makeEM({
        getEntitiesWithComponents: () => [201, 202],
        getComponent: () => ({ x: 0, y: 0 }),
      })
      ;(als as any).lastCheck = 0
      als.update(1, em, 800)
      expect((als as any).alliances).toHaveLength(100)
    })

    it('两实体已有联盟时不重复创建', () => {
      ;(als as any)._allianceKeySet.add('1_2')
      ;(als as any).alliances.push(makeAlliance(1, 2))
      // 模拟 Math.random 使选出 iA=0, iB=1，且通过概率检查
      const origRandom = Math.random
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        // 前两次选 0, 1，第3次通过 0.1 检查
        if (callCount === 1) return 0        // iA=0
        if (callCount === 2) return 0.5      // iB 选中
        return 0                             // Math.random() > 0.1? => 0 < 0.1 => 不continue
      })
      const em = makeEM({
        getEntitiesWithComponents: () => [1, 2],
        getComponent: () => ({ x: 0, y: 0 }),
      })
      ;(als as any).lastCheck = 0
      als.update(1, em, 800)
      // 因为 hasAlliance(1,2) 为 true，不会新增
      expect((als as any).alliances).toHaveLength(1)
    })
  })

  // ── update 综合调用 ─────────────────────────────────────────────────────

  describe('update 综合调用', () => {
    it('tick=0 时 lastCheck 和 lastDecay 均不更新', () => {
      const em = makeEM()
      als.update(1, em, 0)
      expect((als as any).lastCheck).toBe(0)
      expect((als as any).lastDecay).toBe(0)
    })

    it('tick=800 时 lastCheck 更新为 800，lastDecay 不变', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      als.update(1, em, 800)
      expect((als as any).lastCheck).toBe(800)
      expect((als as any).lastDecay).toBe(0)
    })

    it('tick=1200 时 lastDecay 更新为 1200，lastCheck 也更新', () => {
      const em = makeEM({
        getEntitiesWithComponents: () => [],
        getComponent: () => ({ x: 0, y: 0 }),
      })
      als.update(1, em, 1200)
      expect((als as any).lastCheck).toBe(1200)
      expect((als as any).lastDecay).toBe(1200)
    })

    it('多次 update 不抛异常', () => {
      const em = makeEM({
        getEntitiesWithComponents: () => [],
        getComponent: () => undefined,
      })
      expect(() => {
        for (let t = 0; t <= 5000; t += 500) {
          als.update(1, em, t)
        }
      }).not.toThrow()
    })

    it('dt 参数不影响节流逻辑（节流仅依赖 tick）', () => {
      const em = makeEM({ getEntitiesWithComponents: () => [] })
      ;(als as any).lastCheck = 0
      als.update(999, em, 500) // dt很大，但tick<800
      expect((als as any).lastCheck).toBe(0)
      als.update(1, em, 800)
      expect((als as any).lastCheck).toBe(800)
    })
  })

  // ── KeySet 一致性 ─────────────────────────────────────────────────────

  describe('_allianceKeySet 一致性', () => {
    it('手动推入联盟 + KeySet 后 hasAlliance 一致', () => {
      const a = makeAlliance(7, 13)
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('7_13')
      expect((als as any).hasAlliance(7, 13)).toBe(true)
      expect((als as any).hasAlliance(13, 7)).toBe(true)
    })

    it('同时删除联盟和 KeySet 后 hasAlliance 返回 false', () => {
      const a = makeAlliance(7, 13)
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('7_13')
      // 模拟 decay 删除：成员死亡
      const em = makeEM({ getComponent: () => undefined })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      expect((als as any).hasAlliance(7, 13)).toBe(false)
      expect((als as any).alliances).toHaveLength(0)
    })

    it('KeySet 大小与 alliances 长度一致（多联盟）', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2))
      ;(als as any)._allianceKeySet.add('1_2')
      ;(als as any).alliances.push(makeAlliance(3, 4))
      ;(als as any)._allianceKeySet.add('3_4')
      ;(als as any).alliances.push(makeAlliance(5, 6))
      ;(als as any)._allianceKeySet.add('5_6')
      expect((als as any)._allianceKeySet.size).toBe(3)
      expect((als as any).alliances).toHaveLength(3)
    })
  })

  // ── 边界与特殊值 ─────────────────────────────────────────────────────

  describe('边界与特殊值', () => {
    it('strength=0 的联盟不影响数组长度', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2, 'friendship', { strength: 0 }))
      expect((als as any).alliances).toHaveLength(1)
    })

    it('strength=100 的联盟合法', () => {
      ;(als as any).alliances.push(makeAlliance(1, 2, 'friendship', { strength: 100 }))
      expect((als as any).alliances[0].strength).toBe(100)
    })

    it('memberA === memberB 的联盟可以插入（业务层校验由调用方负责）', () => {
      ;(als as any).alliances.push(makeAlliance(5, 5))
      expect((als as any).alliances).toHaveLength(1)
    })

    it('大量联盟（99个）仍正常工作', () => {
      for (let i = 0; i < 99; i++) {
        ;(als as any).alliances.push(makeAlliance(i, i + 100))
      }
      expect((als as any).alliances).toHaveLength(99)
    })

    it('update 以 tick=0 调用时不崩溃', () => {
      const em = makeEM()
      expect(() => als.update(0, em, 0)).not.toThrow()
    })

    it('ALLIANCE_RANGE 边界：dx^2+dy^2 == 144(12^2) 被视为在范围内', () => {
      // 验证 decayAlliances 中 <= ALLIANCE_RANGE^2 的判断
      const a = makeAlliance(1, 2, 'friendship', { strength: 50 })
      ;(als as any).alliances.push(a)
      ;(als as any)._allianceKeySet.add('1_2')
      let posCallCount = 0
      const em = makeEM({
        getComponent: (_id: number, comp: string) => {
          if (comp === 'creature') return { alive: true }
          if (comp === 'position') {
            posCallCount++
            // dx=12, dy=0 => 144 <= 144 => in range
            return posCallCount === 1 ? { x: 0, y: 0 } : { x: 12, y: 0 }
          }
        },
      })
      ;(als as any).lastDecay = 0
      als.update(1, em, 1200)
      // in range => strength + 3 = 53
      expect((als as any).alliances[0].strength).toBe(53)
    })
  })
})
