import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EcosystemSystem } from '../systems/EcosystemSystem'
import { WILDLIFE_RULES, MAX_WILDLIFE, SPAWN_INTERVAL } from '../systems/EcosystemData'

function makeSys(): EcosystemSystem { return new EcosystemSystem() }

/** 构造最小的 EntityManager mock */
function makeEm(creatures: Array<{ id: number; species: string; x: number; y: number; hunger?: number; health?: number }> = []) {
  const comps: Record<number, Record<string, unknown>> = {}
  for (const c of creatures) {
    comps[c.id] = {
      position: { type: 'position', x: c.x, y: c.y },
      creature: { type: 'creature', species: c.species, speed: 1, damage: 5, isHostile: false,
                  name: c.species, age: 0, maxAge: 1000, gender: 'male' },
      needs:    { type: 'needs', hunger: c.hunger ?? 20, health: c.health ?? 100 },
      ai:       { type: 'ai', state: 'wandering', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 },
    }
  }
  let nextId = 9000
  const removed = new Set<number>()
  return {
    getEntitiesWithComponents: (..._comps: string[]) =>
      creatures.filter(c => !removed.has(c.id)).map(c => c.id),
    getComponent: <T>(id: number, type: string) => (comps[id]?.[type] as T) ?? null,
    addComponent: vi.fn(),
    createEntity: vi.fn(() => nextId++),
    removeEntity: vi.fn((id: number) => { removed.add(id) }),
    _comps: comps,
    _removed: removed,
  }
}

/** 构造最小的 World mock */
function makeWorld(season: string = 'spring', tileVal: number = 2) {
  return {
    getSeason: vi.fn(() => season),
    getTile: vi.fn(() => tileVal),
  }
}

/** 构造最小的 CivManager mock */
const makeCivManager = () => ({ getCivs: vi.fn(() => []) })

/** 构造最小的 ParticleSystem mock */
const makeParticles = () => ({ addParticle: vi.fn() })

describe('EcosystemSystem — 初始状态', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('ecosystemHealth 初始为 50', () => {
    expect((sys as any).ecosystemHealth).toBe(50)
  })
  it('wildlifeCounts 是 Map 实例', () => {
    expect((sys as any).wildlifeCounts).toBeInstanceOf(Map)
  })
  it('wildlifeCounts 初始为空', () => {
    expect((sys as any).wildlifeCounts.size).toBe(0)
  })
  it('ruleMap 包含所有 WILDLIFE_RULES 物种', () => {
    const ruleMap: Map<string, unknown> = (sys as any).ruleMap
    for (const rule of WILDLIFE_RULES) {
      expect(ruleMap.has(rule.species)).toBe(true)
    }
  })
  it('ruleSets 与 ruleMap 数量相同', () => {
    expect((sys as any).ruleSets.size).toBe((sys as any).ruleMap.size)
  })
  it('每个 species 的 ruleSets 包含 fleeFromSet', () => {
    const ruleSets: Map<string, { fleeFromSet: Set<string> }> = (sys as any).ruleSets
    for (const [, rs] of ruleSets) {
      expect(rs.fleeFromSet).toBeInstanceOf(Set)
    }
  })
  it('每个 species 的 ruleSets 包含 preySet', () => {
    const ruleSets: Map<string, { preySet: Set<string> }> = (sys as any).ruleSets
    for (const [, rs] of ruleSets) {
      expect(rs.preySet).toBeInstanceOf(Set)
    }
  })
  it('每个 species 的 ruleSets 包含 biomeSet', () => {
    const ruleSets: Map<string, { biomeSet: Set<number> }> = (sys as any).ruleSets
    for (const [, rs] of ruleSets) {
      expect(rs.biomeSet).toBeInstanceOf(Set)
    }
  })
  it('_cacheLen 初始为 0', () => {
    expect((sys as any)._cacheLen).toBe(0)
  })
  it('_creatureCacheTick 初始为 -1', () => {
    expect((sys as any)._creatureCacheTick).toBe(-1)
  })
})

