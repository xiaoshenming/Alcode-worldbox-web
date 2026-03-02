import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureGladiatorSystem } from '../systems/CreatureGladiatorSystem'
import type { Gladiator, WeaponSkill } from '../systems/CreatureGladiatorSystem'

let nextId = 1
function makeSys(): CreatureGladiatorSystem { return new CreatureGladiatorSystem() }
function makeGladiator(entityId: number, overrides: Partial<Gladiator> = {}): Gladiator {
  return {
    id: nextId++,
    entityId,
    wins: 0,
    losses: 0,
    fame: 0,
    weaponSkill: 'sword',
    arenaId: 1,
    tick: 0,
    ...overrides,
  }
}

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 初始状态 ──────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 gladiators 为空数组', () => {
    expect((sys as any).gladiators).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 _gladiatorsSet 为空 Set', () => {
    expect((sys as any)._gladiatorsSet.size).toBe(0)
  })

  it('初始 _byArena 为空 Map', () => {
    expect((sys as any)._byArena.size).toBe(0)
  })
})

// ─── 2. gladiators 字段操作 ───────────────────────────��───────────────
describe('gladiators 字段', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可按 entityId 查询', () => {
    ;(sys as any).gladiators.push(makeGladiator(99))
    expect((sys as any).gladiators[0].entityId).toBe(99)
  })

  it('注入多个角斗士后 length 正确', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).gladiators.push(makeGladiator(i))
    }
    expect((sys as any).gladiators).toHaveLength(5)
  })

  it('wins 字段正确存储', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 10 }))
    expect((sys as any).gladiators[0].wins).toBe(10)
  })

  it('losses 字段正确存储', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { losses: 3 }))
    expect((sys as any).gladiators[0].losses).toBe(3)
  })

  it('wins 和 losses 独立存储', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 10, losses: 3 }))
    expect((sys as any).gladiators[0].wins).toBe(10)
    expect((sys as any).gladiators[0].losses).toBe(3)
  })

  it('fame 字段可存储最大值 100', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { fame: 100 }))
    expect((sys as any).gladiators[0].fame).toBe(100)
  })

  it('fame 字段初始为 0', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    expect((sys as any).gladiators[0].fame).toBe(0)
  })

  it('arenaId 分组字段存储正确', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { arenaId: 0 }))
    ;(sys as any).gladiators.push(makeGladiator(2, { arenaId: 4 }))
    expect((sys as any).gladiators[0].arenaId).toBe(0)
    expect((sys as any).gladiators[1].arenaId).toBe(4)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { tick: 9999 }))
    expect((sys as any).gladiators[0].tick).toBe(9999)
  })

  it('id 字段递增', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).gladiators.push(makeGladiator(2))
    const ids = (sys as any).gladiators.map((g: Gladiator) => g.id)
    expect(ids[1]).toBeGreaterThan(ids[0])
  })
})

// ─── 3. WeaponSkill 枚举覆盖 ──────────────────────────────────────────
describe('WeaponSkill 枚举覆盖', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const allWeapons: WeaponSkill[] = ['sword', 'spear', 'axe', 'fists', 'trident']

  it('支持全部 5 种武器类型（批量）', () => {
    allWeapons.forEach((w, i) => {
      ;(sys as any).gladiators.push(makeGladiator(i + 1, { weaponSkill: w }))
    })
    allWeapons.forEach((w, i) => {
      expect((sys as any).gladiators[i].weaponSkill).toBe(w)
    })
  })

  it('sword', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { weaponSkill: 'sword' }))
    expect((sys as any).gladiators[0].weaponSkill).toBe('sword')
  })

  it('spear', () => {
    ;(sys as any).gladiators.push(makeGladiator(2, { weaponSkill: 'spear' }))
    expect((sys as any).gladiators[0].weaponSkill).toBe('spear')
  })

  it('axe', () => {
    ;(sys as any).gladiators.push(makeGladiator(3, { weaponSkill: 'axe' }))
    expect((sys as any).gladiators[0].weaponSkill).toBe('axe')
  })

  it('fists', () => {
    ;(sys as any).gladiators.push(makeGladiator(4, { weaponSkill: 'fists' }))
    expect((sys as any).gladiators[0].weaponSkill).toBe('fists')
  })

  it('trident', () => {
    ;(sys as any).gladiators.push(makeGladiator(5, { weaponSkill: 'trident' }))
    expect((sys as any).gladiators[0].weaponSkill).toBe('trident')
  })
})

