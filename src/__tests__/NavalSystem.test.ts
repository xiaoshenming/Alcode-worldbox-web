import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NavalSystem } from '../systems/NavalSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'
import { BuildingType } from '../civilization/Civilization'

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function makeSys() { return new NavalSystem() }

function makeWorld(tile: TileType = TileType.DEEP_WATER) {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => tile,
    setTile: () => {},
  }
}

function makeParticles() {
  return { spawn: vi.fn(), spawnCombat: vi.fn(), spawnDeath: vi.fn() }
}

function makeCivManager(civs: Map<number, any> = new Map()) {
  return {
    civilizations: civs,
    getRelation: () => 0,
    getCultureBonus: (_civId: number, _type: string) => 1,
    territoryMap: Array.from({ length: 20 }, () => new Array(20).fill(0)),
  }
}

function makeCiv(id: number, overrides: Partial<any> = {}): any {
  return {
    id,
    name: `Civ${id}`,
    resources: { food: 100, wood: 100, stone: 50, gold: 50 },
    relations: new Map<number, number>(),
    territory: new Set<string>(),
    buildings: [],
    tradeRoutes: [],
    population: 10,
    ...overrides
  }
}

// ────────────────────────────────────────────────
// describe 1: 实例化与内部状态
// ────────────────────────────────────────────────
describe('NavalSystem — 实例化与内部状态', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始 portShipCount 为空 Map', () => { expect((sys as any).portShipCount.size).toBe(0) })
  it('初始 _combatGrid 为空 Map', () => { expect((sys as any)._combatGrid.size).toBe(0) })
  it('初始 _combatCellPool 为空数组', () => { expect((sys as any)._combatCellPool).toHaveLength(0) })
  it('初始 _portCandXBuf 为空数组', () => { expect((sys as any)._portCandXBuf).toHaveLength(0) })
  it('初始 _portCandYBuf 为空数组', () => { expect((sys as any)._portCandYBuf).toHaveLength(0) })
  it('初始 _shipsBuf 为空数组', () => { expect((sys as any)._shipsBuf).toHaveLength(0) })
  it('初始 _portResultBuf 含 x=0 y=0', () => {
    expect((sys as any)._portResultBuf).toEqual({ x: 0, y: 0 })
  })
})