describe('EcosystemSystem — ecosystemHealth 边界值', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('手动设置 ecosystemHealth 为 0', () => {
    ;(sys as any).ecosystemHealth = 0
    expect((sys as any).ecosystemHealth).toBe(0)
  })
  it('手动设置 ecosystemHealth 为 100', () => {
    ;(sys as any).ecosystemHealth = 100
    expect((sys as any).ecosystemHealth).toBe(100)
  })
  it('手动设置 ecosystemHealth 为 80', () => {
    ;(sys as any).ecosystemHealth = 80
    expect((sys as any).ecosystemHealth).toBe(80)
  })
  it('calculateHealth: 无野生生物时健康为 0', () => {
    ;(sys as any).wildlifeCounts = new Map()
    ;(sys as any).calculateHealth()
    expect((sys as any).ecosystemHealth).toBe(0)
  })
  it('calculateHealth: 单物种 health 在 0-100 范围内', () => {
    ;(sys as any).wildlifeCounts = new Map([['deer', 10]])
    ;(sys as any).calculateHealth()
    const h = (sys as any).ecosystemHealth
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(100)
  })
  it('calculateHealth: 多物种多样性提升健康', () => {
    const counts = new Map<string, number>()
    for (const r of WILDLIFE_RULES) counts.set(r.species, 5)
    ;(sys as any).wildlifeCounts = counts
    ;(sys as any).calculateHealth()
    expect((sys as any).ecosystemHealth).toBeGreaterThan(0)
  })
  it('calculateHealth: 单物种独占导致较低平衡分', () => {
    ;(sys as any).wildlifeCounts = new Map([['bear', 100]])
    ;(sys as any).calculateHealth()
    const single = (sys as any).ecosystemHealth as number
    const counts2 = new Map<string, number>()
    for (const r of WILDLIFE_RULES) counts2.set(r.species, 10)
    ;(sys as any).wildlifeCounts = counts2
    ;(sys as any).calculateHealth()
    const diverse = (sys as any).ecosystemHealth as number
    expect(diverse).toBeGreaterThanOrEqual(single)
  })
})

describe('EcosystemSystem — wildlifeCounts 注入', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入 deer=15 后读取为 15', () => {
    ;(sys as any).wildlifeCounts.set('deer', 15)
    expect((sys as any).wildlifeCounts.get('deer')).toBe(15)
  })
  it('注入 bear=5 后读取为 5', () => {
    ;(sys as any).wildlifeCounts.set('bear', 5)
    expect((sys as any).wildlifeCounts.get('bear')).toBe(5)
  })
  it('注入多物种后 wildlifeCounts.size 正确', () => {
    ;(sys as any).wildlifeCounts.set('deer', 3)
    ;(sys as any).wildlifeCounts.set('fox', 2)
    expect((sys as any).wildlifeCounts.size).toBe(2)
  })
  it('clear 后 wildlifeCounts 为空', () => {
    ;(sys as any).wildlifeCounts.set('deer', 5)
    ;(sys as any).wildlifeCounts.clear()
    expect((sys as any).wildlifeCounts.size).toBe(0)
  })
})

describe('EcosystemSystem — isWildlife 辅助方法', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('deer 是野生生物', () => {
    expect((sys as any).isWildlife('deer')).toBe(true)
  })
  it('bear 是野生生物', () => {
    expect((sys as any).isWildlife('bear')).toBe(true)
  })
  it('fish 是野生生物', () => {
    expect((sys as any).isWildlife('fish')).toBe(true)
  })
  it('eagle 是野生生物', () => {
    expect((sys as any).isWildlife('eagle')).toBe(true)
  })
  it('rabbit 是野生生物', () => {
    expect((sys as any).isWildlife('rabbit')).toBe(true)
  })
  it('human 不是野生生物', () => {
    expect((sys as any).isWildlife('human')).toBe(false)
  })
  it('dragon 不是野生生物', () => {
    expect((sys as any).isWildlife('dragon')).toBe(false)
  })
  it('空字符串不是野生生物', () => {
    expect((sys as any).isWildlife('')).toBe(false)
  })
  it('WILDLIFE_RULES 所有 species 都是野生生物', () => {
    for (const r of WILDLIFE_RULES) {
      expect((sys as any).isWildlife(r.species)).toBe(true)
    }
  })
})

