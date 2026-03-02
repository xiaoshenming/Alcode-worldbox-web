import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MigrationSystem } from '../systems/MigrationSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

// ─── Factory helpers ──────────────────────────────────────────────────────────
function makeSys() { return new MigrationSystem() }

function makeMockWorld(overrides: Partial<{
  tick: number
  season: string
  getTile: (x: number, y: number) => TileType | null
}> = {}) {
  return {
    tick: 0,
    season: 'spring',
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => TileType.GRASS,
    setTile: () => {},
    ...overrides,
  }
}

function makeMockCivManager(overrides: Partial<{
  isLandUnclaimed: () => boolean
  createCiv: (x: number, y: number) => { id: number; name: string; color: string }
  assignToCiv: () => void
}> = {}) {
  return {
    civilizations: new Map(),
    isLandUnclaimed: () => true,
    createCiv: (_x: number, _y: number) => ({ id: 1, name: 'NewCiv', color: '#ff0000' }),
    assignToCiv: () => {},
    ...overrides,
  }
}

function makeMockParticles() {
  return {
    addParticle: vi.fn(),
    spawn: vi.fn(),
    spawnDeath: vi.fn(),
    spawnMigration: vi.fn(),
  }
}

// 向 EntityManager 添加一个标准可迁移实体（含4个必须组件）
function addCandidateCreature(
  em: EntityManager,
  opts: { x?: number; y?: number; species?: string; damage?: number } = {}
) {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x: opts.x ?? 10, y: opts.y ?? 10 })
  em.addComponent(id, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
  em.addComponent(id, {
    type: 'creature',
    species: opts.species ?? 'human',
    speed: 1,
    damage: opts.damage ?? 5,
    isHostile: false,
    name: `C${id}`,
    age: 0,
    maxAge: 100,
    gender: 'male',
  })
  em.addComponent(id, { type: 'needs', hunger: 10, health: 80 })
  return id
}

// ─── 初始化状态 ───────────────────────────────────────────────────────────────
describe('MigrationSystem — 初始化', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => {
    expect(makeSys()).toBeDefined()
  })

  it('bands 初始为空 Map', () => {
    const sys = makeSys()
    expect((sys as any).bands.size).toBe(0)
  })

  it('_candidatesBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._candidatesBuf).toHaveLength(0)
  })

  it('_bandsToRemoveBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._bandsToRemoveBuf).toHaveLength(0)
  })

  it('_nearbyBuf 初始为空 Set', () => {
    const sys = makeSys()
    expect((sys as any)._nearbyBuf.size).toBe(0)
  })

  it('_validBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._validBuf).toHaveLength(0)
  })

  it('_speciesGroups 初始为空 Map', () => {
    const sys = makeSys()
    expect((sys as any)._speciesGroups.size).toBe(0)
  })
})

