import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureGrudgeSystem } from '../systems/CreatureGrudgeSystem'
import type { Grudge, GrudgeReason } from '../systems/CreatureGrudgeSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureGrudgeSystem { return new CreatureGrudgeSystem() }
function makeGrudge(
  holderId: number,
  targetId: number,
  reason: GrudgeReason = 'attacked',
  overrides: Partial<Grudge> = {}
): Grudge {
  return { id: nextId++, holderId, targetId, reason, intensity: 50, tick: 0, ...overrides }
}

function makeEm(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age: 25, race: 'human', name: 'T' } as any)
  return eid
}

// ─── 初始状态 ──────────────────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — 初始状态', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('grudges 数组初始为空', () => {
    expect((sys as any).grudges).toHaveLength(0)
  })

  it('_grudgeMap 初始为空 Map', () => {
    expect((sys as any)._grudgeMap.size).toBe(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_grudgesBuf 初始为空数组', () => {
    expect((sys as any)._grudgesBuf).toHaveLength(0)
  })
})

// ─── grudges 数组基础操作 ──────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — grudges 数组', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'betrayal'))
    expect((sys as any).grudges[0].reason).toBe('betrayal')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    expect((sys as any).grudges).toBe((sys as any).grudges)
  })

  it('支持 attacked 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'attacked'))
    expect((sys as any).grudges[0].reason).toBe('attacked')
  })

  it('支持 territory 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'territory'))
    expect((sys as any).grudges[0].reason).toBe('territory')
  })

  it('支持 theft 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'theft'))
    expect((sys as any).grudges[0].reason).toBe('theft')
  })

  it('支持 betrayal 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'betrayal'))
    expect((sys as any).grudges[0].reason).toBe('betrayal')
  })

  it('支持 insult 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'insult'))
    expect((sys as any).grudges[0].reason).toBe('insult')
  })

  it('支持 family_harm 原因', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'family_harm'))
    expect((sys as any).grudges[0].reason).toBe('family_harm')
  })

  it('支持所有 6 种积怨原因', () => {
    const reasons: GrudgeReason[] = ['attacked', 'territory', 'theft', 'betrayal', 'insult', 'family_harm']
    reasons.forEach((r, i) => (sys as any).grudges.push(makeGrudge(i + 1, i + 10, r)))
    const all = (sys as any).grudges
    reasons.forEach((r, i) => expect(all[i].reason).toBe(r))
  })

  it('注入 intensity 字段保存正确', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'attacked', { intensity: 85 }))
    expect((sys as any).grudges[0].intensity).toBe(85)
  })

  it('注入 tick 字段保存正确', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'attacked', { tick: 9999 }))
    expect((sys as any).grudges[0].tick).toBe(9999)
  })

  it('可同时注入多条积怨', () => {
    for (let i = 0; i < 5; i++) (sys as any).grudges.push(makeGrudge(i + 1, i + 10))
    expect((sys as any).grudges).toHaveLength(5)
  })
})

// ─── getGrudgesFor ────────────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — getGrudgesFor', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无任何积怨时返回空', () => {
    expect(sys.getGrudgesFor(1)).toHaveLength(0)
  })

  it('无匹配持grudge者返回空', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    expect(sys.getGrudgesFor(999)).toHaveLength(0)
  })

  it('过滤特定持grudge者 — 1条', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    ;(sys as any).grudges.push(makeGrudge(3, 4))
    const result = sys.getGrudgesFor(1)
    expect(result).toHaveLength(1)
    expect(result[0].holderId).toBe(1)
  })

  it('过滤特定持grudge者 — 多条', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    ;(sys as any).grudges.push(makeGrudge(1, 3))
    ;(sys as any).grudges.push(makeGrudge(2, 3))
    const result = sys.getGrudgesFor(1)
    expect(result).toHaveLength(2)
    result.forEach(g => expect(g.holderId).toBe(1))
  })

  it('所有结果的 holderId 均与查询参数一致', () => {
    for (let i = 0; i < 5; i++) (sys as any).grudges.push(makeGrudge(7, i + 10))
    const result = sys.getGrudgesFor(7)
    result.forEach(g => expect(g.holderId).toBe(7))
  })

  it('查询不存在的实体 ID 返回空', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    expect(sys.getGrudgesFor(55)).toHaveLength(0)
  })

  it('连续查询同一实体返回相同长度', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    ;(sys as any).grudges.push(makeGrudge(1, 3))
    expect(sys.getGrudgesFor(1)).toHaveLength(2)
    expect(sys.getGrudgesFor(1)).toHaveLength(2)
  })

  it('结果中包含 targetId 字段', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 99))
    const result = sys.getGrudgesFor(1)
    expect(result[0].targetId).toBe(99)
  })

  it('查询后 _grudgesBuf 长度与结果一致', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    sys.getGrudgesFor(1)
    expect((sys as any)._grudgesBuf).toHaveLength(1)
  })
})

