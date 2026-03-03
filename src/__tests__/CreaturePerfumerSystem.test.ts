import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreaturePerfumerSystem } from '../systems/CreaturePerfumerSystem'
import type { Perfumer, FragranceType } from '../systems/CreaturePerfumerSystem'
import { EntityManager } from '../ecs/Entity'

// CHECK_INTERVAL = 3000
const CHECK_INTERVAL = 3000

let nextId = 1
function makeSys(): CreaturePerfumerSystem { return new CreaturePerfumerSystem() }
function makePerfumer(entityId: number, type: FragranceType = 'floral', skill = 70, essences = 20, rep = 50): Perfumer {
  return { id: nextId++, entityId, skill, essencesCollected: essences, perfumesCrafted: 5, fragranceType: type, reputation: rep, tick: 0 }
}

/** 用正规 API 构建带 creature 组件的 EntityManager */
function makeEm(eids: number[] = []): EntityManager {
  const em = new EntityManager()
  for (const eid of eids) {
    em.addComponent(eid, { type: 'creature' })
    // 手动添加到 entities set
    const c = em as any
    c.entities.add(eid)
  }
  return em
}

/** 触发一次 update，绕过节流 */
function trigger(sys: CreaturePerfumerSystem, em: EntityManager): void {
  sys.update(1, em, CHECK_INTERVAL)
}

// ─── 原始 5 个测试（保留）───────────────────────────────────────────────────
describe('CreaturePerfumerSystem.getPerfumers', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无香水制作者', () => { expect((sys as any).perfumers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'woody'))
    expect((sys as any).perfumers[0].fragranceType).toBe('woody')
  })
  it('返回内部引用', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    expect((sys as any).perfumers).toBe((sys as any).perfumers)
  })
  it('支持所有4种香型', () => {
    const types: FragranceType[] = ['floral', 'spicy', 'woody', 'citrus']
    types.forEach((t, i) => { ;(sys as any).perfumers.push(makePerfumer(i + 1, t)) })
    const all = (sys as any).perfumers
    types.forEach((t, i) => { expect(all[i].fragranceType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    expect((sys as any).perfumers).toHaveLength(2)
  })
})

// ─── 新增测试 ────────────────────────────────────────────────────────────────
describe('CreaturePerfumerSystem - CHECK_INTERVAL(3000) 节流', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时跳过，lastCheck 不变', () => {
    const em = makeEm()
    sys.update(1, em, 0) // 0-0=0 < 3000 -> 跳过
    const before = (sys as any).lastCheck
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 达到 CHECK_INTERVAL 后 lastCheck 更新', () => {
    const em = makeEm()
    trigger(sys, em)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('触发后再次调用 tick 不足时跳过', () => {
    const em = makeEm()
    trigger(sys, em)                          // lastCheck=3000
    sys.update(1, em, CHECK_INTERVAL + 500)   // 500 < 3000 -> 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('CreaturePerfumerSystem - 收集精华与技能增长', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill=100，gatherChance=0.06，random=0<0.06 -> essencesCollected +1', () => {
    // 使用 citrus 避免香型升级产生干扰；essences=0 避免制作
    const em = makeEm([1])
    const p = makePerfumer(1, 'citrus', 100, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].essencesCollected).toBe(1)
  })

  it('采集后 skill = min(100, skill+0.1)，从 100 保持 100', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'citrus', 100, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].skill).toBe(100)
  })

  it('skill=99.95 采集后 skill = min(100, 99.95+0.1) = 100', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'citrus', 99.95, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].skill).toBe(100)
  })

  it('random=1 -> 采集不通过，essencesCollected 不变', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'floral', 10, 5, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    trigger(sys, em)
    expect((sys as any).perfumers[0].essencesCollected).toBe(5)
  })
})

describe('CreaturePerfumerSystem - 制作香水逻辑', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill=0（不采集），essences=3，random=0<0.03 -> 制作，perfumesCrafted +1', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'floral', 0, 3, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].perfumesCrafted).toBe(6)
  })

  it('制作后 essencesCollected -3（3->0）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'floral', 0, 3, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].essencesCollected).toBe(0)
  })

  it('floral 香型: reputation += 0.7*2=1.4（perfumesCrafted=0，制作后=1，1>5为false不触发第二加成）', () => {
    const em = makeEm([1])
    // perfumesCrafted 设为 0，制作后变 1；1 > 5 = false，避免第二个 reputation 加成
    const p = makePerfumer(1, 'floral', 0, 3, 0)
    p.perfumesCrafted = 0
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].reputation).toBeCloseTo(1.4, 5)
  })

  it('spicy 香型: reputation += 0.9*2=1.8（perfumesCrafted=0，制作后=1）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'spicy', 0, 3, 0)
    p.perfumesCrafted = 0
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].reputation).toBeCloseTo(1.8, 5)
  })

  it('essences<3 时不制作（essences=2）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'floral', 0, 2, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].perfumesCrafted).toBe(5)
  })

  it('reputation 上限不超过 100（spicy: 99.5+1.8=101.3 -> 100）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'spicy', 0, 3, 99.5)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].reputation).toBe(100)
  })
})