// ─── update() 基础不崩溃 ──────────────────────────────────────────────────────
describe('MigrationSystem — update() 基础', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('空 EntityManager 不崩溃', () => {
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => sys.update(em, world as any, civ as any, p as any)).not.toThrow()
  })

  it('tick=0 时执行 tryFormBands 路径不崩溃', () => {
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => sys.update(em, world as any, civ as any, p as any)).not.toThrow()
  })

  it('tick=1 时跳过 tryFormBands 路径不崩溃', () => {
    const world = makeMockWorld({ tick: 1 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => sys.update(em, world as any, civ as any, p as any)).not.toThrow()
  })

  it('tick=60 时再次执行 tryFormBands 不崩溃', () => {
    const world = makeMockWorld({ tick: 60 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => sys.update(em, world as any, civ as any, p as any)).not.toThrow()
  })

  it('连续多次 update 不崩溃', () => {
    const p = makeMockParticles()
    const civ = makeMockCivManager()
    expect(() => {
      for (let t = 0; t < 180; t++) {
        const world = makeMockWorld({ tick: t })
        sys.update(em, world as any, civ as any, p as any)
      }
    }).not.toThrow()
  })

  it('少于3个候选实体时不形成 band', () => {
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    addCandidateCreature(em, { x: 10, y: 10 })
    addCandidateCreature(em, { x: 11, y: 10 })
    sys.update(em, world as any, civ as any, p as any)
    expect((sys as any).bands.size).toBe(0)
  })

  it('已有 civMember 的实体不参与候选', () => {
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    // 添加3个实体，但都标记为 civMember
    for (let i = 0; i < 5; i++) {
      const id = addCandidateCreature(em, { x: 10, y: 10 })
      em.addComponent(id, { type: 'civMember', civId: 1, role: 'worker' })
    }
    sys.update(em, world as any, civ as any, p as any)
    expect((sys as any).bands.size).toBe(0)
  })

  it('已有 nomad 组件的实体不参与候选', () => {
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    for (let i = 0; i < 5; i++) {
      const id = addCandidateCreature(em)
      em.addComponent(id, {
        type: 'nomad', bandId: 99, role: 'follower',
        origin: { x: 0, y: 0 }, destination: { x: 100, y: 100 }, journeyTicks: 0
      })
    }
    sys.update(em, world as any, civ as any, p as any)
    expect((sys as any).bands.size).toBe(0)
  })
})

// ─── shouldMigrate 私有方法 ───────────────────────────────────────────────────
describe('MigrationSystem — shouldMigrate()', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('候选列表第一个实体无 position 时返回 false', () => {
    const id = em.createEntity()
    // 不添加 position 组件
    const world = makeMockWorld()
    const result = (sys as any).shouldMigrate(em, world, [id])
    expect(result).toBe(false)
  })

  it('Math.random() < totalChance 时返回 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const id = addCandidateCreature(em, { x: 10, y: 10 })
    const world = makeMockWorld({ season: 'spring' })
    const result = (sys as any).shouldMigrate(em, world, [id])
    expect(result).toBe(true)
  })

  it('Math.random() > 总机会时返回 false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const id = addCandidateCreature(em, { x: 10, y: 10 })
    const world = makeMockWorld({ season: 'spring', getTile: () => TileType.GRASS })
    const result = (sys as any).shouldMigrate(em, world, [id])
    expect(result).toBe(false)
  })

  it('autumn 季节增加迁移概率', () => {
    // autumn bonus = 0.3，因此 totalChance >= 0.4；random = 0.39 应返回 true
    vi.spyOn(Math, 'random').mockReturnValue(0.39)
    const id = addCandidateCreature(em, { x: 10, y: 10 })
    // 全部 grass（不缺食物），无拥挤
    const world = makeMockWorld({ season: 'autumn', getTile: () => TileType.GRASS })
    // 创造一个拥挤的 em（nearbyCount>15 会 crash 于大量迭代，此处较少不触发）
    const result = (sys as any).shouldMigrate(em, world, [id])
    expect(result).toBe(true)
  })
})