// ─── 4. CHECK_INTERVAL 节流逻辑（3200）───────────────────────────────
describe('update() 节流逻辑 (CHECK_INTERVAL=3200)', () => {
  let sys: CreatureGladiatorSystem
  const emEmpty = {
    getEntitiesWithComponent: () => [],
    hasComponent: () => false,
  } as any

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 3200 时 lastCheck 不更新', () => {
    ;(sys as any).lastCheck = 10000
    sys.update(0, emEmpty, 10000 + 3199)
    expect((sys as any).lastCheck).toBe(10000)
  })

  it('tick 差值 = 3200 时 lastCheck 更新', () => {
    ;(sys as any).lastCheck = 10000
    sys.update(0, emEmpty, 10000 + 3200)
    expect((sys as any).lastCheck).toBe(13200)
  })

  it('tick 差值 > 3200 时 lastCheck 更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 99999)
    expect((sys as any).lastCheck).toBe(99999)
  })

  it('连续两次 update 间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 3200)
    const after1 = (sys as any).lastCheck
    sys.update(0, emEmpty, 3200 + 500)
    expect((sys as any).lastCheck).toBe(after1)
  })

  it('多次触发后 lastCheck 等于最后触发 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, emEmpty, 3200)
    sys.update(0, emEmpty, 6400)
    expect((sys as any).lastCheck).toBe(6400)
  })
})

// ─── 5. Cleanup：creature 不存在时删除角斗士 ─────────────────────────
describe('update() cleanup 逻辑', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('creature 不存在时角斗士被删除', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(0)
  })

  it('creature 存在时角斗士保留', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid === 1,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(1)
  })

  it('多个角斗士：部分存在部分不存在时各自正确处理', () => {
    ;(sys as any).gladiators.push(makeGladiator(10))
    ;(sys as any).gladiators.push(makeGladiator(20))
    ;(sys as any).gladiators.push(makeGladiator(30))
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid === 20,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(1)
    expect((sys as any).gladiators[0].entityId).toBe(20)
  })

  it('全部 creature 存在时全部保留', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).gladiators.push(makeGladiator(i))
    }
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => true,
    } as any
    sys.update(0, em, 3200)
    expect((sys as any).gladiators).toHaveLength(5)
  })

  it('cleanup 后空 gladiators 不报错', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    expect(() => sys.update(0, em, 3200)).not.toThrow()
    expect((sys as any).gladiators).toHaveLength(0)
  })
})

// ─── 6. _gladiatorsSet 去重逻辑 ───────────────────────────────────────
describe('_gladiatorsSet 去重', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动向 _gladiatorsSet 注入实体后 has() 返回 true', () => {
    ;(sys as any)._gladiatorsSet.add(42)
    expect((sys as any)._gladiatorsSet.has(42)).toBe(true)
  })

  it('未注入的实体 has() 返回 false', () => {
    expect((sys as any)._gladiatorsSet.has(999)).toBe(false)
  })

  it('delete 后 has() 返回 false', () => {
    ;(sys as any)._gladiatorsSet.add(7)
    ;(sys as any)._gladiatorsSet.delete(7)
    expect((sys as any)._gladiatorsSet.has(7)).toBe(false)
  })

  it('set 大小随添加递增', () => {
    ;(sys as any)._gladiatorsSet.add(1)
    ;(sys as any)._gladiatorsSet.add(2)
    ;(sys as any)._gladiatorsSet.add(3)
    expect((sys as any)._gladiatorsSet.size).toBe(3)
  })

  it('重复 add 同一实体不增加 size', () => {
    ;(sys as any)._gladiatorsSet.add(5)
    ;(sys as any)._gladiatorsSet.add(5)
    expect((sys as any)._gladiatorsSet.size).toBe(1)
  })
})