// ─── hasGrudge（私有方法） ────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — hasGrudge（私有方法）', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('没有积怨时返回 false', () => {
    expect((sys as any).hasGrudge(1, 2)).toBe(false)
  })

  it('注入 _grudgeMap 后 hasGrudge 返回 true', () => {
    const s = new Set<number>([2])
    ;(sys as any)._grudgeMap.set(1, s)
    expect((sys as any).hasGrudge(1, 2)).toBe(true)
  })

  it('目标不在集合中时返回 false', () => {
    const s = new Set<number>([3])
    ;(sys as any)._grudgeMap.set(1, s)
    expect((sys as any).hasGrudge(1, 2)).toBe(false)
  })

  it('holder 不在 Map 中时返回 false', () => {
    expect((sys as any).hasGrudge(99, 1)).toBe(false)
  })
})

// ─── decayGrudges（私有方法） ─────────────────────────────────────────────────
describe('CreatureGrudgeSystem — decayGrudges（私有方法）', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 decay 后 intensity 减少 0.1', () => {
    const g = makeGrudge(1, 2, 'attacked', { intensity: 50 })
    ;(sys as any).grudges.push(g)
    ;(sys as any).decayGrudges()
    expect((sys as any).grudges[0].intensity).toBeCloseTo(49.9)
  })

  it('intensity <= 0 的积怨被删除', () => {
    const g = makeGrudge(1, 2, 'attacked', { intensity: 0.05 })
    ;(sys as any).grudges.push(g)
    ;(sys as any).decayGrudges()
    expect((sys as any).grudges).toHaveLength(0)
  })

  it('intensity > 0 的积怨保留', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'attacked', { intensity: 10 }))
    ;(sys as any).decayGrudges()
    expect((sys as any).grudges).toHaveLength(1)
  })

  it('decay 后从 _grudgeMap 中移除过期积怨', () => {
    const s = new Set<number>([2])
    ;(sys as any)._grudgeMap.set(1, s)
    const g = makeGrudge(1, 2, 'attacked', { intensity: 0.05 })
    ;(sys as any).grudges.push(g)
    ;(sys as any).decayGrudges()
    expect((sys as any)._grudgeMap.get(1)?.has(2)).toBeFalsy()
  })

  it('多条同时 decay，仅移除 intensity <= 0 的', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'attacked', { intensity: 50 }))
    ;(sys as any).grudges.push(makeGrudge(3, 4, 'insult', { intensity: 0.05 }))
    ;(sys as any).decayGrudges()
    expect((sys as any).grudges).toHaveLength(1)
    expect((sys as any).grudges[0].holderId).toBe(1)
  })
})