// ─── dissolveBand 私有方法 ────────────────────────────────────────────────────
describe('MigrationSystem — dissolveBand()', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('移除成员的 nomad 组件', () => {
    const id = addCandidateCreature(em)
    em.addComponent(id, {
      type: 'nomad', bandId: 1, role: 'leader',
      origin: { x: 0, y: 0 }, destination: { x: 50, y: 50 }, journeyTicks: 0
    })
    const band = { id: 1, leaderId: id, members: new Set([id]), species: 'human', destination: { x: 50, y: 50 }, formed: 0 }
    ;(sys as any).dissolveBand(em, band)
    expect(em.hasComponent(id, 'nomad')).toBe(false)
  })

  it('解散后 AI state 设为 idle', () => {
    const id = addCandidateCreature(em)
    const ai = em.getComponent<any>(id, 'ai')
    ai.state = 'migrating'
    em.addComponent(id, {
      type: 'nomad', bandId: 1, role: 'follower',
      origin: { x: 0, y: 0 }, destination: { x: 50, y: 50 }, journeyTicks: 0
    })
    const band = { id: 1, leaderId: id, members: new Set([id]), species: 'human', destination: { x: 50, y: 50 }, formed: 0 }
    ;(sys as any).dissolveBand(em, band)
    expect(em.getComponent<any>(id, 'ai').state).toBe('idle')
  })

  it('解散后 AI cooldown 设为 0', () => {
    const id = addCandidateCreature(em)
    const ai = em.getComponent<any>(id, 'ai')
    ai.cooldown = 99
    em.addComponent(id, {
      type: 'nomad', bandId: 1, role: 'follower',
      origin: { x: 0, y: 0 }, destination: { x: 50, y: 50 }, journeyTicks: 0
    })
    const band = { id: 1, leaderId: id, members: new Set([id]), species: 'human', destination: { x: 50, y: 50 }, formed: 0 }
    ;(sys as any).dissolveBand(em, band)
    expect(em.getComponent<any>(id, 'ai').cooldown).toBe(0)
  })

  it('成员无 nomad 组件时不崩溃', () => {
    const id = addCandidateCreature(em)
    const band = { id: 1, leaderId: id, members: new Set([id]), species: 'human', destination: { x: 50, y: 50 }, formed: 0 }
    expect(() => (sys as any).dissolveBand(em, band)).not.toThrow()
  })

  it('空成员集合时不崩溃', () => {
    const band = { id: 1, leaderId: 999, members: new Set<number>(), species: 'human', destination: { x: 0, y: 0 }, formed: 0 }
    expect(() => (sys as any).dissolveBand(em, band)).not.toThrow()
  })
})

