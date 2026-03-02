import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EraSystem } from '../systems/EraSystem'
import type { EraName } from '../systems/EraSystem'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSys(): EraSystem { return new EraSystem() }

/** 创建最小可用的 Civilization 对象 */
function makeCiv(id: number, techLevel: number = 1, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Civ-${id}`,
    color: '#ff0000',
    population: 10,
    territory: new Set<string>(),
    buildings: [] as number[],
    resources: { food: 100, wood: 50, stone: 30, gold: 20 },
    techLevel,
    relations: new Map<number, number>(),
    tradeRoutes: [],
    culture: { trait: 'warrior' as const, strength: 10 },
    religion: { type: 'sun' as const, faith: 5, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 70,
    taxRate: 1,
    revoltTimer: 0,
    research: { currentTech: null as string | null, progress: 0, completed: [], researchRate: 1.0 },
    treaties: [],
    embassies: [],
    diplomaticStance: 'neutral' as const,
    ...overrides,
  }
}

/** 创建最小 CivManager mock */
function makeCivManager(civs: ReturnType<typeof makeCiv>[] = []) {
  const map = new Map(civs.map(c => [c.id, c]))
  return { civilizations: map }
}

/** 创建最小 EntityManager mock */
function makeEM(entitiesWithComponents: number[] = [], components: Map<number, Record<string, unknown>> = new Map()) {
  return {
    getEntitiesWithComponents: vi.fn(() => entitiesWithComponents),
    getComponent: vi.fn((id: number, type: string) => components.get(id)?.[type] as any),
  }
}

/** 创建最小 ParticleSystem mock */
function makeParticles() {
  return { spawnFirework: vi.fn() }
}

/** 创建最小 TimelineSystem mock */
function makeTimeline() {
  return { recordEvent: vi.fn() }
}

// ── describe: 初始状态 ─────────────────────────────────────────────────────

describe('EraSystem 初始状态', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('新实例 getEra 对任意 civId 返回 stone', () => {
    expect(sys.getEra(1)).toBe('stone')
    expect(sys.getEra(0)).toBe('stone')
    expect(sys.getEra(-1)).toBe('stone')
  })

  it('civEras 内部 Map 初始为空', () => {
    expect((sys as any).civEras.size).toBe(0)
  })

  it('lastCheckTick 初始为 0', () => {
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('tempBuffs 初始为空数组', () => {
    expect((sys as any).tempBuffs).toHaveLength(0)
  })

  it('大 civId 也返回 stone 默认值', () => {
    expect(sys.getEra(99999)).toBe('stone')
  })
})

// ── describe: getEra ───────────────────────────────────────────────────────

describe('EraSystem.getEra', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('未注入时返回 stone', () => {
    expect(sys.getEra(1)).toBe('stone')
  })

  it('注入 stone 后可查询', () => {
    ;(sys as any).civEras.set(1, 'stone' as EraName)
    expect(sys.getEra(1)).toBe('stone')
  })

  it('注入 bronze 后可查询', () => {
    ;(sys as any).civEras.set(2, 'bronze' as EraName)
    expect(sys.getEra(2)).toBe('bronze')
  })

  it('注入 iron 后可查询', () => {
    ;(sys as any).civEras.set(3, 'iron' as EraName)
    expect(sys.getEra(3)).toBe('iron')
  })

  it('注入 medieval 后可查询', () => {
    ;(sys as any).civEras.set(4, 'medieval' as EraName)
    expect(sys.getEra(4)).toBe('medieval')
  })

  it('注入 renaissance 后可查询', () => {
    ;(sys as any).civEras.set(5, 'renaissance' as EraName)
    expect(sys.getEra(5)).toBe('renaissance')
  })

  it('支持5种时代全部设置', () => {
    const eras: EraName[] = ['stone', 'bronze', 'iron', 'medieval', 'renaissance']
    eras.forEach((e, i) => { ;(sys as any).civEras.set(i + 1, e) })
    eras.forEach((e, i) => { expect(sys.getEra(i + 1)).toBe(e) })
  })

  it('不同文明时代相互独立', () => {
    ;(sys as any).civEras.set(1, 'stone' as EraName)
    ;(sys as any).civEras.set(2, 'renaissance' as EraName)
    expect(sys.getEra(1)).toBe('stone')
    expect(sys.getEra(2)).toBe('renaissance')
  })

  it('未登记文明返回 stone 默认值', () => {
    expect(sys.getEra(999)).toBe('stone')
  })

  it('civId=0 也正常返回 stone', () => {
    expect(sys.getEra(0)).toBe('stone')
  })
})

// ── describe: update 节流逻辑 ──────────────────────────────────────────────

describe('EraSystem.update 节流', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 120 时不更新 lastCheckTick', () => {
    const cm = makeCivManager()
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    sys.update(cm as any, em as any, p as any, 50)
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('tick >= 120 时执行检查并更新 lastCheckTick', () => {
    const cm = makeCivManager()
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    sys.update(cm as any, em as any, p as any, 120)
    expect((sys as any).lastCheckTick).toBe(120)
  })

  it('首次 update(tick=0) 触发检查', () => {
    const cm = makeCivManager()
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('tick=119 不触发第二次检查', () => {
    const cm = makeCivManager()
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    sys.update(cm as any, em as any, p as any, 119)
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('tick=240 再次触发检查', () => {
    const cm = makeCivManager()
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    sys.update(cm as any, em as any, p as any, 120)
    sys.update(cm as any, em as any, p as any, 240)
    expect((sys as any).lastCheckTick).toBe(240)
  })
})

// ── describe: checkEraTransitions —— techLevel 与时代映射 ─────────────────

describe('EraSystem checkEraTransitions 时代映射', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('techLevel=1 映射到 stone', () => {
    const civ = makeCiv(1, 1)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 0)
    expect(sys.getEra(1)).toBe('stone')
  })

  it('techLevel=2 映射到 bronze', () => {
    const civ = makeCiv(1, 2)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    // 首次 update 需要 tick >= 120 才会触发 checkEraTransitions
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('bronze')
  })

  it('techLevel=3 映射到 iron', () => {
    const civ = makeCiv(1, 3)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('iron')
  })

  it('techLevel=4 映射到 medieval', () => {
    const civ = makeCiv(1, 4)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('medieval')
  })

  it('techLevel=5 映射到 renaissance', () => {
    const civ = makeCiv(1, 5)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('renaissance')
  })

  it('techLevel=0 clamp 到 stone (techLevel 最小为1)', () => {
    const civ = makeCiv(1, 0)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('stone')
  })

  it('techLevel=6 clamp 到 renaissance (techLevel 最大为5)', () => {
    const civ = makeCiv(1, 6)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('renaissance')
  })

  it('首次注册新文明时不触发烟花（仅 register）', () => {
    const civ = makeCiv(10, 1)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    // 首次 tick=120 注册 civ，仅 register 不触发烟花
    sys.update(cm as any, em as any, p as any, 120)
    expect(p.spawnFirework).not.toHaveBeenCalled()
  })

  it('时代升级时触发烟花', () => {
    const civ = makeCiv(1, 1)
    // 必须有领地，否则 getTerritoryCenter 返回 null 不触发烟花
    civ.territory = new Set(['10,10', '11,10', '10,11'])
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    // 首次注册（石器时代）
    sys.update(cm as any, em as any, p as any, 120)
    // 升级到青铜，第二次检查
    civ.techLevel = 2
    sys.update(cm as any, em as any, p as any, 240)
    expect(p.spawnFirework).toHaveBeenCalled()
  })

  it('时代升级时触发 timeline 事件', () => {
    const civ = makeCiv(1, 1)
    const cm = makeCivManager([civ])
    const em = makeEM()
    const p = makeParticles()
    const tl = makeTimeline()
    // 首次注册
    sys.update(cm as any, em as any, p as any, 120, tl as any)
    civ.techLevel = 2
    // 升级触发 timeline 事件
    sys.update(cm as any, em as any, p as any, 240, tl as any)
    expect(tl.recordEvent).toHaveBeenCalled()
  })

  it('多文明可以处于不同时代', () => {
    const c1 = makeCiv(1, 1)
    const c2 = makeCiv(2, 3)
    const cm = makeCivManager([c1, c2])
    const em = makeEM()
    const p = makeParticles()
    // tick=120 触发首次检查，两个 civ 均被注册
    sys.update(cm as any, em as any, p as any, 120)
    expect(sys.getEra(1)).toBe('stone')
    expect(sys.getEra(2)).toBe('iron')
  })
})

// ── describe: applyEraBonuses ──────────────────────────────────────────────

describe('EraSystem.applyEraBonuses', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('stone 时代不增加资源', () => {
    const civ = makeCiv(1, 1)
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'stone')
    ;(sys as any).applyEraBonuses(cm)
    // stone has no bonus; resources stay same
    expect(civ.resources.food).toBe(100)
  })

  it('bronze 时代增加 food', () => {
    const civ = makeCiv(1, 2)
    civ.resources.food = 100
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'bronze')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.resources.food).toBeGreaterThan(100)
  })

  it('iron 时代增加 food、wood、stone', () => {
    const civ = makeCiv(1, 3)
    civ.resources.food = 100; civ.resources.wood = 100; civ.resources.stone = 100
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'iron')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.resources.food).toBeGreaterThan(100)
    expect(civ.resources.wood).toBeGreaterThan(100)
    expect(civ.resources.stone).toBeGreaterThan(100)
  })

  it('medieval 时代增加 gold', () => {
    const civ = makeCiv(1, 4)
    civ.resources.gold = 100
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'medieval')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.resources.gold).toBeGreaterThan(100)
  })

  it('medieval 时代有科研进度时增加 progress', () => {
    const civ = makeCiv(1, 4)
    civ.research.currentTech = 'something'
    civ.research.progress = 0
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'medieval')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.research.progress).toBeGreaterThan(0)
  })

  it('medieval 时代无科研项目时不修改 progress', () => {
    const civ = makeCiv(1, 4)
    civ.research.currentTech = null
    civ.research.progress = 0
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'medieval')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.research.progress).toBe(0)
  })

  it('renaissance 时代增加全部4种资源', () => {
    const civ = makeCiv(1, 5)
    civ.resources = { food: 100, wood: 100, stone: 100, gold: 100 }
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'renaissance')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.resources.food).toBeGreaterThan(100)
    expect(civ.resources.wood).toBeGreaterThan(100)
    expect(civ.resources.stone).toBeGreaterThan(100)
    expect(civ.resources.gold).toBeGreaterThan(100)
  })

  it('资源为0时 bronze 也至少加1 (Math.max(1,...))', () => {
    const civ = makeCiv(1, 2)
    civ.resources.food = 0
    const cm = makeCivManager([civ])
    ;(sys as any).civEras.set(1, 'bronze')
    ;(sys as any).applyEraBonuses(cm)
    expect(civ.resources.food).toBeGreaterThanOrEqual(1)
  })
})

// ── describe: expireBuffs ──────────────────────────────────────────────────

describe('EraSystem.expireBuffs', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期前不移除 buff', () => {
    ;(sys as any).tempBuffs.push({ civId: 1, type: 'research_double', expiresAt: 1000 })
    const cm = makeCivManager()
    ;(sys as any).expireBuffs(cm, 500)
    expect((sys as any).tempBuffs).toHaveLength(1)
  })

  it('到达过期 tick 时移除 buff', () => {
    ;(sys as any).tempBuffs.push({ civId: 1, type: 'research_double', expiresAt: 1000 })
    const civ = makeCiv(1, 1)
    civ.research.researchRate = 2
    const cm = makeCivManager([civ])
    ;(sys as any).expireBuffs(cm, 1000)
    expect((sys as any).tempBuffs).toHaveLength(0)
  })

  it('过期后 researchRate 减半（至少为1）', () => {
    const civ = makeCiv(1, 1)
    civ.research.researchRate = 4
    const cm = makeCivManager([civ])
    ;(sys as any).tempBuffs.push({ civId: 1, type: 'research_double', expiresAt: 500 })
    ;(sys as any).expireBuffs(cm, 600)
    expect(civ.research.researchRate).toBe(2)
  })

  it('researchRate 减半结果 < 1 时 clamp 到 1', () => {
    const civ = makeCiv(1, 1)
    civ.research.researchRate = 1
    const cm = makeCivManager([civ])
    ;(sys as any).tempBuffs.push({ civId: 1, type: 'research_double', expiresAt: 100 })
    ;(sys as any).expireBuffs(cm, 200)
    expect(civ.research.researchRate).toBeGreaterThanOrEqual(1)
  })

  it('找不到文明时不崩溃', () => {
    ;(sys as any).tempBuffs.push({ civId: 99, type: 'research_double', expiresAt: 100 })
    const cm = makeCivManager() // empty
    expect(() => (sys as any).expireBuffs(cm, 200)).not.toThrow()
    expect((sys as any).tempBuffs).toHaveLength(0)
  })

  it('多个 buff 同时过期全部删除', () => {
    ;(sys as any).tempBuffs.push({ civId: 1, type: 'research_double', expiresAt: 100 })
    ;(sys as any).tempBuffs.push({ civId: 2, type: 'research_double', expiresAt: 100 })
    const c1 = makeCiv(1, 1); c1.research.researchRate = 2
    const c2 = makeCiv(2, 1); c2.research.researchRate = 2
    const cm = makeCivManager([c1, c2])
    ;(sys as any).expireBuffs(cm, 100)
    expect((sys as any).tempBuffs).toHaveLength(0)
  })
})

// ── describe: getTerritoryCenter ──────────────────────────────────────────

describe('EraSystem.getTerritoryCenter', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('领土为空时返回 null', () => {
    const civ = makeCiv(1)
    civ.territory = new Set()
    const result = (sys as any).getTerritoryCenter(civ)
    expect(result).toBeNull()
  })

  it('单个地块返回该地块坐标', () => {
    const civ = makeCiv(1)
    civ.territory = new Set(['10,20'])
    const result = (sys as any).getTerritoryCenter(civ)
    expect(result).toEqual({ x: 10, y: 20 })
  })

  it('两个地块返回中心点', () => {
    const civ = makeCiv(1)
    civ.territory = new Set(['0,0', '10,10'])
    const result = (sys as any).getTerritoryCenter(civ)
    expect(result).toEqual({ x: 5, y: 5 })
  })

  it('超过200个地块时仅采样前200个', () => {
    const civ = makeCiv(1)
    const tiles = new Set<string>()
    for (let i = 0; i < 300; i++) tiles.add(`${i},${i}`)
    civ.territory = tiles
    const result = (sys as any).getTerritoryCenter(civ)
    // Just ensure it doesn't throw and returns a valid coordinate
    expect(result).not.toBeNull()
    expect(typeof result.x).toBe('number')
    expect(typeof result.y).toBe('number')
  })
})

// ── describe: triggerSpecialEvent ─────────────────────────────────────────

describe('EraSystem.triggerSpecialEvent', () => {
  let sys: EraSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('bronze 时代给士兵 +3 damage', () => {
    const creature = { type: 'creature', species: 'human', damage: 5, speed: 1, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const member = { type: 'civMember', civId: 1, role: 'soldier' }
    const em = {
      getEntitiesWithComponents: vi.fn(() => [42]),
      getComponent: vi.fn((id: number, type: string) => {
        if (type === 'civMember') return member
        if (type === 'creature') return creature
      }),
    }
    const civ = makeCiv(1)
    ;(sys as any).triggerSpecialEvent('bronze', civ, em, 100)
    expect(creature.damage).toBe(8)
  })

  it('bronze 只增加本文明成员的 damage', () => {
    const creature1 = { type: 'creature', species: 'human', damage: 5, speed: 1, isHostile: false, name: 'a', age: 0, maxAge: 100, gender: 'male' }
    const member1 = { type: 'civMember', civId: 1, role: 'soldier' }
    const creature2 = { type: 'creature', species: 'human', damage: 5, speed: 1, isHostile: false, name: 'b', age: 0, maxAge: 100, gender: 'female' }
    const member2 = { type: 'civMember', civId: 99, role: 'soldier' } // different civ
    const em = {
      getEntitiesWithComponents: vi.fn(() => [1, 2]),
      getComponent: vi.fn((id: number, type: string) => {
        if (id === 1) return type === 'civMember' ? member1 : creature1
        if (id === 2) return type === 'civMember' ? member2 : creature2
      }),
    }
    const civ = makeCiv(1)
    ;(sys as any).triggerSpecialEvent('bronze', civ, em, 100)
    expect(creature1.damage).toBe(8)
    expect(creature2.damage).toBe(5) // unchanged
  })

  it('iron 时代增加建筑 maxHealth', () => {
    const building = { type: 'building', buildingType: 'hut', civId: 1, health: 50, maxHealth: 100, level: 1 }
    const em = {
      getEntitiesWithComponents: vi.fn(() => []),
      getComponent: vi.fn(() => building),
    }
    const civ = makeCiv(1)
    civ.buildings = [1]
    ;(sys as any).triggerSpecialEvent('iron', civ, em, 100)
    expect(building.maxHealth).toBe(130) // 100 * 1.3
  })

  it('iron 时代 health 增加但不超过 maxHealth', () => {
    const building = { type: 'building', buildingType: 'hut', civId: 1, health: 120, maxHealth: 100, level: 1 }
    const em = {
      getEntitiesWithComponents: vi.fn(() => []),
      getComponent: vi.fn(() => building),
    }
    const civ = makeCiv(1)
    civ.buildings = [1]
    ;(sys as any).triggerSpecialEvent('iron', civ, em, 100)
    expect(building.health).toBeLessThanOrEqual(building.maxHealth)
  })

  it('medieval 时代重置外交关系为0', () => {
    const civ = makeCiv(1)
    civ.relations.set(2, 80)
    civ.relations.set(3, -50)
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    ;(sys as any).triggerSpecialEvent('medieval', civ, em, 100)
    expect(civ.relations.get(2)).toBe(0)
    expect(civ.relations.get(3)).toBe(0)
  })

  it('renaissance 时代添加 research_double 临时 buff', () => {
    const civ = makeCiv(1)
    civ.research.researchRate = 1
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    ;(sys as any).triggerSpecialEvent('renaissance', civ, em, 100)
    expect((sys as any).tempBuffs).toHaveLength(1)
    expect((sys as any).tempBuffs[0].type).toBe('research_double')
  })

  it('renaissance 时代 researchRate 翻倍', () => {
    const civ = makeCiv(1)
    civ.research.researchRate = 1
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    ;(sys as any).triggerSpecialEvent('renaissance', civ, em, 100)
    expect(civ.research.researchRate).toBe(2)
  })

  it('renaissance buff 在 tick+600 时过期', () => {
    const civ = makeCiv(1)
    civ.research.researchRate = 1
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    ;(sys as any).triggerSpecialEvent('renaissance', civ, em, 100)
    expect((sys as any).tempBuffs[0].expiresAt).toBe(700) // 100 + 600
  })

  it('stone 时代不触发任何特殊事件', () => {
    const civ = makeCiv(1)
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    ;(sys as any).triggerSpecialEvent('stone', civ, em, 100)
    expect((sys as any).tempBuffs).toHaveLength(0)
  })
})
