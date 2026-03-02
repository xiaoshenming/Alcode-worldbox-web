import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReligionSystem } from '../systems/ReligionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'
import { BuildingType } from '../civilization/Civilization'

// ────────────────────────────── helpers ──────────────────────────────

function makeSys() { return new ReligionSystem() }

function makeParticles() {
  return { spawnAura: vi.fn(), spawnBlessing: vi.fn(), spawn: vi.fn() }
}

function makeWorld() {
  return { width: 20, height: 20, getTile: (_x: number, _y: number) => TileType.GRASS }
}

/** Minimal Civilization factory matching the full interface */
function makeCiv(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'TestCiv',
    color: '#ff0000',
    population: 10,
    territory: new Set<string>(),
    buildings: [] as number[],
    resources: { food: 50, wood: 50, stone: 50, gold: 50 },
    techLevel: 1,
    relations: new Map<number, number>(),
    tradeRoutes: [],
    culture: { trait: 'warrior' as const, strength: 50 },
    religion: {
      type: 'sun' as const,
      faith: 50,
      temples: 0,
      blessing: null,
      blessingTimer: 0,
    },
    happiness: 70,
    taxRate: 1,
    revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [],
    embassies: [],
    diplomaticStance: 'neutral' as const,
    ...overrides,
  }
}

function makeCivManager(civs: ReturnType<typeof makeCiv>[] = []) {
  const map = new Map<number, ReturnType<typeof makeCiv>>()
  for (const c of civs) map.set(c.id, c)
  // Minimal territoryMap (20x20 zeroes)
  const territoryMap: number[][] = Array.from({ length: 20 }, () => new Array(20).fill(0))
  return { civilizations: map, territoryMap }
}

// ────────────────────────────── describe blocks ──────────────────────────────

describe('ReligionSystem — 实例化与初始状态', () => {
  let sys: ReligionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始 blessingCooldowns 为空 Map', () => {
    expect((sys as any).blessingCooldowns.size).toBe(0)
  })
  it('初始 _civsBuf 为空数组', () => {
    expect((sys as any)._civsBuf).toEqual([])
  })
  it('多次实例化互不干扰', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).blessingCooldowns.set(1, 999)
    expect((b as any).blessingCooldowns.size).toBe(0)
  })
})

describe('ReligionSystem — update() 基础安全性', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('空文明管理器 tick=0 不崩溃', () => {
    const cm = makeCivManager()
    expect(() => sys.update(cm as any, em, world as any, particles as any, 0)).not.toThrow()
  })

  it('空文明管理器连续调用 300 次不崩溃', () => {
    const cm = makeCivManager()
    expect(() => {
      for (let i = 0; i < 300; i++) sys.update(cm as any, em, world as any, particles as any, i)
    }).not.toThrow()
  })

  it('tick=120 触发 updateFaith（整除分支）不崩溃', () => {
    const cm = makeCivManager([makeCiv()])
    expect(() => sys.update(cm as any, em, world as any, particles as any, 120)).not.toThrow()
  })

  it('tick=300 触发 spreadReligion 和 checkHolyWar 不崩溃', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'OtherCiv', religion: { type: 'moon', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ1, civ2])
    expect(() => sys.update(cm as any, em, world as any, particles as any, 300)).not.toThrow()
  })

  it('tick 非整除时只执行 updateBlessings', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 90, temples: 0, blessing: 'sun', blessingTimer: 10 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    // blessingTimer decremented
    expect(civ.religion.blessingTimer).toBe(9)
  })
})

describe('ReligionSystem — countTemples (private via updateFaith)', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('无神庙时 faith 递减', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.religion.faith).toBe(49)
  })

  it('faith 为 0 时不再减少', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 0, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.religion.faith).toBe(0)
  })

  it('有神庙时 faith 增加（每神庙 +1）', () => {
    // Add a building entity with TEMPLE type
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // 2 (base) + 1 (temple) = +3 → 53
    expect(civ.religion.faith).toBe(53)
  })

  it('有两个神庙 faith 增量正确', () => {
    const b1 = em.createEntity(); em.addComponent(b1, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const b2 = em.createEntity(); em.addComponent(b2, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [b1, b2], religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // 2 + 2 = +4 → 54
    expect(civ.religion.faith).toBe(54)
  })

  it('faith 上限为 100', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 99, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.religion.faith).toBe(100)
  })

  it('非神庙建筑不计入 temples 数量', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.HOUSE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // No temples → faith -1
    expect(civ.religion.faith).toBe(49)
  })
})