// ────────────────────────────────────────────────
// describe 2: update() 基础健壮性
// ────────────────────────────────────────────────
describe('NavalSystem — update() 基础健壮性', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('空 em 不崩溃 tick=0', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 0)).not.toThrow()
  })

  it('空 em 不崩溃 tick=120 (spawn interval)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 120)).not.toThrow()
  })

  it('空 em 不崩溃 tick=60 (trade interval)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 60)).not.toThrow()
  })

  it('空 em 不崩溃 tick=40 (explore interval)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 40)).not.toThrow()
  })

  it('空 em 不崩溃 tick=10 (fish interval)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 10)).not.toThrow()
  })

  it('空 em 不崩溃 tick=80 (blockade interval)', () => {
    expect(() => sys.update(new EntityManager(), makeWorld() as any, makeCivManager() as any, makeParticles() as any, 80)).not.toThrow()
  })

  it('连续 200 tick 不崩溃', () => {
    const em = new EntityManager()
    const world = makeWorld() as any
    const cm = makeCivManager() as any
    const ps = makeParticles() as any
    expect(() => {
      for (let i = 0; i < 200; i++) sys.update(em, world, cm, ps, i)
    }).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 3: getShipCount
// ────────────────────────────────────────────────
describe('NavalSystem — getShipCount()', () => {
  let sys: NavalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = new EntityManager() })
  afterEach(() => { vi.restoreAllMocks() })

  it('无 ship 实体时返回 0', () => {
    expect(sys.getShipCount(em)).toBe(0)
  })

  it('无 ship 实体时指定 civId 返回 0', () => {
    expect(sys.getShipCount(em, 1)).toBe(0)
  })

  it('有 1 个 ship 实体时不指定 civId 返回 1', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'ship', shipType: 'warship', civId: 1, health: 100, maxHealth: 100, speed: 1, damage: 10, cargo: { food: 0, gold: 0, wood: 0 }, crew: 10, maxCrew: 10, targetX: 0, targetY: 0, state: 'idle' })
    expect(sys.getShipCount(em)).toBe(1)
  })

  it('有 1 个 ship 实体时指定正确 civId 返回 1', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'ship', shipType: 'trader', civId: 2, health: 60, maxHealth: 60, speed: 1, damage: 0, cargo: { food: 0, gold: 0, wood: 0 }, crew: 15, maxCrew: 15, targetX: 0, targetY: 0, state: 'idle' })
    expect(sys.getShipCount(em, 2)).toBe(1)
  })

  it('指定错误 civId 返回 0', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'ship', shipType: 'trader', civId: 2, health: 60, maxHealth: 60, speed: 1, damage: 0, cargo: { food: 0, gold: 0, wood: 0 }, crew: 15, maxCrew: 15, targetX: 0, targetY: 0, state: 'idle' })
    expect(sys.getShipCount(em, 99)).toBe(0)
  })

  it('多个 civ 的船，getShipCount 不带 civId 返回全部', () => {
    for (let c = 1; c <= 3; c++) {
      const id = em.createEntity()
      em.addComponent(id, { type: 'ship', shipType: 'warship', civId: c, health: 100, maxHealth: 100, speed: 1, damage: 10, cargo: { food: 0, gold: 0, wood: 0 }, crew: 10, maxCrew: 10, targetX: 0, targetY: 0, state: 'idle' })
    }
    expect(sys.getShipCount(em)).toBe(3)
  })

  it('过滤特定 civ 时只计该 civ 的船', () => {
    for (let c = 1; c <= 3; c++) {
      const id = em.createEntity()
      em.addComponent(id, { type: 'ship', shipType: 'warship', civId: c, health: 100, maxHealth: 100, speed: 1, damage: 10, cargo: { food: 0, gold: 0, wood: 0 }, crew: 10, maxCrew: 10, targetX: 0, targetY: 0, state: 'idle' })
    }
    expect(sys.getShipCount(em, 2)).toBe(1)
  })
})

// ────────────────────────────────────────────────
// describe 4: civIsAtWar（私有方法）
// ────────────────────────────────────────────────
describe('NavalSystem — civIsAtWar()', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('relations 为空 → 不在战争', () => {
    const civ = { relations: new Map<number, number>() }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(false)
  })

  it('最低关系为 -30 → 不在战争（需 <= -50）', () => {
    const civ = { relations: new Map([[2, -30]]) }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(false)
  })

  it('关系 -50 → 在战争', () => {
    const civ = { relations: new Map([[2, -50]]) }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(true)
  })

  it('关系 -100 → 在战争', () => {
    const civ = { relations: new Map([[2, -100]]) }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(true)
  })

  it('多个 relations，一个 <=-50 → 在战争', () => {
    const civ = { relations: new Map([[2, 10], [3, -60], [4, 20]]) }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(true)
  })

  it('多个 relations 全部 > -50 → 不在战争', () => {
    const civ = { relations: new Map([[2, 10], [3, -49], [4, 50]]) }
    expect((sys as any).civIsAtWar(civ, makeCivManager())).toBe(false)
  })
})