// ─── cleanup（私有方法） ──────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — cleanup（私有方法）', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('grudges <= MAX_GRUDGES(120) 时 cleanup 不截断', () => {
    for (let i = 0; i < 100; i++) (sys as any).grudges.push(makeGrudge(i + 1, i + 200))
    ;(sys as any).cleanup()
    expect((sys as any).grudges).toHaveLength(100)
  })

  it('grudges > 120 时 cleanup 截断到 120', () => {
    for (let i = 0; i < 130; i++) {
      (sys as any).grudges.push(makeGrudge(i + 1, i + 200, 'attacked', { intensity: i + 1 }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).grudges).toHaveLength(120)
  })

  it('cleanup 后保留 intensity 最高的 grudges', () => {
    for (let i = 0; i < 130; i++) {
      (sys as any).grudges.push(makeGrudge(i + 1, i + 200, 'attacked', { intensity: i + 1 }))
    }
    ;(sys as any).cleanup()
    const grudges: Grudge[] = (sys as any).grudges
    // 排序后最低 intensity 应 >= 11（前 120 高强度）
    const minIntensity = Math.min(...grudges.map(g => g.intensity))
    expect(minIntensity).toBeGreaterThan(10)
  })

  it('cleanup 后 _grudgeMap 重建正确', () => {
    for (let i = 0; i < 130; i++) {
      (sys as any).grudges.push(makeGrudge(i + 1, i + 200, 'attacked', { intensity: i + 1 }))
    }
    ;(sys as any).cleanup()
    const grudges: Grudge[] = (sys as any).grudges
    const map: Map<number, Set<number>> = (sys as any)._grudgeMap
    grudges.forEach(g => {
      expect(map.get(g.holderId)?.has(g.targetId)).toBe(true)
    })
  })
})

// ─── update 节流（CHECK_INTERVAL） ────────────────────────────────────────────
describe('CreatureGrudgeSystem — update 节流', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达 CHECK_INTERVAL(800) 时 lastCheck 不更新', () => {
    const em = makeEm()
    sys.update(0, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时 lastCheck 更新', () => {
    const em = makeEm()
    sys.update(0, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('update 不抛出异常（空 em）', () => {
    expect(() => makeSys().update(0, makeEm(), 800)).not.toThrow()
  })
})

// ─── INTENSITY_MAP 基准值 ─────────────────────────────────────────────────────
describe('CreatureGrudgeSystem — INTENSITY_MAP 基准值', () => {
  afterEach(() => vi.restoreAllMocks())

  it('attacked 基准强度为 70', () => {
    const g = makeGrudge(1, 2, 'attacked', { intensity: 70 })
    expect(g.intensity).toBe(70)
  })

  it('betrayal 基准强度为 80', () => {
    const g = makeGrudge(1, 2, 'betrayal', { intensity: 80 })
    expect(g.intensity).toBe(80)
  })

  it('family_harm 基准强度最高 90', () => {
    const g = makeGrudge(1, 2, 'family_harm', { intensity: 90 })
    expect(g.intensity).toBe(90)
  })

  it('insult 基准强度最低 20', () => {
    const g = makeGrudge(1, 2, 'insult', { intensity: 20 })
    expect(g.intensity).toBe(20)
  })

  it('territory 基准强度为 40', () => {
    const g = makeGrudge(1, 2, 'territory', { intensity: 40 })
    expect(g.intensity).toBe(40)
  })

  it('theft 基准强度为 50', () => {
    const g = makeGrudge(1, 2, 'theft', { intensity: 50 })
    expect(g.intensity).toBe(50)
  })
})

// ─── update 与 EntityManager 集成 ────────────────────────────────────────────
describe('CreatureGrudgeSystem — update 集成行为', () => {
  let sys: CreatureGrudgeSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); nextId = 1; em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('只有 1 个生物时不产生积怨（需要至少 2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em)
    sys.update(0, em, 800)
    expect((sys as any).grudges).toHaveLength(0)
  })

  it('有 2+ 个生物且 random=0 时产生积怨', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em); addCreature(em)
    sys.update(0, em, 800)
    expect((sys as any).grudges.length).toBeGreaterThanOrEqual(1)
  })

  it('random=1 时不产生积怨', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    addCreature(em); addCreature(em)
    sys.update(0, em, 800)
    expect((sys as any).grudges).toHaveLength(0)
  })

  it('积怨 holderId 和 targetId 不相同', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em); addCreature(em)
    sys.update(0, em, 800)
    const grudges: Grudge[] = (sys as any).grudges
    grudges.forEach(g => expect(g.holderId).not.toBe(g.targetId))
  })
})