describe('ReligionSystem — grantBlessing', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('faith >= 80 且无冷却时触发 blessing', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.religion.blessing).toBe('sun')
  })

  it('blessing 触发后 blessingTimer 设为 BLESSING_DURATION (600) 再减 1（同 tick updateBlessings）', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'moon', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // grantBlessing sets timer=600, then updateBlessings decrements it → 599
    expect(civ.religion.blessingTimer).toBe(599)
  })

  it('blessing 触发后 blessingCooldowns 记录正确结束 tick', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ id: 7, buildings: [bId], religion: { type: 'sun', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // cooldownEnd = 120 + 600 + 1200 = 1920
    expect((sys as any).blessingCooldowns.get(7)).toBe(1920)
  })

  it('冷却期内不重复授予 blessing', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ id: 5, buildings: [bId], religion: { type: 'earth', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    ;(sys as any).blessingCooldowns.set(5, 9999) // still in cooldown
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.religion.blessing).toBeNull()
  })

  it('faith < 80 不触发 blessing', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 79, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // faith 79+3=82 but blessing wasn't active at start → updateFaith runs and may grant
    // Actually faith was 79 at the check point — it hasn't been incremented yet during this tick
    // The increment happens inside updateFaith before blessing check → 82 >= 80 → blessing may be granted
    // So let's test: faith=60 which after increment stays < 80
    const civ2 = makeCiv({ buildings: [bId], religion: { type: 'sun', faith: 60, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm2 = makeCivManager([civ2])
    sys.update(cm2 as any, em, world as any, particles as any, 120)
    // 60 + 3 = 63 < 80 → no blessing
    expect(civ2.religion.blessing).toBeNull()
  })

  it('已有 blessing 时不重复授予', () => {
    const civ = makeCiv({ religion: { type: 'storm', faith: 90, temples: 0, blessing: 'storm', blessingTimer: 100 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // blessing is already set → grantBlessing not called again
    expect(civ.religion.blessing).toBe('storm')
  })
})

describe('ReligionSystem — applyBlessingEffect', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('sun blessing 每 tick 增加 food +0.05', () => {
    const civ = makeCiv({ resources: { food: 10, wood: 0, stone: 0, gold: 0 }, religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.resources.food).toBeCloseTo(10.05, 5)
  })

  it('moon blessing 将 researchRate 设至少 1.5', () => {
    const civ = makeCiv({ religion: { type: 'moon', faith: 50, temples: 0, blessing: 'moon', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.research.researchRate).toBeGreaterThanOrEqual(1.5)
  })

  it('moon blessing 不降低已高于 1.5 的 researchRate', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: [], researchRate: 3 }, religion: { type: 'moon', faith: 50, temples: 0, blessing: 'moon', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.research.researchRate).toBe(3)
  })

  it('earth blessing 修复建筑 HP', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 50, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'earth', faith: 50, temples: 0, blessing: 'earth', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    const b = em.getComponent<any>(bId, 'building')
    expect(b!.health).toBeCloseTo(50.1, 3)
  })

  it('earth blessing 不超过 maxHealth', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.TEMPLE, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], religion: { type: 'earth', faith: 50, temples: 0, blessing: 'earth', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    const b = em.getComponent<any>(bId, 'building')
    expect(b!.health).toBe(100)
  })

  it('storm blessing 增加 happiness', () => {
    const civ = makeCiv({ happiness: 50, religion: { type: 'storm', faith: 50, temples: 0, blessing: 'storm', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.happiness).toBeCloseTo(50.02, 3)
  })

  it('storm blessing happiness 上限 100', () => {
    const civ = makeCiv({ happiness: 100, religion: { type: 'storm', faith: 50, temples: 0, blessing: 'storm', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.happiness).toBe(100)
  })

  it('ancestor blessing 增加 food +0.04', () => {
    const civ = makeCiv({ resources: { food: 5, wood: 0, stone: 0, gold: 0 }, religion: { type: 'ancestor', faith: 50, temples: 0, blessing: 'ancestor', blessingTimer: 5 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.resources.food).toBeCloseTo(5.04, 3)
  })
})

describe('ReligionSystem — blessingTimer 倒计时', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('blessingTimer 每 tick -1', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 10 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.religion.blessingTimer).toBe(9)
  })

  it('blessingTimer 到 0 时 blessing 清除', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 1 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.religion.blessing).toBeNull()
  })

  it('blessing 为 null 时 blessingTimer 不变化', () => {
    const civ = makeCiv({ religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 999 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(civ.religion.blessingTimer).toBe(999)
  })

  it('tick=30 时调用 spawnAura（粒子效果）', () => {
    const territory = new Set(['5,5'])
    const civ = makeCiv({ territory, religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 50 } })
    const cm = makeCivManager([civ])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 30)
    expect(particles.spawnAura).toHaveBeenCalled()
  })

  it('tick=1 时不调用 spawnAura', () => {
    const territory = new Set(['5,5'])
    const civ = makeCiv({ territory, religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 50 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 1)
    expect(particles.spawnAura).not.toHaveBeenCalled()
  })

  it('territory 为空时 spawnBlessingParticles 不崩溃', () => {
    const civ = makeCiv({ territory: new Set<string>(), religion: { type: 'sun', faith: 50, temples: 0, blessing: 'sun', blessingTimer: 50 } })
    const cm = makeCivManager([civ])
    expect(() => sys.update(cm as any, em, world as any, particles as any, 30)).not.toThrow()
    expect(particles.spawnAura).not.toHaveBeenCalled()
  })
})

describe('ReligionSystem — spreadReligion', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('相邻且 faithDiff>0 时随机触发时高信仰方增加', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 20, temples: 0, blessing: null, blessingTimer: 0 } })
    // Make them border: civ1 owns (0,0), civ2 owns (1,0)
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0) // always trigger spread
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.religion.faith).toBeGreaterThan(80) // spreader gains
    expect(civ2.religion.faith).toBeLessThan(20) // target loses
  })

  it('faithDiff=0 时不传播', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 50, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.religion.faith).toBe(50)
    expect(civ2.religion.faith).toBe(50)
  })

  it('非相邻文明不传播', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 10, temples: 0, blessing: null, blessingTimer: 0 } })
    // No territory set → not bordering
    const cm = makeCivManager([civ1, civ2])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.religion.faith).toBe(90)
    expect(civ2.religion.faith).toBe(10)
  })

  it('faith 跌到 0 且随机触发时发生宗教转化', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 5, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    // Spread triggered AND conversion triggered (both Math.random < threshold)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ2.religion.type).toBe('sun') // converted
  })

  it('单个文明不触发传播', () => {
    const civ = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const cm = makeCivManager([civ])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(cm as any, em, world as any, particles as any, 300)).not.toThrow()
    expect(civ.religion.faith).toBe(90)
  })
})