// ────────────────────────────────────────────────
// describe 5: chooseShipType（私有方法，控制随机数）
// ────────────────────────────────────────────────
describe('NavalSystem — chooseShipType()', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  const peaceCiv = { relations: new Map<number, number>() }
  const warCiv = { relations: new Map([[2, -60]]) }

  it('和平状态 roll=0.10 → warship', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.10)
    expect((sys as any).chooseShipType(peaceCiv, makeCivManager())).toBe('warship')
  })

  it('和平状态 roll=0.20 → trader', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.20)
    expect((sys as any).chooseShipType(peaceCiv, makeCivManager())).toBe('trader')
  })

  it('和平状态 roll=0.50 → explorer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.50)
    expect((sys as any).chooseShipType(peaceCiv, makeCivManager())).toBe('explorer')
  })

  it('和平状态 roll=0.80 → fishing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.80)
    expect((sys as any).chooseShipType(peaceCiv, makeCivManager())).toBe('fishing')
  })

  it('战争状态 roll=0.40 → warship（<0.5）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.40)
    expect((sys as any).chooseShipType(warCiv, makeCivManager())).toBe('warship')
  })

  it('战争状态 roll=0.65 → fishing（<0.7）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.65)
    expect((sys as any).chooseShipType(warCiv, makeCivManager())).toBe('fishing')
  })

  it('战争状态 roll=0.80 → trader（<0.9）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.80)
    expect((sys as any).chooseShipType(warCiv, makeCivManager())).toBe('trader')
  })

  it('战争状态 roll=0.95 → explorer（>=0.9）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95)
    expect((sys as any).chooseShipType(warCiv, makeCivManager())).toBe('explorer')
  })
})

// ────────────────────────────────────────────────
// describe 6: findAdjacentWater（私有方法）
// ────────────────────────────────────────────────
describe('NavalSystem — findAdjacentWater()', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('周围全是陆地时返回 null', () => {
    const world = makeWorld(TileType.GRASS)
    const result = (sys as any).findAdjacentWater(world, 5, 5)
    expect(result).toBeNull()
  })

  it('周围有 DEEP_WATER 时返回坐标对象', () => {
    const world = makeWorld(TileType.DEEP_WATER)
    const result = (sys as any).findAdjacentWater(world, 5, 5)
    expect(result).not.toBeNull()
    expect(typeof result!.x).toBe('number')
    expect(typeof result!.y).toBe('number')
  })

  it('周围有 SHALLOW_WATER 时也返回坐标', () => {
    const world = {
      width: 20, height: 20,
      getTile: (x: number, y: number) => {
        if (x === 6 && y === 5) return TileType.SHALLOW_WATER
        return TileType.GRASS
      },
      setTile: () => {},
    }
    const result = (sys as any).findAdjacentWater(world, 5, 5)
    expect(result).not.toBeNull()
  })

  it('越界坐标不崩溃', () => {
    const world = makeWorld(TileType.DEEP_WATER)
    expect(() => (sys as any).findAdjacentWater(world, 0, 0)).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 7: decrementPortCount（私有方法）
// ────────────────────────────────────────────────
describe('NavalSystem — decrementPortCount()', () => {
  let sys: NavalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = new EntityManager() })
  afterEach(() => { vi.restoreAllMocks() })

  it('portShipCount 为空时不崩溃', () => {
    expect(() => (sys as any).decrementPortCount(em, 1)).not.toThrow()
  })

  it('找到对应 civ 的 port 时将 count 减 1', () => {
    const portId = em.createEntity()
    em.addComponent(portId, {
      type: 'building', buildingType: BuildingType.PORT, civId: 1, health: 100, maxHealth: 100, level: 1
    })
    ;(sys as any).portShipCount.set(portId, 3)
    ;(sys as any).decrementPortCount(em, 1)
    expect((sys as any).portShipCount.get(portId)).toBe(2)
  })

  it('count=0 时不减（跳过 count<=0 的条目）', () => {
    const portId = em.createEntity()
    em.addComponent(portId, {
      type: 'building', buildingType: BuildingType.PORT, civId: 1, health: 100, maxHealth: 100, level: 1
    })
    ;(sys as any).portShipCount.set(portId, 0)
    ;(sys as any).decrementPortCount(em, 1)
    expect((sys as any).portShipCount.get(portId)).toBe(0)
  })
})

// ────────────────────────────────────────────────
// describe 8: 捕鱼生成食物（updateFishing 集成）
// ────────────────────────────────────────────────
describe('NavalSystem — 捕鱼船产生食物', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=10 时捕鱼船为 civ 生产食物', () => {
    const em = new EntityManager()
    const civ1 = makeCiv(1, { resources: { food: 0, wood: 50, stone: 0, gold: 0 } })
    const civs = new Map([[1, civ1]])
    const cm = makeCivManager(civs)

    const shipId = em.createEntity()
    em.addComponent(shipId, {
      type: 'ship', shipType: 'fishing', civId: 1, health: 40, maxHealth: 40,
      speed: 0.5, damage: 0, cargo: { food: 0, gold: 0, wood: 0 },
      crew: 8, maxCrew: 8, targetX: 5, targetY: 5, state: 'sailing'
    })
    em.addComponent(shipId, { type: 'position', x: 5, y: 5 })

    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(em, world as any, cm as any, makeParticles() as any, 10)

    expect(civ1.resources.food).toBeGreaterThan(0)
  })

  it('非捕鱼船 tick=10 时不产生食物', () => {
    const em = new EntityManager()
    const civ1 = makeCiv(1, { resources: { food: 0, wood: 50, stone: 0, gold: 0 } })
    const civs = new Map([[1, civ1]])
    const cm = makeCivManager(civs)

    const shipId = em.createEntity()
    em.addComponent(shipId, {
      type: 'ship', shipType: 'warship', civId: 1, health: 120, maxHealth: 120,
      speed: 1, damage: 15, cargo: { food: 0, gold: 0, wood: 0 },
      crew: 50, maxCrew: 50, targetX: 5, targetY: 5, state: 'sailing'
    })
    em.addComponent(shipId, { type: 'position', x: 5, y: 5 })

    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(em, world as any, cm as any, makeParticles() as any, 10)

    expect(civ1.resources.food).toBe(0)
  })
})

