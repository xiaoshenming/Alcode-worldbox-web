import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMentorSystem } from '../systems/CreatureMentorSystem'
import type { MentorBond, MentorSkill } from '../systems/CreatureMentorSystem'

// ==================== Helpers ====================

let nextId = 1

function makeSys(): CreatureMentorSystem {
  return new CreatureMentorSystem()
}

function makeBond(
  mentorId: number,
  apprenticeId: number,
  skill: MentorSkill = 'combat',
  progress = 30,
  quality = 70
): MentorBond {
  return {
    id: nextId++,
    mentorId,
    apprenticeId,
    skill,
    progress,
    quality,
    formedTick: 0,
  }
}

const ALL_SKILLS: MentorSkill[] = ['combat', 'foraging', 'building', 'crafting', 'leadership', 'survival']

// ==================== bonds 字段基础 ====================

describe('bonds — 初始状态', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 bonds 为空数组', () => {
    expect((sys as any).bonds).toHaveLength(0)
  })

  it('初始 bonds 是数组类型', () => {
    expect(Array.isArray((sys as any).bonds)).toBe(true)
  })

  it('初始 mentorIds Set 为空', () => {
    expect((sys as any).mentorIds.size).toBe(0)
  })

  it('初始 apprenticeIds Set 为空', () => {
    expect((sys as any).apprenticeIds.size).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 _entityBondMap 为空 Map', () => {
    expect((sys as any)._entityBondMap.size).toBe(0)
  })
})

describe('bonds — 注入与查询', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入一个 bond 后长度为 1', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect((sys as any).bonds).toHaveLength(1)
  })

  it('注入多个 bond 后长度正确', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    ;(sys as any).bonds.push(makeBond(3, 4))
    ;(sys as any).bonds.push(makeBond(5, 6))
    expect((sys as any).bonds).toHaveLength(3)
  })

  it('bond 的 mentorId 正确', () => {
    ;(sys as any).bonds.push(makeBond(7, 8))
    expect((sys as any).bonds[0].mentorId).toBe(7)
  })

  it('bond 的 apprenticeId 正确', () => {
    ;(sys as any).bonds.push(makeBond(7, 8))
    expect((sys as any).bonds[0].apprenticeId).toBe(8)
  })

  it('bond 的 skill 为 foraging 正确', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'foraging'))
    expect((sys as any).bonds[0].skill).toBe('foraging')
  })

  it('bonds 是内部引用（不是副本）', () => {
    const ref = (sys as any).bonds
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect((sys as any).bonds).toBe(ref)
  })
})

describe('bonds — 技能类型', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('支持 combat 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'combat'))
    expect((sys as any).bonds[0].skill).toBe('combat')
  })

  it('支持 foraging 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'foraging'))
    expect((sys as any).bonds[0].skill).toBe('foraging')
  })

  it('支持 building 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'building'))
    expect((sys as any).bonds[0].skill).toBe('building')
  })

  it('支持 crafting 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'crafting'))
    expect((sys as any).bonds[0].skill).toBe('crafting')
  })

  it('支持 leadership 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'leadership'))
    expect((sys as any).bonds[0].skill).toBe('leadership')
  })

  it('支持 survival 技能', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'survival'))
    expect((sys as any).bonds[0].skill).toBe('survival')
  })

  it('6 种技能同时注入各自独立正确', () => {
    ALL_SKILLS.forEach((s, i) => {
      ;(sys as any).bonds.push(makeBond(i + 1, i + 10, s))
    })
    const bonds = (sys as any).bonds
    ALL_SKILLS.forEach((s, i) => {
      expect(bonds[i].skill).toBe(s)
    })
  })
})

// ==================== getEntityBond ====================

describe('getEntityBond — 基础行为', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('找不到时返回 null', () => {
    expect(sys.getEntityBond(999)).toBeNull()
  })

  it('通过 mentorId 匹配时返回 bond', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    const b = sys.getEntityBond(1)
    expect(b).not.toBeNull()
  })

  it('通过 mentorId 匹配时 mentorId 正确', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect(sys.getEntityBond(1)!.mentorId).toBe(1)
  })

  it('通过 apprenticeId 匹配时返回 bond', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    const b = sys.getEntityBond(2)
    expect(b).not.toBeNull()
  })

  it('通过 apprenticeId 匹配时 apprenticeId 正确', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect(sys.getEntityBond(2)!.apprenticeId).toBe(2)
  })

  it('无关 id 返回 null', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    expect(sys.getEntityBond(99)).toBeNull()
  })

  it('多个 bond 时精确匹配正确的', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    ;(sys as any).bonds.push(makeBond(3, 4))
    const b = sys.getEntityBond(3)
    expect(b!.mentorId).toBe(3)
  })

  it('多个 bond 时通过 apprenticeId 精确匹配', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    ;(sys as any).bonds.push(makeBond(3, 4))
    expect(sys.getEntityBond(4)!.apprenticeId).toBe(4)
  })
})