describe('EcosystemSystem — getTotalWildlife', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无生物时 getTotalWildlife 为 0', () => {
    expect((sys as any).getTotalWildlife()).toBe(0)
  })
  it('注入单物种后 getTotalWildlife 正确', () => {
    ;(sys as any).wildlifeCounts.set('deer', 7)
    expect((sys as any).getTotalWildlife()).toBe(7)
  })
  it('注入多物种后 getTotalWildlife 求和正确', () => {
    ;(sys as any).wildlifeCounts.set('deer', 4)
    ;(sys as any).wildlifeCounts.set('bear', 2)
    ;(sys as any).wildlifeCounts.set('fish', 6)
    expect((sys as any).getTotalWildlife()).toBe(12)
  })
})

describe('EcosystemSystem — flee 逻辑', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('flee 将 ai.state 设为 fleeing', () => {
    const pos = { type: 'position', x: 10, y: 10 }
    const ai = { type: 'ai', state: 'wandering', targetX: 0, targetY: 0, targetEntity: null as null, cooldown: 0 }
    const threat = { type: 'position', x: 5, y: 10 }
    ;(sys as any).flee(pos, ai, threat)
    expect(ai.state).toBe('fleeing')
  })
  it('flee 将 ai.targetEntity 清为 null', () => {
    const pos = { type: 'position', x: 10, y: 10 }
    const ai = { type: 'ai', state: 'wandering', targetX: 0, targetY: 0, targetEntity: 42 as unknown as null, cooldown: 0 }
    const threat = { type: 'position', x: 5, y: 10 }
    ;(sys as any).flee(pos, ai, threat)
    expect(ai.targetEntity).toBeNull()
  })
  it('flee 目标远离威胁方向（x 轴正向）', () => {
    const pos = { type: 'position', x: 10, y: 10 }
    const ai = { type: 'ai', state: 'wandering', targetX: 0, targetY: 0, targetEntity: null as null, cooldown: 0 }
    const threat = { type: 'position', x: 5, y: 10 }
    ;(sys as any).flee(pos, ai, threat)
    expect(ai.targetX).toBeGreaterThan(pos.x)
  })
})

describe('EcosystemSystem — refreshCounts 通过 update 触发', () => {
  let sys: EcosystemSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后 wildlifeCounts 包含 deer', () => {
    const em = makeEm([{ id: 1, species: 'deer', x: 10, y: 10 }])
    const world = makeWorld('summer')
    ;(sys as any).update(em, world, makeCivManager(), makeParticles(), 999)
    expect((sys as any).wildlifeCounts.get('deer')).toBe(1)
  })
  it('update 后 human 不在 wildlifeCounts 中', () => {
    const em = makeEm([{ id: 1, species: 'human', x: 10, y: 10 }])
    const world = makeWorld('summer')
    ;(sys as any).update(em, world, makeCivManager(), makeParticles(), 999)
    expect((sys as any).wildlifeCounts.has('human')).toBe(false)
  })
  it('多个 deer 后 wildlifeCounts 统计正确', () => {
    const em = makeEm([
      { id: 1, species: 'deer', x: 1, y: 1 },
      { id: 2, species: 'deer', x: 2, y: 2 },
      { id: 3, species: 'bear', x: 3, y: 3 },
    ])
    const world = makeWorld('summer')
    ;(sys as any).update(em, world, makeCivManager(), makeParticles(), 999)
    expect((sys as any).wildlifeCounts.get('deer')).toBe(2)
    expect((sys as any).wildlifeCounts.get('bear')).toBe(1)
  })
})

describe('EcosystemSystem — 常量校验', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_WILDLIFE 大于 0', () => {
    expect(MAX_WILDLIFE).toBeGreaterThan(0)
  })
  it('SPAWN_INTERVAL 大于 0', () => {
    expect(SPAWN_INTERVAL).toBeGreaterThan(0)
  })
  it('WILDLIFE_RULES 包含 deer', () => {
    expect(WILDLIFE_RULES.some(r => r.species === 'deer')).toBe(true)
  })
  it('WILDLIFE_RULES 包含 bear', () => {
    expect(WILDLIFE_RULES.some(r => r.species === 'bear')).toBe(true)
  })
  it('bear 是 predator', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.predator).toBe(true)
  })
  it('deer 不是 predator', () => {
    const deer = WILDLIFE_RULES.find(r => r.species === 'deer')!
    expect(deer.predator).toBe(false)
  })
})
