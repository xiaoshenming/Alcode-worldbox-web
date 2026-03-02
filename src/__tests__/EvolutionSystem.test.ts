import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EvolutionSystem } from '../systems/EvolutionSystem'
import type { EvolutionTrait, SpeciesEvolution } from '../systems/EvolutionSystem'
import { TileType } from '../utils/Constants'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSys(): EvolutionSystem { return new EvolutionSystem() }

function makeTrait(overrides: Partial<EvolutionTrait> = {}): EvolutionTrait {
  return {
    name: 'Mountain Hardy',
    description: 'Adapted to high altitudes',
    effect: 'health_boost',
    magnitude: 0.2,
    source: 'environment',
    ...overrides,
  }
}

function makeSpeciesData(species: string = 'human', overrides: Partial<SpeciesEvolution> = {}): SpeciesEvolution {
  return {
    species,
    traits: new Map(),
    deathCauses: { combat: 0, hunger: 0, disease: 0, age: 0, disaster: 0 },
    generation: 0,
    adaptationProgress: new Map(),
    ...overrides,
  }
}

/** 创建 EntityManager mock */
function makeEM(opts: {
  creatureIds?: number[]
  components?: Map<number, Record<string, unknown>>
} = {}) {
  const { creatureIds = [], components = new Map() } = opts
  return {
    getEntitiesWithComponents: vi.fn((...types: string[]) => creatureIds),
    getComponent: vi.fn((id: number, type: string) => components.get(id)?.[type] as any ?? undefined),
    hasComponent: vi.fn((id: number, type: string) => components.get(id)?.[type] !== undefined),
  }
}

/** 创建带指定地形的 World mock */
function makeWorld(tile: TileType = TileType.GRASS, w = 100, h = 100) {
  const tiles: TileType[][] = Array.from({ length: h }, () => Array(w).fill(tile))
  return { tiles, width: w, height: h }
}

// ── describe: 初始状态 ─────────────────────────────────────────────────────

describe('EvolutionSystem 初始状态', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('新实例 speciesData 为空', () => {
    expect((sys as any).speciesData.size).toBe(0)
  })

  it('tickCounter 初始为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('getSpeciesTraits 未知物种返回空数组', () => {
    expect(sys.getSpeciesTraits('unknown')).toHaveLength(0)
  })

  it('recordDeath 可为未知物种自动创建 speciesData', () => {
    sys.recordDeath('orc', 'combat')
    expect((sys as any).speciesData.has('orc')).toBe(true)
  })

  it('静态方法 hasEvolutionTrait 对未注册实体返回 false', () => {
    expect(EvolutionSystem.hasEvolutionTrait(9999, 'Mountain Hardy')).toBe(false)
  })
})

// ── describe: getSpeciesTraits ────────────────────────────────────────────