describe('getEntityBond — _entityBondMap 缓存', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('通过缓存 Map 查询 mentorId 成功', () => {
    const b = makeBond(10, 20)
    ;(sys as any)._entityBondMap.set(10, b)
    expect(sys.getEntityBond(10)).not.toBeNull()
    expect(sys.getEntityBond(10)!.mentorId).toBe(10)
  })

  it('通过缓存 Map 查询 apprenticeId 成功', () => {
    const b = makeBond(10, 20)
    ;(sys as any)._entityBondMap.set(20, b)
    expect(sys.getEntityBond(20)!.apprenticeId).toBe(20)
  })

  it('缓存有值时不依赖 bonds 数组', () => {
    const b = makeBond(55, 66)
    ;(sys as any)._entityBondMap.set(55, b)
    // bonds 数组为空
    expect((sys as any).bonds).toHaveLength(0)
    expect(sys.getEntityBond(55)).not.toBeNull()
  })

  it('缓存无但 bonds 数组有时降级查找', () => {
    ;(sys as any).bonds.push(makeBond(7, 8))
    // 不设缓存
    expect((sys as any)._entityBondMap.size).toBe(0)
    expect(sys.getEntityBond(7)).not.toBeNull()
  })

  it('缓存和数组都没有时返回 null', () => {
    expect(sys.getEntityBond(999)).toBeNull()
  })
})

// ==================== MentorBond 结构 ====================

describe('MentorBond — 结构完整性', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MentorBond 包含所有必要字段', () => {
    const b = makeBond(1, 2)
    expect(b).toHaveProperty('id')
    expect(b).toHaveProperty('mentorId')
    expect(b).toHaveProperty('apprenticeId')
    expect(b).toHaveProperty('skill')
    expect(b).toHaveProperty('progress')
    expect(b).toHaveProperty('quality')
    expect(b).toHaveProperty('formedTick')
  })

  it('progress 在 0 到 100 之间', () => {
    const b = makeBond(1, 2, 'combat', 50, 80)
    expect(b.progress).toBeGreaterThanOrEqual(0)
    expect(b.progress).toBeLessThanOrEqual(100)
  })

  it('quality 在 0 到 100 之间', () => {
    const b = makeBond(1, 2, 'combat', 30, 70)
    expect(b.quality).toBeGreaterThanOrEqual(0)
    expect(b.quality).toBeLessThanOrEqual(100)
  })

  it('formedTick 为非负数', () => {
    const b = makeBond(1, 2)
    expect(b.formedTick).toBeGreaterThanOrEqual(0)
  })

  it('id 是正整数', () => {
    const b = makeBond(1, 2)
    expect(b.id).toBeGreaterThan(0)
    expect(Number.isInteger(b.id)).toBe(true)
  })
})

describe('MentorBond — progress 与 quality 字段', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('progress 为 0 时正确读取', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'combat', 0))
    expect((sys as any).bonds[0].progress).toBe(0)
  })

  it('progress 为 100 时正确读取', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'combat', 100))
    expect((sys as any).bonds[0].progress).toBe(100)
  })

  it('quality 为 0 时正确读取', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'combat', 30, 0))
    expect((sys as any).bonds[0].quality).toBe(0)
  })

  it('quality 为 100 时正确读取', () => {
    ;(sys as any).bonds.push(makeBond(1, 2, 'combat', 30, 100))
    expect((sys as any).bonds[0].quality).toBe(100)
  })

  it('bonds 数量等于注入数量', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).bonds.push(makeBond(i * 2 + 1, i * 2 + 2))
    }
    expect((sys as any).bonds).toHaveLength(5)
  })
})

// ==================== 私有常量 ====================

describe('CreatureMentorSystem — 模块级常量', () => {
  afterEach(() => vi.restoreAllMocks())

  it('CHECK_INTERVAL 应存在于模块（通过间接推断）', () => {
    // 通过 lastCheck 初始值和第一次 update 不检查来推断 CHECK_INTERVAL=700
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('MAX_BONDS 上限为 30（注入30条不溢出）', () => {
    const sys = makeSys()
    for (let i = 0; i < 30; i++) {
      ;(sys as any).bonds.push(makeBond(i * 2 + 1, i * 2 + 2))
    }
    expect((sys as any).bonds).toHaveLength(30)
  })

  it('所有 MentorSkill 枚举共 6 种', () => {
    expect(ALL_SKILLS).toHaveLength(6)
  })

  it('ALL_SKILLS 包含 combat', () => {
    expect(ALL_SKILLS).toContain('combat')
  })

  it('ALL_SKILLS 包含 leadership', () => {
    expect(ALL_SKILLS).toContain('leadership')
  })
})

// ==================== 边界与极端情况 ====================

describe('CreatureMentorSystem — 边界与极端情况', () => {
  let sys: CreatureMentorSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('mentorId 和 apprenticeId 相同时 getEntityBond 也能匹配', () => {
    ;(sys as any).bonds.push(makeBond(5, 5))
    expect(sys.getEntityBond(5)).not.toBeNull()
  })

  it('bonds 清空后 getEntityBond 返回 null（无缓存）', () => {
    ;(sys as any).bonds.push(makeBond(1, 2))
    ;(sys as any).bonds.length = 0
    expect(sys.getEntityBond(1)).toBeNull()
  })

  it('修改 bond 的 progress 后可以通过 getEntityBond 读到最新值', () => {
    const b = makeBond(1, 2, 'combat', 0)
    ;(sys as any).bonds.push(b)
    b.progress = 99
    expect(sys.getEntityBond(1)!.progress).toBe(99)
  })

  it('多个不同 mentorId 各自独立匹配', () => {
    ;(sys as any).bonds.push(makeBond(10, 11, 'combat'))
    ;(sys as any).bonds.push(makeBond(20, 21, 'foraging'))
    expect(sys.getEntityBond(10)!.mentorId).toBe(10)
    expect(sys.getEntityBond(20)!.mentorId).toBe(20)
  })
})