describe('ReligionSystem — checkHolyWar', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('不同宗教且 faith>60 且相邻时随机触发圣战', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 80, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0) // always trigger
    sys.update(cm as any, em, world as any, particles as any, 300)
    const rel = civ1.relations.get(2) ?? 0
    expect(rel).toBeLessThan(0)
  })

  it('相同宗教不触发圣战', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.relations.get(2)).toBeUndefined()
  })

  it('faith ≤ 60 时不触发圣战', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 60, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.relations.get(2)).toBeUndefined()
  })

  it('圣战关系减少 30', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.relations.set(2, 10)
    civ2.relations.set(1, 20)
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.relations.get(2)).toBe(10 - 30)
    expect(civ2.relations.get(1)).toBe(20 - 30)
  })

  it('关系不低于 -100', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.relations.set(2, -90)
    civ2.relations.set(1, -90)
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.relations.get(2)).toBeGreaterThanOrEqual(-100)
    expect(civ2.relations.get(1)).toBeGreaterThanOrEqual(-100)
  })

  it('概率为 0 时不触发圣战', () => {
    const civ1 = makeCiv({ id: 1, religion: { type: 'sun', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', religion: { type: 'moon', faith: 90, temples: 0, blessing: null, blessingTimer: 0 } })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][0] = 1
    cm.territoryMap[0][1] = 2
    vi.spyOn(Math, 'random').mockReturnValue(1) // never trigger (0.03 threshold)
    sys.update(cm as any, em, world as any, particles as any, 300)
    expect(civ1.relations.get(2)).toBeUndefined()
  })
})

describe('ReligionSystem — updateCulture', () => {
  let sys: ReligionSystem
  let em: EntityManager
  let particles: ReturnType<typeof makeParticles>
  let world: ReturnType<typeof makeWorld>

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    particles = makeParticles()
    world = makeWorld()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('culture.strength < 100 时自然增长 1', () => {
    const civ = makeCiv({ culture: { trait: 'warrior', strength: 50 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.culture.strength).toBe(51)
  })

  it('culture.strength 已达 100 不超过上限', () => {
    const civ = makeCiv({ culture: { trait: 'warrior', strength: 100 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ.culture.strength).toBe(100)
  })

  it('Academy 建筑加速文化增长', () => {
    const bId = em.createEntity()
    em.addComponent(bId, { type: 'building', buildingType: BuildingType.ACADEMY, civId: 1, health: 100, maxHealth: 100, level: 1 })
    const civ = makeCiv({ buildings: [bId], culture: { trait: 'scholar', strength: 50 } })
    const cm = makeCivManager([civ])
    sys.update(cm as any, em, world as any, particles as any, 120)
    // 1 (base) + 2*1 (academies) = 3 → 53
    expect(civ.culture.strength).toBe(53)
  })

  it('相同文化特质文明关系改善', () => {
    const civ1 = makeCiv({ id: 1, culture: { trait: 'warrior', strength: 50 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', culture: { trait: 'warrior', strength: 50 } })
    const cm = makeCivManager([civ1, civ2])
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ1.relations.get(2)).toBeGreaterThan(0)
  })

  it('不同文化且强势方大幅领先时可同化', () => {
    const civ1 = makeCiv({ id: 1, culture: { trait: 'warrior', strength: 90 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', culture: { trait: 'merchant', strength: 50 } })
    const cm = makeCivManager([civ1, civ2])
    vi.spyOn(Math, 'random').mockReturnValue(0) // force assimilation
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ2.culture.trait).toBe('warrior')
  })

  it('文化差距 ≤ 30 时不同化', () => {
    const civ1 = makeCiv({ id: 1, culture: { trait: 'warrior', strength: 70 } })
    const civ2 = makeCiv({ id: 2, name: 'Civ2', culture: { trait: 'merchant', strength: 50 } })
    const cm = makeCivManager([civ1, civ2])
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(cm as any, em, world as any, particles as any, 120)
    expect(civ2.culture.trait).toBe('merchant')
  })
})

describe('ReligionSystem — areBordering (private)', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('相邻格子判定为 bordering', () => {
    const sys = makeSys()
    const civ1 = makeCiv({ id: 1 })
    const civ2 = makeCiv({ id: 2 })
    civ1.territory.add('0,0')
    civ2.territory.add('1,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][1] = 2
    expect((sys as any).areBordering(civ1, civ2, cm)).toBe(true)
  })

  it('间隔 2 格不判定为 bordering', () => {
    const sys = makeSys()
    const civ1 = makeCiv({ id: 1 })
    const civ2 = makeCiv({ id: 2 })
    civ1.territory.add('0,0')
    civ2.territory.add('3,0')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[0][3] = 2
    expect((sys as any).areBordering(civ1, civ2, cm)).toBe(false)
  })

  it('领土为空时不相邻', () => {
    const sys = makeSys()
    const civ1 = makeCiv({ id: 1 })
    const civ2 = makeCiv({ id: 2 })
    const cm = makeCivManager([civ1, civ2])
    expect((sys as any).areBordering(civ1, civ2, cm)).toBe(false)
  })

  it('上方相邻判定为 bordering', () => {
    const sys = makeSys()
    const civ1 = makeCiv({ id: 1 })
    const civ2 = makeCiv({ id: 2 })
    civ1.territory.add('5,5')
    civ2.territory.add('5,4')
    const cm = makeCivManager([civ1, civ2])
    cm.territoryMap[4][5] = 2
    expect((sys as any).areBordering(civ1, civ2, cm)).toBe(true)
  })
})