describe('EvolutionSystem.getSpeciesTraits', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('未知物种返回空数组', () => {
    expect(sys.getSpeciesTraits('nonexistent')).toEqual([])
  })

  it('adaptationProgress 未达到阈值时不返回特性', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['mountain', 999]]) })
    ;(sys as any).speciesData.set('human', data)
    expect(sys.getSpeciesTraits('human')).toHaveLength(0)
  })

  it('adaptationProgress 达到1000时返回对应特性', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['mountain', 1000]]) })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.some(t => t.name === 'Mountain Hardy')).toBe(true)
  })

  it('forest 适应达到阈值时返回 Forest Stealth', () => {
    const data = makeSpeciesData('elf', { adaptationProgress: new Map([['forest', 1000]]) })
    ;(sys as any).speciesData.set('elf', data)
    const traits = sys.getSpeciesTraits('elf')
    expect(traits.some(t => t.name === 'Forest Stealth')).toBe(true)
  })

  it('sand 适应达到阈值时返回 Desert Endurance', () => {
    const data = makeSpeciesData('dwarf', { adaptationProgress: new Map([['sand', 1000]]) })
    ;(sys as any).speciesData.set('dwarf', data)
    const traits = sys.getSpeciesTraits('dwarf')
    expect(traits.some(t => t.name === 'Desert Endurance')).toBe(true)
  })

  it('snow 适应达到阈值时返回 Frost Resistant', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['snow', 1000]]) })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.some(t => t.name === 'Frost Resistant')).toBe(true)
  })

  it('water 适应达到阈值时返回 Aquatic', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['water', 1000]]) })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.some(t => t.name === 'Aquatic')).toBe(true)
  })

  it('自然选择特性（traits Map 中有记录）也被返回', () => {
    const data = makeSpeciesData('orc', {
      traits: new Map([['Battle Hardened', { count: 5, total: 10 }]]),
    })
    ;(sys as any).speciesData.set('orc', data)
    const traits = sys.getSpeciesTraits('orc')
    expect(traits.some(t => t.name === 'Battle Hardened')).toBe(true)
  })

  it('Efficient Metabolism 自然选择特性返回', () => {
    const data = makeSpeciesData('human', {
      traits: new Map([['Efficient Metabolism', { count: 3, total: 10 }]]),
    })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.some(t => t.name === 'Efficient Metabolism')).toBe(true)
  })

  it('Disease Resistant 自然选择特性返回', () => {
    const data = makeSpeciesData('human', {
      traits: new Map([['Disease Resistant', { count: 0, total: 0 }]]),
    })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    expect(traits.some(t => t.name === 'Disease Resistant')).toBe(true)
  })

  it('返回的 trait 对象有 effect 属性', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['mountain', 1000]]) })
    ;(sys as any).speciesData.set('human', data)
    const traits = sys.getSpeciesTraits('human')
    for (const t of traits) {
      expect(t).toHaveProperty('effect')
    }
  })

  it('_traitsBuf 每次调用被重置', () => {
    const data = makeSpeciesData('human', { adaptationProgress: new Map([['mountain', 1000]]) })
    ;(sys as any).speciesData.set('human', data)
    sys.getSpeciesTraits('human')
    sys.getSpeciesTraits('human')
    // 不应该累计叠加 trait
    const traits = sys.getSpeciesTraits('human')
    expect(traits).toHaveLength(1) // 只有 mountain
  })
})

// ── describe: recordDeath ─────────────────────────────────────────────────

describe('EvolutionSystem.recordDeath', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('记录 combat 死亡', () => {
    sys.recordDeath('human', 'combat')
    const data = (sys as any).speciesData.get('human') as SpeciesEvolution
    expect(data.deathCauses.combat).toBe(1)
  })

  it('记录 hunger 死亡', () => {
    sys.recordDeath('human', 'hunger')
    const data = (sys as any).speciesData.get('human') as SpeciesEvolution
    expect(data.deathCauses.hunger).toBe(1)
  })

  it('记录 disease 死亡', () => {
    sys.recordDeath('human', 'disease')
    const data = (sys as any).speciesData.get('human') as SpeciesEvolution
    expect(data.deathCauses.disease).toBe(1)
  })

  it('记录 age 死亡', () => {
    sys.recordDeath('orc', 'age')
    const data = (sys as any).speciesData.get('orc') as SpeciesEvolution
    expect(data.deathCauses.age).toBe(1)
  })

  it('记录 disaster 死亡', () => {
    sys.recordDeath('elf', 'disaster')
    const data = (sys as any).speciesData.get('elf') as SpeciesEvolution
    expect(data.deathCauses.disaster).toBe(1)
  })

  it('多次记录累计', () => {
    for (let i = 0; i < 5; i++) sys.recordDeath('human', 'combat')
    const data = (sys as any).speciesData.get('human') as SpeciesEvolution
    expect(data.deathCauses.combat).toBe(5)
  })

  it('新物种自动创建 speciesData', () => {
    sys.recordDeath('newSpecies', 'age')
    expect((sys as any).speciesData.has('newSpecies')).toBe(true)
  })

  it('不同物种死亡计数独立', () => {
    sys.recordDeath('human', 'combat')
    sys.recordDeath('orc', 'hunger')
    const human = (sys as any).speciesData.get('human') as SpeciesEvolution
    const orc = (sys as any).speciesData.get('orc') as SpeciesEvolution
    expect(human.deathCauses.combat).toBe(1)
    expect(human.deathCauses.hunger).toBe(0)
    expect(orc.deathCauses.hunger).toBe(1)
    expect(orc.deathCauses.combat).toBe(0)
  })
})

// ── describe: checkNaturalSelection ──────────────────────────────────────