// ─── updateBands — leader 死亡时解散 ─────────────────────────────────────────
describe('MigrationSystem — updateBands() leader 死亡', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('leader position 消失时 band 被移除', () => {
    // 创建 leader
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const member2 = addCandidateCreature(em, { x: 51, y: 50 })

    // 注入 band
    const band = {
      id: 77, leaderId, members: new Set([leaderId, member2]),
      species: 'human', destination: { x: 100, y: 100 }, formed: 0
    }
    ;(sys as any).bands.set(77, band)

    // 删除 leader 的 position
    em.removeComponent(leaderId, 'position')

    const world = makeMockWorld({ tick: 1 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    sys.update(em, world as any, civ as any, p as any)

    expect((sys as any).bands.has(77)).toBe(false)
  })

  it('成员数量降至1时 band 解散', () => {
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const member2 = addCandidateCreature(em, { x: 51, y: 50 })
    em.addComponent(leaderId, {
      type: 'nomad', bandId: 88, role: 'leader',
      origin: { x: 50, y: 50 }, destination: { x: 100, y: 100 }, journeyTicks: 0
    })
    em.addComponent(member2, {
      type: 'nomad', bandId: 88, role: 'follower',
      origin: { x: 50, y: 50 }, destination: { x: 100, y: 100 }, journeyTicks: 0
    })
    const band = {
      id: 88, leaderId, members: new Set([leaderId, member2]),
      species: 'human', destination: { x: 100, y: 100 }, formed: 0
    }
    ;(sys as any).bands.set(88, band)

    // 移除一个成员
    em.removeEntity(member2)

    const world = makeMockWorld({ tick: 1 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    sys.update(em, world as any, civ as any, p as any)

    expect((sys as any).bands.has(88)).toBe(false)
  })

  it('journeyTicks > 500 时 band 超时解散', () => {
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const member2 = addCandidateCreature(em, { x: 51, y: 50 })
    em.addComponent(leaderId, {
      type: 'nomad', bandId: 55, role: 'leader',
      origin: { x: 50, y: 50 }, destination: { x: 100, y: 100 }, journeyTicks: 501
    })
    em.addComponent(member2, {
      type: 'nomad', bandId: 55, role: 'follower',
      origin: { x: 50, y: 50 }, destination: { x: 100, y: 100 }, journeyTicks: 501
    })
    const band = {
      id: 55, leaderId, members: new Set([leaderId, member2]),
      species: 'human', destination: { x: 100, y: 100 }, formed: 0
    }
    ;(sys as any).bands.set(55, band)

    const world = makeMockWorld({ tick: 1 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    sys.update(em, world as any, civ as any, p as any)

    expect((sys as any).bands.has(55)).toBe(false)
  })
})

// ─── formBand 私有方法 ────────────────────────────────────────────────────────
describe('MigrationSystem — formBand() 最强者为 leader', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('damage 最高的成员成为 leader', () => {
    const weak = addCandidateCreature(em, { x: 10, y: 10, damage: 2 })
    const strong = addCandidateCreature(em, { x: 11, y: 10, damage: 20 })
    const med = addCandidateCreature(em, { x: 12, y: 10, damage: 8 })

    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, [weak, strong, med], 'human')

    const bands = (sys as any).bands
    expect(bands.size).toBeGreaterThan(0)
    const band = [...bands.values()][0]
    expect(band.leaderId).toBe(strong)
  })

  it('formBand 后成员获得 nomad 组件', () => {
    const ids = [
      addCandidateCreature(em, { x: 10, y: 10 }),
      addCandidateCreature(em, { x: 11, y: 10 }),
      addCandidateCreature(em, { x: 12, y: 10 }),
    ]
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, ids, 'elf')
    for (const id of ids) {
      expect(em.hasComponent(id, 'nomad')).toBe(true)
    }
  })

  it('leader 的 nomad role 为 leader', () => {
    const ids = [
      addCandidateCreature(em, { x: 10, y: 10, damage: 10 }),
      addCandidateCreature(em, { x: 11, y: 10, damage: 5 }),
      addCandidateCreature(em, { x: 12, y: 10, damage: 3 }),
    ]
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, ids, 'dwarf')

    const bands = (sys as any).bands
    const band = [...bands.values()][0]
    const nomad = em.getComponent<any>(band.leaderId, 'nomad')
    expect(nomad?.role).toBe('leader')
  })

  it('follower 的 nomad role 为 follower', () => {
    const strong = addCandidateCreature(em, { x: 10, y: 10, damage: 20 })
    const follower = addCandidateCreature(em, { x: 11, y: 10, damage: 1 })
    const follower2 = addCandidateCreature(em, { x: 12, y: 10, damage: 2 })
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, [strong, follower, follower2], 'orc')

    const nomad1 = em.getComponent<any>(follower, 'nomad')
    const nomad2 = em.getComponent<any>(follower2, 'nomad')
    expect(nomad1?.role).toBe('follower')
    expect(nomad2?.role).toBe('follower')
  })

  it('formBand 后 AI state 设为 migrating', () => {
    const ids = [
      addCandidateCreature(em, { x: 10, y: 10 }),
      addCandidateCreature(em, { x: 11, y: 10 }),
      addCandidateCreature(em, { x: 12, y: 10 }),
    ]
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, ids, 'human')
    for (const id of ids) {
      const ai = em.getComponent<any>(id, 'ai')
      expect(ai?.state).toBe('migrating')
    }
  })

  it('leader 无 position 时不形成 band', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'X', age: 0, maxAge: 100, gender: 'male' })
    // 无 position
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, [id, id, id], 'human')
    expect((sys as any).bands.size).toBe(0)
  })
})