// ────────────────────────────────────────────────
// describe 9: portShipCount 管理
// ────────────────────────────────────────────────
describe('NavalSystem — portShipCount 管理', () => {
  let sys: NavalSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = new EntityManager() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 portShipCount 为空', () => {
    expect((sys as any).portShipCount.size).toBe(0)
  })

  it('手动设置 portShipCount 后可读取', () => {
    ;(sys as any).portShipCount.set(42, 2)
    expect((sys as any).portShipCount.get(42)).toBe(2)
  })

  it('portShipCount 可存多个 port', () => {
    ;(sys as any).portShipCount.set(1, 1)
    ;(sys as any).portShipCount.set(2, 2)
    ;(sys as any).portShipCount.set(3, 3)
    expect((sys as any).portShipCount.size).toBe(3)
  })

  it('decrementPortCount 对不存在的 civId 不崩溃', () => {
    ;(sys as any).portShipCount.set(999, 2)
    const portId = em.createEntity()
    em.addComponent(portId, {
      type: 'building', buildingType: BuildingType.PORT, civId: 5, health: 100, maxHealth: 100, level: 1
    })
    ;(sys as any).portShipCount.set(portId, 2)
    expect(() => (sys as any).decrementPortCount(em, 99)).not.toThrow()
  })
})

// ───────────────────────────────────────────���────
// describe 10: _combatGrid 复用池
// ────────────────────────────────────────────────
describe('NavalSystem — _combatGrid 复用池', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 多次后 _combatGrid 不无限增长', () => {
    const em = new EntityManager()
    const world = makeWorld() as any
    const cm = makeCivManager() as any
    const ps = makeParticles() as any
    for (let i = 0; i < 50; i++) sys.update(em, world, cm, ps, i)
    expect((sys as any)._combatGrid.size).toBeLessThan(1000)
  })

  it('_combatCellPool 在多次 update 后有缓存', () => {
    // 先添加一个 ship，让 combat grid 有内容
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'ship', shipType: 'warship', civId: 1, health: 100, maxHealth: 100, speed: 1, damage: 10, cargo: { food: 0, gold: 0, wood: 0 }, crew: 10, maxCrew: 10, targetX: 5, targetY: 5, state: 'sailing' })
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    const world = makeWorld() as any
    const cm = makeCivManager() as any
    const ps = makeParticles() as any
    sys.update(em, world, cm, ps, 0)
    // 不崩溃且 pool 结构正常
    expect(Array.isArray((sys as any)._combatCellPool)).toBe(true)
  })
})