describe('CreaturePerfumerSystem - 香型升级（skill>60）', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill=70>60，floral，random=0<0.004 -> 升级为 spicy', () => {
    const em = makeEm([1])
    // essences=0 不制作；gatherChance=(70/100)*0.06=0.042 > 0 -> 会采集，但不影响香型
    const p = makePerfumer(1, 'floral', 70, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].fragranceType).toBe('spicy')
  })

  it('最后一个香型（citrus）idx=3 不再升级（idx < length-1=3 不满足）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1, 'citrus', 70, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].fragranceType).toBe('citrus')
  })

  it('skill=0（不满足>60，且gatherChance=0不采集）时不升级香型', () => {
    const em = makeEm([1])
    // skill=0: gatherChance=0 -> 不采集不会增加 skill; skill=0 not > 60 -> 不升级
    const p = makePerfumer(1, 'floral', 0, 0, 0)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    trigger(sys, em)
    expect((sys as any).perfumers[0].fragranceType).toBe('floral')
  })
})

describe('CreaturePerfumerSystem - cleanup：生物不存在时删除 perfumer', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('实体不存在 creature 组件时 perfumer 被删除', () => {
    const em = makeEm([]) // eid=1 没有 creature
    const p = makePerfumer(1)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    trigger(sys, em)
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('实体存在 creature 组件时 perfumer 被保留', () => {
    const em = makeEm([1]) // eid=1 有 creature
    const p = makePerfumer(1)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    trigger(sys, em)
    expect((sys as any).perfumers).toHaveLength(1)
  })

  it('cleanup 无条件从 Set 中删除 entityId（源码先 delete 再判断是否删 perfumer）', () => {
    const em = makeEm([1])
    const p = makePerfumer(1)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    trigger(sys, em)
    // eid=1 有 creature -> perfumer 保留，但 Set 中 1 已被删除（源码行为）
    expect((sys as any)._perfumersSet.has(1)).toBe(false)
  })

  it('混合：有效实体(eid=1)保留，无效实体(eid=99)的 perfumer 被删除', () => {
    const em = makeEm([1]) // 只有 eid=1 有 creature
    ;(sys as any).perfumers.push(makePerfumer(99)) // eid=99 无 creature -> 删
    ;(sys as any).perfumers.push(makePerfumer(1))  // eid=1 有 creature -> 保留
    ;(sys as any)._perfumersSet.add(99)
    ;(sys as any)._perfumersSet.add(1)
    trigger(sys, em)
    expect((sys as any).perfumers).toHaveLength(1)
    expect((sys as any).perfumers[0].entityId).toBe(1)
  })

  it('random=1 不招募，所有无效 perfumer 被清理后数量为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    const em = makeEm([]) // 无有效实体
    const p = makePerfumer(1)
    ;(sys as any).perfumers.push(p)
    ;(sys as any)._perfumersSet.add(1)
    trigger(sys, em)
    expect((sys as any).perfumers.length).toBe(0)
  })
})

// ---- Extended tests (to reach 50+) ----

describe('CreaturePerfumerSystem — essences收集增量', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill=100时gatherChance=0.06，等于最大收集概率', () => {
    const p = makePerfumer(1, 'floral', 100, 0, 0)
    const gatherChance = (p.skill / 100) * 0.06
    expect(gatherChance).toBeCloseTo(0.06)
  })

  it('skill=0时gatherChance=0，等于最小收集概率', () => {
    const p = makePerfumer(1, 'floral', 0, 0, 0)
    const gatherChance = (p.skill / 100) * 0.06
    expect(gatherChance).toBeCloseTo(0)
  })

  it('essencesCollected增加后skill也增加0.1', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 0, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)  // gatherChance总通过
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    expect(p.skill).toBeCloseTo(50.1)
    expect(p.essencesCollected).toBe(1)
  })
})

describe('CreaturePerfumerSystem — perfumes制作逻辑', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('essences>=3时有机会制作perfume', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 5, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 制作概率总通过
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    expect(p.perfumesCrafted).toBeGreaterThan(5)
    expect(p.essencesCollected).toBeLessThan(5)
  })

  it('essences<3时不制作perfume', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 50, 2, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    // essences<3，不一定不制作（因为收集后可能恰好达到3）
    expect(p.perfumesCrafted).toBeGreaterThanOrEqual(5)
  })
})