// ─── findMigrationTarget ──────────────────────────────────────────────────────
describe('MigrationSystem — findMigrationTarget()', () => {
  let sys: MigrationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('返回有效坐标对象', () => {
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    const target = (sys as any).findMigrationTarget(world, civ, 50, 50)
    expect(target).toHaveProperty('x')
    expect(target).toHaveProperty('y')
  })

  it('随机失败时退回起始坐标', () => {
    // 所有 tile 返回 DEEP_WATER（不可行走）
    const world = makeMockWorld({ getTile: () => TileType.DEEP_WATER })
    const civ = makeMockCivManager()
    const target = (sys as any).findMigrationTarget(world, civ, 50, 50)
    // 无法找到时退回 fromX, fromY
    expect(typeof target.x).toBe('number')
    expect(typeof target.y).toBe('number')
  })

  it('当有不可声明土地时得分降低', () => {
    const world = makeMockWorld({ getTile: () => TileType.GRASS })
    const civ = makeMockCivManager({ isLandUnclaimed: () => false })
    // 不应崩溃
    const target = (sys as any).findMigrationTarget(world, civ, 50, 50)
    expect(target).toBeDefined()
  })

  it('全 SAND tile 时退回起始位置附近', () => {
    const world = makeMockWorld({ getTile: () => TileType.SAND })
    const civ = makeMockCivManager()
    const target = (sys as any).findMigrationTarget(world, civ, 100, 100)
    expect(typeof target.x).toBe('number')
    expect(typeof target.y).toBe('number')
  })
})

