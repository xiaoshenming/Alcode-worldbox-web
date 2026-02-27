import { describe, it, expect, beforeEach } from 'vitest'
import { CivManager } from '../civilization/CivManager'
import { resetCivIdCounter } from '../civilization/Civilization'

// CivManager 构造函数需要 EntityManager 和 World，
// 但 getRelationLabel/getCultureBonus/getReligionXxxBonus/getCivAt/isLandUnclaimed
// 只访问 this.civilizations / this.territoryMap，不调用 em/world 方法。
// 用 as any mock 绕开复杂依赖。
function makeCivManager(): CivManager {
  const em = {
    getEntitiesWithComponent: () => [],
    getComponent: () => null,
    createEntity: () => 0,
    addComponent: () => {},
  } as any
  const world = {
    getTile: () => null,
    width: 200,
    height: 200,
  } as any
  return new CivManager(em, world)
}

// 快速构造一个最小 Civilization 对象插入 map
function insertCiv(
  cm: CivManager,
  id: number,
  overrides: Record<string, unknown> = {}
) {
  const civ = {
    id,
    name: `Civ${id}`,
    color: '#ff0000',
    population: 5,
    territory: new Set<string>(),
    buildings: [],
    resources: { food: 50, wood: 30, stone: 10, gold: 0 },
    techLevel: 1,
    relations: new Map<number, number>(),
    tradeRoutes: [],
    culture: { trait: 'warrior' as const, strength: 100 },
    religion: { type: 'sun' as const, faith: 100, temples: 1, blessing: null, blessingTimer: 0 },
    happiness: 70,
    taxRate: 1,
    revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1.0 },
    treaties: [],
    embassies: [],
    diplomaticStance: 'neutral' as const,
    ...overrides,
  }
  cm.civilizations.set(id, civ as any)
  return civ
}

beforeEach(() => {
  resetCivIdCounter()
})

// ── getRelationLabel ──────────────────────────────────────────────────────────

describe('CivManager.getRelationLabel', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('value > 50 → Allied', () => {
    expect(cm.getRelationLabel(51)).toBe('Allied')
    expect(cm.getRelationLabel(100)).toBe('Allied')
  })

  it('value 21-50 → Friendly', () => {
    expect(cm.getRelationLabel(21)).toBe('Friendly')
    expect(cm.getRelationLabel(50)).toBe('Friendly')
  })

  it('value -19 to 20 → Neutral', () => {
    expect(cm.getRelationLabel(0)).toBe('Neutral')
    expect(cm.getRelationLabel(20)).toBe('Neutral')
    expect(cm.getRelationLabel(-19)).toBe('Neutral')
  })

  it('value -49 to -20 → Hostile', () => {
    expect(cm.getRelationLabel(-20)).toBe('Hostile')
    expect(cm.getRelationLabel(-49)).toBe('Hostile')
  })

  it('value <= -50 → At War', () => {
    expect(cm.getRelationLabel(-50)).toBe('At War')
    expect(cm.getRelationLabel(-100)).toBe('At War')
  })
})

// ── getCultureBonus ────────────────────────────────────────────────────────────

describe('CivManager.getCultureBonus', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('civId 不存在时返回 1.0', () => {
    expect(cm.getCultureBonus(999, 'combat')).toBe(1.0)
  })

  it('warrior trait → combat bonus > 1.0', () => {
    insertCiv(cm, 1, { culture: { trait: 'warrior', strength: 100 } })
    expect(cm.getCultureBonus(1, 'combat')).toBeGreaterThan(1.0)
  })

  it('warrior trait → trade bonus = 1.0（不匹配）', () => {
    insertCiv(cm, 2, { culture: { trait: 'warrior', strength: 100 } })
    expect(cm.getCultureBonus(2, 'trade')).toBe(1.0)
  })

  it('merchant trait → trade bonus > 1.0', () => {
    insertCiv(cm, 3, { culture: { trait: 'merchant', strength: 100 } })
    expect(cm.getCultureBonus(3, 'trade')).toBeGreaterThan(1.0)
  })

  it('scholar trait → tech bonus > 1.0', () => {
    insertCiv(cm, 4, { culture: { trait: 'scholar', strength: 100 } })
    expect(cm.getCultureBonus(4, 'tech')).toBeGreaterThan(1.0)
  })

  it('nature trait → food bonus > 1.0', () => {
    insertCiv(cm, 5, { culture: { trait: 'nature', strength: 100 } })
    expect(cm.getCultureBonus(5, 'food')).toBeGreaterThan(1.0)
  })

  it('builder trait → buildSpeed bonus > 1.0', () => {
    insertCiv(cm, 6, { culture: { trait: 'builder', strength: 100 } })
    expect(cm.getCultureBonus(6, 'buildSpeed')).toBeGreaterThan(1.0)
  })

  it('builder trait → buildCost < 1.0（折扣）', () => {
    insertCiv(cm, 7, { culture: { trait: 'builder', strength: 100 } })
    expect(cm.getCultureBonus(7, 'buildCost')).toBeLessThan(1.0)
  })

  it('strength=0 时 bonus = 1.0', () => {
    insertCiv(cm, 8, { culture: { trait: 'warrior', strength: 0 } })
    expect(cm.getCultureBonus(8, 'combat')).toBe(1.0)
  })
})

