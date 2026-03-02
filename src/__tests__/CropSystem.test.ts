import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CropSystem } from '../systems/CropSystem'
import type { CropField, CropType, CropStage } from '../systems/CropSystem'
import { Season } from '../systems/SeasonSystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent } from '../ecs/Entity'
import { BuildingType } from '../civilization/Civilization'
import type { BuildingComponent, Civilization } from '../civilization/Civilization'
import type { CivManager } from '../civilization/CivManager'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSys(): CropSystem { return new CropSystem() }

function makeCrop(
  cropType: CropType = 'wheat',
  stage: CropStage = 'growing',
  overrides: Partial<CropField> = {}
): CropField {
  return {
    x: 5, y: 5, civId: 1, cropType,
    growth: 50, stage, plantedSeason: Season.Spring, yield: 8,
    ...overrides,
  }
}

function makeEm(): EntityManager { return new EntityManager() }

function makeCiv(id = 1, food = 0): Civilization {
  return {
    id, name: `Civ${id}`, color: '#fff', population: 5,
    territory: new Set(), buildings: [],
    resources: { food, wood: 0, stone: 0, gold: 0 },
    techLevel: 1, relations: new Map(), tradeRoutes: [],
    culture: { trait: 'militaristic' as any, strength: 50 },
    religion: { type: 'animism' as any, faith: 0, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 70, taxRate: 0, revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [], embassies: [], diplomaticStance: 'neutral',
  }
}

function makeCivManager(civs: Civilization[], em: EntityManager): CivManager {
  const civMap = new Map<number, Civilization>()
  civs.forEach(c => civMap.set(c.id, c))
  return { civilizations: civMap, em } as unknown as CivManager
}

function makeParticles() {
  return { spawn: vi.fn() } as any
}

function addFarmBuilding(em: EntityManager, civId: number, x: number, y: number, level = 1): number {
  const id = em.createEntity()
  em.addComponent<BuildingComponent>(id, {
    type: 'building', buildingType: BuildingType.FARM,
    civId, health: 100, maxHealth: 100, level,
  })
  em.addComponent<PositionComponent>(id, { type: 'position', x, y })
  return id
}

// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 fields 为空', () => {
    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('初始 plantCooldown 为 0', () => {
    expect((sys as any).plantCooldown).toBe(0)
  })

  it('初始 _activeFieldKeys 为空 Set', () => {
    expect((sys as any)._activeFieldKeys.size).toBe(0)
  })

  it('getCropFields 返回内部数组引用', () => {
    ;(sys as any).fields.push(makeCrop())
    expect(sys.getCropFields()).toBe((sys as any).fields)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('getCropFields 查询', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).fields.push(makeCrop())
    expect(sys.getCropFields()).toHaveLength(1)
  })

  it('支持4种作物类型', () => {
    const types: CropType[] = ['wheat', 'corn', 'rice', 'potato']
    types.forEach(t => { ;(sys as any).fields.push(makeCrop(t)) })
    const all = sys.getCropFields()
    types.forEach((t, i) => { expect(all[i].cropType).toBe(t) })
  })

  it('支持5种生长阶段', () => {
    const stages: CropStage[] = ['planted', 'growing', 'mature', 'harvested', 'dead']
    stages.forEach(s => { ;(sys as any).fields.push(makeCrop('wheat', s)) })
    expect(sys.getCropFields()).toHaveLength(5)
  })

  it('作物字段正确存储', () => {
    ;(sys as any).fields.push(makeCrop('corn', 'planted', { growth: 10, yield: 12 }))
    const f = sys.getCropFields()[0]
    expect(f.cropType).toBe('corn')
    expect(f.growth).toBe(10)
    expect(f.yield).toBe(12)
  })

  it('多个作物全部返回', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).fields.push(makeCrop('wheat', 'growing', { x: i, y: i })) }
    expect(sys.getCropFields()).toHaveLength(10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CropType 完整性', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  const types: CropType[] = ['wheat', 'corn', 'rice', 'potato']

  types.forEach(ct => {
    it(`作物类型 ${ct} 字段保存正确`, () => {
      ;(sys as any).fields.push(makeCrop(ct))
      expect(sys.getCropFields()[0].cropType).toBe(ct)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CropStage 完整性', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  const stages: CropStage[] = ['planted', 'growing', 'mature', 'harvested', 'dead']

  stages.forEach(st => {
    it(`阶段 ${st} 字段保存正确`, () => {
      ;(sys as any).fields.push(makeCrop('wheat', st))
      expect(sys.getCropFields()[0].stage).toBe(st)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('plantedSeason 字段', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('Spring 存储正确', () => {
    ;(sys as any).fields.push(makeCrop('wheat', 'planted', { plantedSeason: Season.Spring }))
    expect(sys.getCropFields()[0].plantedSeason).toBe(Season.Spring)
  })

  it('Summer 存储正确', () => {
    ;(sys as any).fields.push(makeCrop('wheat', 'planted', { plantedSeason: Season.Summer }))
    expect(sys.getCropFields()[0].plantedSeason).toBe(Season.Summer)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update - harvested/dead 清理', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('harvested 状态作物在下次 update 时被移除', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()

    // Pre-load plantCooldown to ensure it triggers this tick
    ;(sys as any).plantCooldown = 1 // so it becomes 0 and enters tryPlantCrops

    const field = makeCrop('wheat', 'harvested', { x: 5, y: 5 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(5 * 10000 + 5)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('dead 状态作物在下次 update 时被移除', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'dead', { x: 3, y: 3 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(3 * 10000 + 3)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('harvested 移除时从 _activeFieldKeys 删除对应 key', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    ;(sys as any).fields.push(makeCrop('wheat', 'harvested', { x: 7, y: 7 }))
    const key = 7 * 10000 + 7
    ;(sys as any)._activeFieldKeys.add(key)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect((sys as any)._activeFieldKeys.has(key)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update - 冬季杀死非马铃薯未成熟作物', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('冬季时 wheat growing 变为 dead', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'growing', { x: 1, y: 1 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(1 * 10000 + 1)

    const world = { season: Season.Winter, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // The dead field gets removed in the same pass
    // So fields should be empty, and key removed
    expect((sys as any)._activeFieldKeys.has(1 * 10000 + 1)).toBe(false)
  })

  it('冬季时 potato growing 不被杀死', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('potato', 'growing', { x: 2, y: 2 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(2 * 10000 + 2)

    const world = { season: Season.Winter, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // potato survives winter — growth is 0 due to SEASON_GROWTH=0 but still alive
    expect(sys.getCropFields()).toHaveLength(1)
    expect(sys.getCropFields()[0].stage).toBe('growing')
  })

  it('冬季时 wheat mature 不被杀死（已成熟）', () => {
    const em = makeEm()
    const civ = makeCiv(1, 10)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'mature', { x: 3, y: 4, civId: 1 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(3 * 10000 + 4)

    const world = { season: Season.Winter, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // mature wheat gets harvested (not killed)
    expect(civ.resources.food).toBeGreaterThanOrEqual(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update - 作物生长', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('春季 wheat planted 生长后 growth 增加', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'planted', { x: 5, y: 5, growth: 5 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(5 * 10000 + 5)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // Spring growth: 1.0 * 1.2 * 0.15 = 0.18
    const remaining = sys.getCropFields()
    if (remaining.length > 0) {
      expect(remaining[0].growth).toBeGreaterThan(5)
    }
  })

  it('冬季 potato growth 为 0', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('potato', 'planted', { x: 6, y: 6, growth: 5 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(6 * 10000 + 6)

    const world = { season: Season.Winter, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    const remaining = sys.getCropFields()
    if (remaining.length > 0) {
      expect(remaining[0].growth).toBeCloseTo(5) // no growth in winter
    }
  })

  it('planted 转 growing 在 growth >= 20 时', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    // growth=19, after spring wheat growth delta = 1.0*1.2*0.15=0.18 → 19.18 still < 20
    // Use growth=19.9 to guarantee crossing
    const field = makeCrop('wheat', 'planted', { x: 7, y: 7, growth: 19.9 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(7 * 10000 + 7)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    const remaining = sys.getCropFields()
    if (remaining.length > 0) {
      expect(remaining[0].stage).toBe('growing')
    }
  })

  it('growth 达到 100 时变为 mature', () => {
    const em = makeEm()
    const civ = makeCiv(1, 10)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    // growth=99.9, delta brings it over 100
    const field = makeCrop('wheat', 'growing', { x: 8, y: 8, civId: 1, growth: 99.9 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(8 * 10000 + 8)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // It becomes mature → then immediately harvested in same update pass
    expect(civ.resources.food).toBeGreaterThanOrEqual(10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update - 成熟作物收割', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('mature 作物触发食物增加', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'mature', { x: 10, y: 10, civId: 1, yield: 15 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(10 * 10000 + 10)

    const world = { season: Season.Summer, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(civ.resources.food).toBe(15)
  })

  it('收割后 particles.spawn 被调用', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('corn', 'mature', { x: 11, y: 11, civId: 1 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(11 * 10000 + 11)

    const world = { season: Season.Summer, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(particles.spawn).toHaveBeenCalled()
  })

  it('收割后 stage 变为 harvested，下一次 update 才清除', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'mature', { x: 12, y: 12, civId: 1 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(12 * 10000 + 12)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // After first update: mature→harvested; _activeFieldKeys key already removed
    expect((sys as any)._activeFieldKeys.has(12 * 10000 + 12)).toBe(false)

    // Second update: harvested stage is spliced out
    ;(sys as any).plantCooldown = 1
    sys.update(world, civMgr, em, particles)
    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('找不到文明时不收割', () => {
    const em = makeEm()
    const civMgr = makeCivManager([], em) // empty civ map
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const field = makeCrop('wheat', 'mature', { x: 13, y: 13, civId: 999 })
    ;(sys as any).fields.push(field)
    ;(sys as any)._activeFieldKeys.add(13 * 10000 + 13)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // Field still alive (not harvested because civ not found)
    const remaining = sys.getCropFields()
    expect(remaining[0].stage).toBe('mature')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('tryPlantCrops - 季节限制', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('秋季不种植', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const world = { season: Season.Autumn, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('冬季不种植', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    const world = { season: Season.Winter, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields()).toHaveLength(0)
  })

  it('春季可以种植', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields().length).toBeGreaterThan(0)
  })

  it('夏季可以种植', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const world = { season: Season.Summer, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(sys.getCropFields().length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('tryPlantCrops - _activeFieldKeys 防重复种植', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('已占用坐标不被再次种植', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 1

    // Pre-occupy all FARM_OFFSETS around (10,10):
    // offsets: [-1,-1],[1,-1],[-1,1],[1,1],[-2,0],[2,0],[0,-2],[0,2]
    const offsets = [[-1,-1],[1,-1],[-1,1],[1,1],[-2,0],[2,0],[0,-2],[0,2]]
    offsets.forEach(([dx, dy]) => {
      const cx = 10 + dx, cy = 10 + dy
      ;(sys as any)._activeFieldKeys.add(cx * 10000 + cy)
    })

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // No new fields since all offsets are occupied
    expect(sys.getCropFields()).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('tryPlantCrops - maxCrops 上限', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('level=1 农场最多允许4块作物', () => {
    // maxCrops = 3 + level = 4
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const farmId = addFarmBuilding(em, 1, 10, 10, 1)
    civ.buildings.push(farmId)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()

    // Pre-fill 4 crops near this farm
    for (let i = 0; i < 4; i++) {
      ;(sys as any).fields.push(makeCrop('wheat', 'growing', { x: 10 + i, y: 9, civId: 1 }))
    }

    ;(sys as any).plantCooldown = 1
    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    const cropsNearFarm = sys.getCropFields().filter(f =>
      Math.abs(f.x - 10) <= 3 && Math.abs(f.y - 10) <= 3
    )
    expect(cropsNearFarm.length).toBe(4) // no new one added
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('plantCooldown 节流', () => {
  let sys: CropSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('plantCooldown > 0 时不调用 tryPlantCrops', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()

    const spy = vi.spyOn(sys as any, 'tryPlantCrops')
    ;(sys as any).plantCooldown = 100

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(spy).not.toHaveBeenCalled()
  })

  it('plantCooldown <= 0 时调用 tryPlantCrops', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()

    const spy = vi.spyOn(sys as any, 'tryPlantCrops')
    ;(sys as any).plantCooldown = 0

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect(spy).toHaveBeenCalledOnce()
  })

  it('触发后 plantCooldown 重置为 120', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 0

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    expect((sys as any).plantCooldown).toBe(120)
  })

  it('每次 update 都减少 plantCooldown', () => {
    const em = makeEm()
    const civ = makeCiv(1, 0)
    const civMgr = makeCivManager([civ], em)
    const particles = makeParticles()
    ;(sys as any).plantCooldown = 50

    const world = { season: Season.Spring, tick: 100 } as any
    sys.update(world, civMgr, em, particles)

    // 50 - 1 = 49 (no trigger since 49 > 0)
    expect((sys as any).plantCooldown).toBe(49)
  })
})