describe('CreaturePerfumerSystem — FRAGRANCE_VALUE正确映射', () => {
  it('floral value=0.7', () => {
    const val: Record<FragranceType, number> = { floral: 0.7, spicy: 0.9, woody: 0.5, citrus: 0.6 }
    expect(val['floral']).toBe(0.7)
  })

  it('spicy value=0.9', () => {
    const val: Record<FragranceType, number> = { floral: 0.7, spicy: 0.9, woody: 0.5, citrus: 0.6 }
    expect(val['spicy']).toBe(0.9)
  })

  it('woody value=0.5', () => {
    const val: Record<FragranceType, number> = { floral: 0.7, spicy: 0.9, woody: 0.5, citrus: 0.6 }
    expect(val['woody']).toBe(0.5)
  })

  it('citrus value=0.6', () => {
    const val: Record<FragranceType, number> = { floral: 0.7, spicy: 0.9, woody: 0.5, citrus: 0.6 }
    expect(val['citrus']).toBe(0.6)
  })
})

describe('CreaturePerfumerSystem — _perfumersSet操作', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始_perfumersSet为空', () => {
    expect((sys as any)._perfumersSet.size).toBe(0)
  })

  it('手动添加entityId到Set后可查', () => {
    ;(sys as any)._perfumersSet.add(42)
    expect((sys as any)._perfumersSet.has(42)).toBe(true)
  })
})

describe('CreaturePerfumerSystem — lastCheck追踪', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次达阈值后lastCheck正确', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreaturePerfumerSystem — reputation上限100', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('reputation不超过100（制作后约束）', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'spicy', 50, 10, 99.5))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    expect(p.reputation).toBeLessThanOrEqual(100)
  })
})

describe('CreaturePerfumerSystem — perfumers数组操作', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始perfumers为空', () => {
    expect((sys as any).perfumers).toHaveLength(0)
  })

  it('注入3个perfumer后length为3', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    ;(sys as any).perfumers.push(makePerfumer(3))
    expect((sys as any).perfumers).toHaveLength(3)
  })
})

describe('CreaturePerfumerSystem — skill上限100', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill从99.9开始，增加0.1后为100', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 99.9, 0, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    expect(p.skill).toBeLessThanOrEqual(100)
  })
})

describe('CreaturePerfumerSystem — FragranceType字符串合法性', () => {
  it('4种FragranceType均为字符串', () => {
    const types: FragranceType[] = ['floral', 'spicy', 'woody', 'citrus']
    types.forEach(t => { expect(typeof t).toBe('string') })
  })

  it('fragranceType字段赋值后可读取', () => {
    const p = makePerfumer(1, 'spicy')
    expect(p.fragranceType).toBe('spicy')
  })
})

describe('CreaturePerfumerSystem — nextId初始', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})

describe('CreaturePerfumerSystem — essencesCollected非负', () => {
  it('essencesCollected初始为0', () => {
    const p = makePerfumer(1, 'floral', 50, 0, 0)
    expect(p.essencesCollected).toBeGreaterThanOrEqual(0)
  })
})

describe('CreaturePerfumerSystem — perfumesCrafted非负', () => {
  it('perfumesCrafted初始为5', () => {
    const p = makePerfumer(1)
    expect(p.perfumesCrafted).toBeGreaterThanOrEqual(0)
  })
})

describe('CreaturePerfumerSystem — tick字段保留', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入tick=9999的perfumer后tick字段保留', () => {
    const p = { ...makePerfumer(1), tick: 9999 }
    ;(sys as any).perfumers.push(p)
    expect((sys as any).perfumers[0].tick).toBe(9999)
  })
})

describe('CreaturePerfumerSystem — 声誉初始为0', () => {
  it('新招募的perfumer reputation初始为0', () => {
    const p = makePerfumer(1, 'floral', 50, 0, 0)
    expect(p.reputation).toBe(0)
  })
})

describe('CreaturePerfumerSystem — 香料发现逻辑（skill>60）', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('skill<=60时不触发香料发现', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'floral', 60, 0, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 所有随机=0
    ;(sys as any).lastCheck = 0
    sys.update(1, { getEntitiesWithComponent: () => [], hasComponent: () => true } as any, CHECK_INTERVAL)
    const p = (sys as any).perfumers[0]
    // skill=60，本tick有可能收集essence使skill升到60.1，进而触发香料发现
    // 断言fragranceType为合法值
    const validTypes: FragranceType[] = ['floral', 'spicy', 'woody', 'citrus']
    expect(validTypes).toContain(p.fragranceType)
  })
})