// ── getReligionCombatBonus ────────────────────────────────────────────────────

describe('CivManager.getReligionCombatBonus', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('civId 不存在时返回 1.0', () => {
    expect(cm.getReligionCombatBonus(999)).toBe(1.0)
  })

  it('blessing=shield 时 bonus > 1.0', () => {
    insertCiv(cm, 1, { religion: { type: 'sun', faith: 100, temples: 1, blessing: 'shield', blessingTimer: 100 } })
    expect(cm.getReligionCombatBonus(1)).toBeGreaterThan(1.0)
  })

  it('blessing=null 时 bonus = 1.0', () => {
    insertCiv(cm, 2, { religion: { type: 'moon', faith: 100, temples: 1, blessing: null, blessingTimer: 0 } })
    expect(cm.getReligionCombatBonus(2)).toBe(1.0)
  })

  it('blessing=wisdom 时 combat bonus = 1.0（不匹配）', () => {
    insertCiv(cm, 3, { religion: { type: 'earth', faith: 100, temples: 1, blessing: 'wisdom', blessingTimer: 100 } })
    expect(cm.getReligionCombatBonus(3)).toBe(1.0)
  })

  it('faith=0 时 shield bonus 仍等于 1.0', () => {
    insertCiv(cm, 4, { religion: { type: 'sun', faith: 0, temples: 0, blessing: 'shield', blessingTimer: 10 } })
    expect(cm.getReligionCombatBonus(4)).toBe(1.0)
  })
})

// ── getReligionTechBonus ──────────────────────────────────────────────────────

describe('CivManager.getReligionTechBonus', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('civId 不存在时返回 1.0', () => {
    expect(cm.getReligionTechBonus(999)).toBe(1.0)
  })

  it('blessing=wisdom 时 tech bonus > 1.0', () => {
    insertCiv(cm, 1, { religion: { type: 'ancestor', faith: 100, temples: 1, blessing: 'wisdom', blessingTimer: 100 } })
    expect(cm.getReligionTechBonus(1)).toBeGreaterThan(1.0)
  })

  it('blessing=shield 时 tech bonus = 1.0（不匹配）', () => {
    insertCiv(cm, 2, { religion: { type: 'sun', faith: 100, temples: 1, blessing: 'shield', blessingTimer: 100 } })
    expect(cm.getReligionTechBonus(2)).toBe(1.0)
  })
})

// ── getCivAt ─────────────────────────────────────────────────────────────────

describe('CivManager.getCivAt', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('越界坐标返回 null', () => {
    expect(cm.getCivAt(-1, 0)).toBeNull()
    expect(cm.getCivAt(0, -1)).toBeNull()
    expect(cm.getCivAt(200, 0)).toBeNull()
    expect(cm.getCivAt(0, 200)).toBeNull()
  })

  it('未被认领的区域返回 null', () => {
    expect(cm.getCivAt(10, 10)).toBeNull()
  })

  it('手动设置 territoryMap 后返回对应 civ', () => {
    const civ = insertCiv(cm, 42)
    cm.territoryMap[5][5] = 42
    expect(cm.getCivAt(5, 5)).toBe(civ as any)
  })
})

// ── isLandUnclaimed ───────────────────────────────────────────────────────────

describe('CivManager.isLandUnclaimed', () => {
  let cm: CivManager

  beforeEach(() => {
    cm = makeCivManager()
  })

  it('全空地图时返回 true', () => {
    expect(cm.isLandUnclaimed(50, 50, 5)).toBe(true)
  })

  it('圆形范围内有声索地时返回 false', () => {
    insertCiv(cm, 1)
    cm.territoryMap[50][50] = 1
    expect(cm.isLandUnclaimed(50, 50, 5)).toBe(false)
  })

  it('圆形范围外的声索地不影响结果', () => {
    insertCiv(cm, 1)
    // radius=3，距离中心 100 的地方设置领土
    cm.territoryMap[150][150] = 1
    expect(cm.isLandUnclaimed(50, 50, 3)).toBe(true)
  })
})