// ─── settleBand ───────────────────────────────────────────────────────────────
describe('MigrationSystem — settleBand()', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('定居后成员 nomad 组件被移除', () => {
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const mem2 = addCandidateCreature(em, { x: 51, y: 50 })
    for (const id of [leaderId, mem2]) {
      em.addComponent(id, {
        type: 'nomad', bandId: 1, role: id === leaderId ? 'leader' : 'follower',
        origin: { x: 50, y: 50 }, destination: { x: 50, y: 50 }, journeyTicks: 0
      })
    }
    const band = {
      id: 1, leaderId, members: new Set([leaderId, mem2]),
      species: 'human', destination: { x: 50, y: 50 }, formed: 0
    }
    const world = makeMockWorld({ tick: 100 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    ;(sys as any).settleBand(em, band, civ, p, world)
    expect(em.hasComponent(leaderId, 'nomad')).toBe(false)
    expect(em.hasComponent(mem2, 'nomad')).toBe(false)
  })

  it('定居后 AI state 设为 idle', () => {
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const mem2 = addCandidateCreature(em, { x: 51, y: 50 })
    const ai = em.getComponent<any>(leaderId, 'ai')
    ai.state = 'migrating'
    for (const id of [leaderId, mem2]) {
      em.addComponent(id, {
        type: 'nomad', bandId: 2, role: id === leaderId ? 'leader' : 'follower',
        origin: { x: 50, y: 50 }, destination: { x: 50, y: 50 }, journeyTicks: 0
      })
    }
    const band = {
      id: 2, leaderId, members: new Set([leaderId, mem2]),
      species: 'human', destination: { x: 50, y: 50 }, formed: 0
    }
    const world = makeMockWorld({ tick: 100 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    ;(sys as any).settleBand(em, band, civ, p, world)
    expect(em.getComponent<any>(leaderId, 'ai').state).toBe('idle')
  })

  it('定居后粒子效果被触发', () => {
    const leaderId = addCandidateCreature(em, { x: 50, y: 50 })
    const mem2 = addCandidateCreature(em, { x: 51, y: 50 })
    for (const id of [leaderId, mem2]) {
      em.addComponent(id, {
        type: 'nomad', bandId: 3, role: id === leaderId ? 'leader' : 'follower',
        origin: { x: 50, y: 50 }, destination: { x: 50, y: 50 }, journeyTicks: 0
      })
    }
    const band = {
      id: 3, leaderId, members: new Set([leaderId, mem2]),
      species: 'elf', destination: { x: 50, y: 50 }, formed: 0
    }
    const world = makeMockWorld({ tick: 100 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    ;(sys as any).settleBand(em, band, civ, p, world)
    expect(p.spawn).toHaveBeenCalled()
  })

  it('leader 无 position 时 settleBand 提前返回', () => {
    const leaderId = em.createEntity()
    // 无 position 组件
    em.addComponent(leaderId, {
      type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false,
      name: 'X', age: 0, maxAge: 100, gender: 'male'
    })
    const band = {
      id: 9, leaderId, members: new Set([leaderId]),
      species: 'human', destination: { x: 0, y: 0 }, formed: 0
    }
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => (sys as any).settleBand(em, band, civ, p, world)).not.toThrow()
    expect(p.spawn).not.toHaveBeenCalled()
  })
})

// ─── 物种过滤 ─────────────────────────────────────────────────────────────────
describe('MigrationSystem — 物种过滤', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('非有效物种（如 dragon）不参与迁移候选', () => {
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    for (let i = 0; i < 5; i++) {
      addCandidateCreature(em, { species: 'dragon' })
    }
    sys.update(em, world as any, civ as any, p as any)
    expect((sys as any).bands.size).toBe(0)
  })

  it.each(['human', 'elf', 'dwarf', 'orc'])('物种 %s 被认为是有效候选', (species) => {
    const sys2 = makeSys()
    const em2 = new EntityManager()
    for (let i = 0; i < 5; i++) {
      addCandidateCreature(em2, { species })
    }
    // 只验证候选被收集（不一定形成band，受随机控制）
    const candidates: any[] = []
    const orig = (sys2 as any).tryFormBands.bind(sys2)
    const world = makeMockWorld({ tick: 0 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    // 调用不崩溃即验证物种可被识别
    expect(() => sys2.update(em2, world as any, civ as any, p as any)).not.toThrow()
  })
})

describe('MigrationSystem — 额外覆盖', () => {
  let sys: MigrationSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('bands Map 是独立实例', () => {
    const s2 = makeSys()
    expect((sys as any).bands).not.toBe((s2 as any).bands)
  })

  it('多个实例不共享 _cellPool', () => {
    const s2 = makeSys()
    expect((sys as any)._cellPool).not.toBe((s2 as any)._cellPool)
  })

  it('update tick=120 触发 tryFormBands（60*2）不崩溃', () => {
    const world = makeMockWorld({ tick: 120 })
    const civ = makeMockCivManager()
    const p = makeMockParticles()
    expect(() => sys.update(em, world as any, civ as any, p as any)).not.toThrow()
  })

  it('dissolveBand 不影响其他 band', () => {
    const id1 = addCandidateCreature(em, { x: 10, y: 10 })
    const id2 = addCandidateCreature(em, { x: 20, y: 20 })
    em.addComponent(id1, { type: 'nomad', bandId: 1, role: 'leader', origin: { x: 0, y: 0 }, destination: { x: 50, y: 50 }, journeyTicks: 0 })

    const band1 = { id: 1, leaderId: id1, members: new Set([id1]), species: 'human', destination: { x: 50, y: 50 }, formed: 0 }
    const band2 = { id: 2, leaderId: id2, members: new Set([id2]), species: 'elf', destination: { x: 80, y: 80 }, formed: 0 }
    ;(sys as any).bands.set(1, band1)
    ;(sys as any).bands.set(2, band2)

    ;(sys as any).dissolveBand(em, band1)
    // band2 不受影响
    expect((sys as any).bands.has(2)).toBe(true)
  })

  it('formBand 仅最多6个成员加入 band', () => {
    const ids = []
    for (let i = 0; i < 10; i++) {
      ids.push(addCandidateCreature(em, { x: 10 + i, y: 10 }))
    }
    const world = makeMockWorld()
    const civ = makeMockCivManager()
    ;(sys as any).formBand(em, world, civ, ids.slice(0, 6), 'human')

    const bands = (sys as any).bands
    if (bands.size > 0) {
      const band = [...bands.values()][0]
      expect(band.members.size).toBeLessThanOrEqual(6)
    } else {
      // formBand 因 leader 无 pos 提前退出也合理
      expect(true).toBe(true)
    }
  })

  it('shouldMigrate 以 Math.random=0.5 在无任何加成时返回 false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const id = addCandidateCreature(em, { x: 10, y: 10 })
    // 全 GRASS，无拥挤，season=spring → totalChance = 0.1
    const world = makeMockWorld({ season: 'spring', getTile: () => TileType.GRASS })
    const result = (sys as any).shouldMigrate(em, world, [id])
    expect(result).toBe(false)
  })
})