describe('EvolutionSystem.checkNaturalSelection', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('combat 死亡达到20次时解锁 Battle Hardened', () => {
    const data = makeSpeciesData('orc', { deathCauses: { combat: 20, hunger: 0, disease: 0, age: 0, disaster: 0 } })
    ;(sys as any).speciesData.set('orc', data)
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.traits.has('Battle Hardened')).toBe(true)
  })

  it('hunger 死亡达到20次时解锁 Efficient Metabolism', () => {
    const data = makeSpeciesData('human', { deathCauses: { combat: 0, hunger: 20, disease: 0, age: 0, disaster: 0 } })
    ;(sys as any).speciesData.set('human', data)
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.traits.has('Efficient Metabolism')).toBe(true)
  })

  it('disease 死亡达到20次时解锁 Disease Resistant', () => {
    const data = makeSpeciesData('elf', { deathCauses: { combat: 0, hunger: 0, disease: 20, age: 0, disaster: 0 } })
    ;(sys as any).speciesData.set('elf', data)
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.traits.has('Disease Resistant')).toBe(true)
  })

  it('死亡不足20次不解锁特性', () => {
    const data = makeSpeciesData('human', { deathCauses: { combat: 19, hunger: 0, disease: 0, age: 0, disaster: 0 } })
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.traits.has('Battle Hardened')).toBe(false)
  })

  it('解锁后死亡计数重置为0', () => {
    const data = makeSpeciesData('human', { deathCauses: { combat: 20, hunger: 0, disease: 0, age: 0, disaster: 0 } })
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.deathCauses.combat).toBe(0)
  })

  it('特性已存在时不重复触发', () => {
    const data = makeSpeciesData('human', {
      deathCauses: { combat: 20, hunger: 0, disease: 0, age: 0, disaster: 0 },
      traits: new Map([['Battle Hardened', { count: 3, total: 10 }]]),
    })
    ;(sys as any).checkNaturalSelection(data, 100)
    // trait already exists, still only 1 entry
    expect(data.traits.has('Battle Hardened')).toBe(true)
    expect(data.traits.size).toBe(1)
  })

  it('三种死亡因素可同时触发', () => {
    const data = makeSpeciesData('human', {
      deathCauses: { combat: 20, hunger: 20, disease: 20, age: 0, disaster: 0 },
    })
    ;(sys as any).checkNaturalSelection(data, 100)
    expect(data.traits.has('Battle Hardened')).toBe(true)
    expect(data.traits.has('Efficient Metabolism')).toBe(true)
    expect(data.traits.has('Disease Resistant')).toBe(true)
  })
})

// ── describe: 静态查询方法 ────────────────────────────────────────────────

describe('EvolutionSystem 静态查询方法', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('hasEvolutionTrait 无特性时返回 false', () => {
    expect(EvolutionSystem.hasEvolutionTrait(1, 'Mountain Hardy')).toBe(false)
  })

  it('getHungerMultiplier 无特性时返回 1.0', () => {
    expect(EvolutionSystem.getHungerMultiplier(1)).toBe(1.0)
  })

  it('hasFrostImmunity 无特性时返回 false', () => {
    expect(EvolutionSystem.hasFrostImmunity(1)).toBe(false)
  })

  it('isAquatic 无特性时返回 false', () => {
    expect(EvolutionSystem.isAquatic(1)).toBe(false)
  })

  it('getDefenseBonus 无特性时返回 0', () => {
    expect(EvolutionSystem.getDefenseBonus(1)).toBe(0)
  })

  it('getDiseaseResistance 无特性时返回 0', () => {
    expect(EvolutionSystem.getDiseaseResistance(1)).toBe(0)
  })

  it('getStealthBonus 无特性时返回 0', () => {
    expect(EvolutionSystem.getStealthBonus(1)).toBe(0)
  })
})

// ── describe: applyTraitsToCreature ──────────────────────────────────────