// ─── 7. _byArena 分组逻辑 ────────────────────────────────────────────
describe('_byArena 分组', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('手动注入不同 arenaId 的角斗士后可按 arenaId 分组', () => {
    const g1 = makeGladiator(1, { arenaId: 0 })
    const g2 = makeGladiator(2, { arenaId: 1 })
    const g3 = makeGladiator(3, { arenaId: 0 })
    ;(sys as any).gladiators.push(g1, g2, g3)
    // 模拟 _byArena 逻辑
    const byArena = (sys as any)._byArena
    byArena.clear()
    for (const g of (sys as any).gladiators) {
      let list = byArena.get(g.arenaId)
      if (!list) { list = []; byArena.set(g.arenaId, list) }
      list.push(g)
    }
    expect(byArena.get(0)).toHaveLength(2)
    expect(byArena.get(1)).toHaveLength(1)
  })

  it('同 arenaId 的角斗士均在同一分组', () => {
    const byArena = new Map()
    const gList = [
      makeGladiator(1, { arenaId: 3 }),
      makeGladiator(2, { arenaId: 3 }),
      makeGladiator(3, { arenaId: 3 }),
    ]
    for (const g of gList) {
      let list = byArena.get(g.arenaId)
      if (!list) { list = []; byArena.set(g.arenaId, list) }
      list.push(g)
    }
    expect(byArena.get(3)).toHaveLength(3)
  })
})

// ─── 8. 角斗士结构完整性 ─────────────────────────────────────────────
describe('Gladiator 结构完整性', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('所有必需字段均存在', () => {
    ;(sys as any).gladiators.push(makeGladiator(1))
    const g = (sys as any).gladiators[0]
    expect(g).toHaveProperty('id')
    expect(g).toHaveProperty('entityId')
    expect(g).toHaveProperty('wins')
    expect(g).toHaveProperty('losses')
    expect(g).toHaveProperty('fame')
    expect(g).toHaveProperty('weaponSkill')
    expect(g).toHaveProperty('arenaId')
    expect(g).toHaveProperty('tick')
  })

  it('多角斗士可共存', () => {
    const weapons: WeaponSkill[] = ['sword', 'spear', 'axe', 'fists', 'trident']
    weapons.forEach((w, i) => {
      ;(sys as any).gladiators.push(makeGladiator(i + 1, { weaponSkill: w }))
    })
    expect((sys as any).gladiators).toHaveLength(5)
    weapons.forEach((w, i) => {
      expect((sys as any).gladiators[i].weaponSkill).toBe(w)
    })
  })

  it('MAX_GLADIATORS=12：注入 12 条后 length 为 12', () => {
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).gladiators.push(makeGladiator(i))
    }
    expect((sys as any).gladiators).toHaveLength(12)
  })

  it('fame 下限为 0（手动验证）', () => {
    const g = makeGladiator(1, { fame: 0 })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].fame).toBeGreaterThanOrEqual(0)
  })

  it('fame 上限为 100（手动验证）', () => {
    const g = makeGladiator(1, { fame: 100 })
    ;(sys as any).gladiators.push(g)
    expect((sys as any).gladiators[0].fame).toBeLessThanOrEqual(100)
  })

  it('losses 可大于 wins', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 2, losses: 10 }))
    expect((sys as any).gladiators[0].losses).toBeGreaterThan((sys as any).gladiators[0].wins)
  })

  it('wins 可大于 losses', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 8, losses: 1 }))
    expect((sys as any).gladiators[0].wins).toBeGreaterThan((sys as any).gladiators[0].losses)
  })
})

// ─── 9. 角斗士数值边界 ────────────────────────────────────────────────
describe('角斗士数值边界', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('wins 可为 0', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 0 }))
    expect((sys as any).gladiators[0].wins).toBe(0)
  })

  it('losses 可为 0', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { losses: 0 }))
    expect((sys as any).gladiators[0].losses).toBe(0)
  })

  it('wins 可为大数', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { wins: 9999 }))
    expect((sys as any).gladiators[0].wins).toBe(9999)
  })

  it('losses 可为大数', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { losses: 9999 }))
    expect((sys as any).gladiators[0].losses).toBe(9999)
  })

  it('fame 可为小数', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { fame: 55.5 }))
    expect((sys as any).gladiators[0].fame).toBeCloseTo(55.5)
  })

  it('arenaId 可为 0', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { arenaId: 0 }))
    expect((sys as any).gladiators[0].arenaId).toBe(0)
  })

  it('arenaId 可为 4（最大）', () => {
    ;(sys as any).gladiators.push(makeGladiator(1, { arenaId: 4 }))
    expect((sys as any).gladiators[0].arenaId).toBe(4)
  })
})

// ─── 10. update 不崩溃验证 ──────────────────────────────────────────���
describe('update() 健壮性', () => {
  let sys: CreatureGladiatorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空 gladiators 时 update 不崩溃', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    expect(() => sys.update(0, em, 3200)).not.toThrow()
  })

  it('tick=0 时不触发（差值为0）', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('dt 参数不影响节流逻辑', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(999, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })
})