describe('EvolutionSystem.applyTraitsToCreature', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无 creature 组件时不崩溃', () => {
    const em = makeEM()
    expect(() => sys.applyTraitsToCreature(1, em as any)).not.toThrow()
  })

  it('无 speciesData 时不崩溃', () => {
    const creature = { type: 'creature', species: 'unknown', speed: 1, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const em = makeEM({ creatureIds: [1], components: new Map([[1, { creature }]]) })
    expect(() => sys.applyTraitsToCreature(1, em as any)).not.toThrow()
  })

  it('health_boost 特性增加 needs.health', () => {
    const creature = { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const needs = { type: 'needs', hunger: 0, health: 50 }
    const em = makeEM({
      creatureIds: [1],
      components: new Map([[1, { creature, needs }]]),
    })
    const data = makeSpeciesData('human', {
      adaptationProgress: new Map([['mountain', 1000]]),
    })
    ;(sys as any).speciesData.set('human', data)
    sys.applyTraitsToCreature(1, em as any)
    expect(needs.health).toBeGreaterThan(50)
  })

  it('health_boost 后 health 不超过100', () => {
    const creature = { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const needs = { type: 'needs', hunger: 0, health: 99 }
    const em = makeEM({
      creatureIds: [1],
      components: new Map([[1, { creature, needs }]]),
    })
    const data = makeSpeciesData('human', {
      adaptationProgress: new Map([['mountain', 1000]]),
    })
    ;(sys as any).speciesData.set('human', data)
    sys.applyTraitsToCreature(1, em as any)
    expect(needs.health).toBeLessThanOrEqual(100)
  })

  it('特性已应用不重复施加 speed_boost', () => {
    const creature = { type: 'creature', species: 'human', speed: 2, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const needs = { type: 'needs', hunger: 0, health: 50 }
    const em = makeEM({
      creatureIds: [1],
      components: new Map([[1, { creature, needs }]]),
    })
    const data = makeSpeciesData('human')
    data.traits.set('Battle Hardened', { count: 10, total: 10 }) // 100% ratio -> auto inherit
    ;(sys as any).speciesData.set('human', data)
    const speedBefore = creature.speed
    sys.applyTraitsToCreature(1, em as any)
    // call again — should not re-apply
    sys.applyTraitsToCreature(1, em as any)
    // speed may have changed from auto-inherit, but should not change on 2nd call
    const speedAfterFirst = creature.speed
    sys.applyTraitsToCreature(1, em as any)
    expect(creature.speed).toBe(speedAfterFirst)
  })

  it('auto-inherit 当 ratio >= 0.6 时自动获得特性', () => {
    // 使用独立的 entityId 和物种名称，避免全局 creatureTraits 污染
    const creature = { type: 'creature', species: 'elvenkind', speed: 1, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const needs = { type: 'needs', hunger: 0, health: 50 }
    const em = makeEM({
      creatureIds: [300],
      components: new Map([[300, { creature, needs }]]),
    })
    const data = makeSpeciesData('elvenkind')
    // count=0, total=0 → getSpeciesTraits 包含此 trait (total===0)
    // 但 ratio check 是 count/total, total=0 时不走 auto-inherit
    // 所以使用 count=6, total=10 (60% ratio), 这样 getSpeciesTraits 也返回(count>0)
    // 然后 applyTraitsToCreature 通过 auto-inherit 路径标记
    data.traits.set('Efficient Metabolism', { count: 6, total: 10 })
    ;(sys as any).speciesData.set('elvenkind', data)
    sys.applyTraitsToCreature(300, em as any)
    expect(EvolutionSystem.hasEvolutionTrait(300, 'Efficient Metabolism')).toBe(true)
  })

  it('auto-inherit 当 ratio < 0.6 时：count=0, total>0 的特性不被应用', () => {
    // count=0, total=10 → getSpeciesTraits 不返回此 trait (count>0 为false，total===0 为false)
    // auto-inherit 路径也不触发 (0/10 = 0 < 0.6)
    const creature = { type: 'creature', species: 'orcborn', speed: 1, damage: 5, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const needs = { type: 'needs', hunger: 0, health: 50 }
    const em = makeEM({
      creatureIds: [302],
      components: new Map([[302, { creature, needs }]]),
    })
    const data = makeSpeciesData('orcborn')
    data.traits.set('Efficient Metabolism', { count: 0, total: 10 }) // 0% < 60%
    ;(sys as any).speciesData.set('orcborn', data)
    sys.applyTraitsToCreature(302, em as any)
    expect(EvolutionSystem.hasEvolutionTrait(302, 'Efficient Metabolism')).toBe(false)
  })
})

// ── describe: traitToTerrainKey ──────────────────────────────────────────

describe('EvolutionSystem.traitToTerrainKey', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('Mountain Hardy -> mountain', () => {
    expect((sys as any).traitToTerrainKey('Mountain Hardy')).toBe('mountain')
  })

  it('Forest Stealth -> forest', () => {
    expect((sys as any).traitToTerrainKey('Forest Stealth')).toBe('forest')
  })

  it('Desert Endurance -> sand', () => {
    expect((sys as any).traitToTerrainKey('Desert Endurance')).toBe('sand')
  })

  it('Frost Resistant -> snow', () => {
    expect((sys as any).traitToTerrainKey('Frost Resistant')).toBe('snow')
  })

  it('Aquatic -> water', () => {
    expect((sys as any).traitToTerrainKey('Aquatic')).toBe('water')
  })

  it('未知特性返回 null', () => {
    expect((sys as any).traitToTerrainKey('Battle Hardened')).toBeNull()
  })

  it('空字符串返回 null', () => {
    expect((sys as any).traitToTerrainKey('')).toBeNull()
  })
})

// ── describe: EvolutionTrait 类型验证 ────────────────────────────────────

describe('EvolutionTrait 类型验证', () => {
  afterEach(() => { vi.restoreAllMocks() })

  const effectTypes: EvolutionTrait['effect'][] = [
    'health_boost', 'speed_boost', 'hunger_slow', 'frost_immune',
    'aquatic', 'stealth', 'defense_boost', 'disease_resist',
  ]

  it('支持8种 effect 类型', () => {
    expect(effectTypes).toHaveLength(8)
  })

  for (const effect of effectTypes) {
    it(`effect="${effect}" 的 trait 可以创建`, () => {
      const t = makeTrait({ effect })
      expect(t.effect).toBe(effect)
    })
  }

  it('source 支持 environment', () => {
    const t = makeTrait({ source: 'environment' })
    expect(t.source).toBe('environment')
  })

  it('source 支持 natural_selection', () => {
    const t = makeTrait({ source: 'natural_selection' })
    expect(t.source).toBe('natural_selection')
  })

  it('source 支持 inherited', () => {
    const t = makeTrait({ source: 'inherited' })
    expect(t.source).toBe('inherited')
  })

  it('magnitude 在 0~1 范围内', () => {
    const t = makeTrait({ magnitude: 0.5 })
    expect(t.magnitude).toBeGreaterThanOrEqual(0)
    expect(t.magnitude).toBeLessThanOrEqual(1)
  })
})

// ── describe: createSpeciesData ──────────────────────────────────────────

describe('EvolutionSystem.createSpeciesData', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('创建包含正确 species 名称的数据', () => {
    const data = (sys as any).createSpeciesData('elf')
    expect(data.species).toBe('elf')
  })

  it('traits 初始为空 Map', () => {
    const data = (sys as any).createSpeciesData('human')
    expect(data.traits.size).toBe(0)
  })

  it('deathCauses 各项初始为0', () => {
    const data = (sys as any).createSpeciesData('orc')
    const dc = data.deathCauses
    expect(dc.combat).toBe(0)
    expect(dc.hunger).toBe(0)
    expect(dc.disease).toBe(0)
    expect(dc.age).toBe(0)
    expect(dc.disaster).toBe(0)
  })

  it('generation 初始为0', () => {
    const data = (sys as any).createSpeciesData('dwarf')
    expect(data.generation).toBe(0)
  })

  it('adaptationProgress 初始为空 Map', () => {
    const data = (sys as any).createSpeciesData('human')
    expect(data.adaptationProgress.size).toBe(0)
  })
})

// ── describe: update 节流 ─────────────────────────────────────────────────

describe('EvolutionSystem.update 节流', () => {
  let sys: EvolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick % 60 !== 0 时不处理生物', () => {
    const em = makeEM({ creatureIds: [1] })
    const world = makeWorld()
    // tickCounter starts at 0, then increments to 1 on first update()
    sys.update(em as any, world as any, 1) // tickCounter=1, 1%60!=0
    expect(em.getComponent).not.toHaveBeenCalled()
  })

  it('tick % 60 === 0 时处理生物（tickCounter 第60次调用）', () => {
    const em = makeEM({ creatureIds: [] })
    const world = makeWorld()
    // 需要 tickCounter 为 60 的倍数才触发处理
    for (let i = 0; i < 60; i++) sys.update(em as any, world as any, i)
    // getEntitiesWithComponents 在 tickCounter=60 时被调用
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('空生物列表时不崩溃', () => {
    const em = makeEM({ creatureIds: [] })
    const world = makeWorld()
    for (let i = 0; i < 60; i++) sys.update(em as any, world as any, i)
    expect(() => true).not.toThrow()
  })
})
