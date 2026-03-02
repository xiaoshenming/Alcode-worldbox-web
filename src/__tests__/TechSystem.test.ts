import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TechSystem } from '../systems/TechSystem'
import type { Civilization } from '../civilization/Civilization'
import { TECHNOLOGIES, TECH_TREE } from '../civilization/Civilization'

// ----------------------------------------------------------------
// 辅助工厂
// ----------------------------------------------------------------

function makeCiv(overrides: Partial<Civilization> = {}): Civilization {
  return {
    id: 1, name: 'Test', color: '#fff', population: 10,
    territory: new Set(), buildings: [],
    resources: { food: 100, wood: 100, stone: 100, gold: 100 },
    techLevel: 1,
    relations: new Map(), tradeRoutes: [],
    culture: { trait: 'military' as any, strength: 50 },
    religion: { type: 'none' as any, faith: 0, temples: 0, blessing: null, blessingTimer: 0 },
    happiness: 50, taxRate: 1, revoltTimer: 0,
    research: { currentTech: null, progress: 0, completed: [], researchRate: 1 },
    treaties: [], embassies: [], diplomaticStance: 'neutral',
    ...overrides
  } as Civilization
}

function makeSys() { return new TechSystem() }

// ----------------------------------------------------------------
// 基础实例化
// ----------------------------------------------------------------

describe('TechSystem 基础实例化', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可以实例化', () => {
    expect(sys).toBeDefined()
    expect(sys).toBeInstanceOf(TechSystem)
  })

  it('初始 tickCounter 为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('_availBuf 初始为空数组', () => {
    expect((sys as any)._availBuf).toHaveLength(0)
  })
})

// ----------------------------------------------------------------
// TechSystem.hasTech
// ----------------------------------------------------------------

describe('TechSystem.hasTech 静态方法', () => {
  afterEach(() => vi.restoreAllMocks())

  it('未研究任何技术时返回 false', () => {
    const civ = makeCiv()
    expect(TechSystem.hasTech(civ, 'archery')).toBe(false)
  })

  it('已完成的技术返回 true', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['archery'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'archery')).toBe(true)
  })

  it('completed 有多个技术时精确匹配', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture', 'Writing'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'Writing')).toBe(true)
    expect(TechSystem.hasTech(civ, 'Bronze Working')).toBe(false)
  })

  it('大小写敏感匹配', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'agriculture')).toBe(false)
  })

  it('空字符串不在 completed 中返回 false', () => {
    const civ = makeCiv()
    expect(TechSystem.hasTech(civ, '')).toBe(false)
  })

  it('completed 为空时始终返回 false', () => {
    const civ = makeCiv()
    expect(TechSystem.hasTech(civ, 'Tool Making')).toBe(false)
  })

  it('completed 包含 Agriculture 时 hasTech("Agriculture") 为 true', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'Agriculture')).toBe(true)
  })

  it('hasTech Writing', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Writing'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'Writing')).toBe(true)
  })

  it('hasTech Gunpowder（Level 5 技术）', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Gunpowder'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'Gunpowder')).toBe(true)
  })

  it('仅有一个 tech 时的边界', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Medicine'], researchRate: 1 } })
    expect(TechSystem.hasTech(civ, 'Medicine')).toBe(true)
    expect(TechSystem.hasTech(civ, 'Mathematics')).toBe(false)
  })
})

// ----------------------------------------------------------------
// TechSystem.getTechBonus
// ----------------------------------------------------------------

describe('TechSystem.getTechBonus 静态方法', () => {
  afterEach(() => vi.restoreAllMocks())

  it('无完成技术时所有 bonus 均为 0', () => {
    const civ = makeCiv()
    expect(TechSystem.getTechBonus(civ, 'attack')).toBe(0)
    expect(TechSystem.getTechBonus(civ, 'food_bonus')).toBe(0)
    expect(TechSystem.getTechBonus(civ, 'research_speed')).toBe(0)
  })

  it('完成 Agriculture 后 food_bonus 大于 0', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    const bonus = TechSystem.getTechBonus(civ, 'food_bonus')
    expect(bonus).toBeGreaterThan(0)
  })

  it('完成 Agriculture 后 food_bonus 为 0.2', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'food_bonus')).toBeCloseTo(0.2)
  })

  it('完成 Tool Making 后 gather_speed 为 0.15', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Tool Making'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'gather_speed')).toBeCloseTo(0.15)
  })

  it('完成 Writing 后 research_speed 为 0.25', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Writing'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'research_speed')).toBeCloseTo(0.25)
  })

  it('完成 Iron Forging 后 combat_bonus 为 0.2', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Iron Forging'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'combat_bonus')).toBeCloseTo(0.2)
  })

  it('完成 Gunpowder 后 combat_bonus 为 0.5', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Gunpowder'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'combat_bonus')).toBeCloseTo(0.5)
  })

  it('同类型 bonus 多个技术可累加', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Iron Forging', 'Gunpowder'], researchRate: 1 } })
    // Iron Forging: 0.2, Gunpowder: 0.5 => 0.7
    expect(TechSystem.getTechBonus(civ, 'combat_bonus')).toBeCloseTo(0.7)
  })

  it('不存在的技术名称被 TECH_MAP 忽略，bonus 为 0', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['UnknownTech'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'combat_bonus')).toBe(0)
  })

  it('effectType 不匹配时 bonus 为 0', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'combat_bonus')).toBe(0)
  })

  it('Banking 完成后 gold_income bonus 为 0.3', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Banking'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'gold_income')).toBeCloseTo(0.3)
  })

  it('Engineering 完成后 territory_expansion bonus 为 0.3', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Engineering'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'territory_expansion')).toBeCloseTo(0.3)
  })

  it('Mathematics 完成后 build_speed bonus 为 0.25', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Mathematics'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'build_speed')).toBeCloseTo(0.25)
  })

  it('Medicine 完成后 health_regen bonus 为 0.3', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Medicine'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'health_regen')).toBeCloseTo(0.3)
  })

  it('Fortification 完成后 building_hp bonus 为 0.3', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Fortification'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'building_hp')).toBeCloseTo(0.3)
  })

  it('Architecture 完成后 all_building_effects bonus 为 0.25', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Architecture'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'all_building_effects')).toBeCloseTo(0.25)
  })

  it('Printing Press 完成后 research_to_allies bonus 为 0.2', () => {
    const civ = makeCiv({ research: { currentTech: null, progress: 0, completed: ['Printing Press'], researchRate: 1 } })
    expect(TechSystem.getTechBonus(civ, 'research_to_allies')).toBeCloseTo(0.2)
  })
})

// ----------------------------------------------------------------
// TECHNOLOGIES 数据验证
// ----------------------------------------------------------------

describe('TECHNOLOGIES 数据完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('TECHNOLOGIES 数组非空', () => {
    expect(TECHNOLOGIES.length).toBeGreaterThan(0)
  })

  it('所有技术都有 name、level、cost、researchTime、effects', () => {
    for (const t of TECHNOLOGIES) {
      expect(t.name).toBeTruthy()
      expect(t.level).toBeGreaterThanOrEqual(1)
      expect(t.cost).toBeGreaterThanOrEqual(0)
      expect(t.researchTime).toBeGreaterThan(0)
      expect(Array.isArray(t.effects)).toBe(true)
    }
  })

  it('所有技术 level 在 1-5 范围内', () => {
    for (const t of TECHNOLOGIES) {
      expect(t.level).toBeGreaterThanOrEqual(1)
      expect(t.level).toBeLessThanOrEqual(5)
    }
  })

  it('Level 1 技术存在 Agriculture', () => {
    const agri = TECHNOLOGIES.find(t => t.name === 'Agriculture')
    expect(agri).toBeDefined()
    expect(agri!.level).toBe(1)
  })

  it('Level 2 技术包含 Writing', () => {
    const writing = TECHNOLOGIES.find(t => t.name === 'Writing')
    expect(writing).toBeDefined()
    expect(writing!.level).toBe(2)
  })

  it('Level 5 技术包含 Gunpowder', () => {
    const gun = TECHNOLOGIES.find(t => t.name === 'Gunpowder')
    expect(gun).toBeDefined()
    expect(gun!.level).toBe(5)
  })

  it('Level 5 技术包含 Printing Press', () => {
    const pp = TECHNOLOGIES.find(t => t.name === 'Printing Press')
    expect(pp).toBeDefined()
    expect(pp!.level).toBe(5)
  })

  it('TECH_TREE 包含 Level 1-5 定义', () => {
    for (let i = 1; i <= 5; i++) {
      expect(TECH_TREE[i]).toBeDefined()
      expect(TECH_TREE[i].name).toBeTruthy()
    }
  })

  it('Writing 的 research_speed effect value 为 0.25', () => {
    const writing = TECHNOLOGIES.find(t => t.name === 'Writing')!
    const eff = writing.effects.find(e => e.type === 'research_speed')
    expect(eff).toBeDefined()
    expect(eff!.value).toBeCloseTo(0.25)
  })
})

// ----------------------------------------------------------------
// isAtWar 私有方法
// ----------------------------------------------------------------

describe('TechSystem isAtWar 私有方法', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无关系时 isAtWar 返回 false', () => {
    const civ = makeCiv()
    expect((sys as any).isAtWar(civ)).toBe(false)
  })

  it('关系值 -50 时 isAtWar 返回 true（边界值）', () => {
    const civ = makeCiv()
    civ.relations.set(2, -50)
    expect((sys as any).isAtWar(civ)).toBe(true)
  })

  it('关系值 -49 时 isAtWar 返回 false', () => {
    const civ = makeCiv()
    civ.relations.set(2, -49)
    expect((sys as any).isAtWar(civ)).toBe(false)
  })

  it('关系值 -100 时 isAtWar 返回 true', () => {
    const civ = makeCiv()
    civ.relations.set(2, -100)
    expect((sys as any).isAtWar(civ)).toBe(true)
  })

  it('所有关系均 >= 0 时 isAtWar 返回 false', () => {
    const civ = makeCiv()
    civ.relations.set(2, 0)
    civ.relations.set(3, 100)
    expect((sys as any).isAtWar(civ)).toBe(false)
  })

  it('多个关系，只要有一个 <= -50 就返回 true', () => {
    const civ = makeCiv()
    civ.relations.set(2, 50)
    civ.relations.set(3, -51)
    expect((sys as any).isAtWar(civ)).toBe(true)
  })
})

// ----------------------------------------------------------------
// getTechsForLevel 私有方法
// ----------------------------------------------------------------

describe('TechSystem getTechsForLevel 私有方法', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('Level 1 返回 Agriculture 和 Tool Making', () => {
    const techs = (sys as any).getTechsForLevel(1)
    const names = techs.map((t: { name: string }) => t.name)
    expect(names).toContain('Agriculture')
    expect(names).toContain('Tool Making')
  })

  it('Level 2 返回 Bronze Working、Sailing、Writing', () => {
    const techs = (sys as any).getTechsForLevel(2)
    const names = techs.map((t: { name: string }) => t.name)
    expect(names).toContain('Bronze Working')
    expect(names).toContain('Sailing')
    expect(names).toContain('Writing')
  })

  it('Level 5 返回 Gunpowder、Printing Press、Architecture', () => {
    const techs = (sys as any).getTechsForLevel(5)
    const names = techs.map((t: { name: string }) => t.name)
    expect(names).toContain('Gunpowder')
    expect(names).toContain('Printing Press')
    expect(names).toContain('Architecture')
  })

  it('超出范围的 Level 返回空数组', () => {
    const techs = (sys as any).getTechsForLevel(99)
    expect(techs).toHaveLength(0)
  })

  it('_availBuf 被复用（不创建新数组）', () => {
    const buf1 = (sys as any).getTechsForLevel(1)
    const buf2 = (sys as any).getTechsForLevel(2)
    // 两次调用返回同一个 _availBuf 引用
    expect(buf1).toBe(buf2)
  })
})

// ----------------------------------------------------------------
// checkLevelAdvancement 私有方法
// ----------------------------------------------------------------

describe('TechSystem checkLevelAdvancement 私有方法', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('未完成所有 Level 1 技术时不升级', () => {
    const civ = makeCiv({ techLevel: 1, research: { currentTech: null, progress: 0, completed: [], researchRate: 1 } })
    const result = (sys as any).checkLevelAdvancement(civ)
    expect(result).toBe(false)
    expect(civ.techLevel).toBe(1)
  })

  it('完成所有 Level 1 技术后升级到 Level 2', () => {
    const civ = makeCiv({ techLevel: 1, research: { currentTech: null, progress: 0, completed: ['Agriculture', 'Tool Making'], researchRate: 1 } })
    const result = (sys as any).checkLevelAdvancement(civ)
    expect(result).toBe(true)
    expect(civ.techLevel).toBe(2)
  })

  it('techLevel 已为 5 时不再升级', () => {
    const allNames = TECHNOLOGIES.filter(t => t.level === 5).map(t => t.name)
    const civ = makeCiv({ techLevel: 5, research: { currentTech: null, progress: 0, completed: allNames, researchRate: 1 } })
    const result = (sys as any).checkLevelAdvancement(civ)
    expect(result).toBe(false)
    expect(civ.techLevel).toBe(5)
  })

  it('只完成部分 Level 1 技术不升级', () => {
    const civ = makeCiv({ techLevel: 1, research: { currentTech: null, progress: 0, completed: ['Agriculture'], researchRate: 1 } })
    const result = (sys as any).checkLevelAdvancement(civ)
    expect(result).toBe(false)
  })
})

// ----------------------------------------------------------------
// applyTechEffects 私有方法
// ----------------------------------------------------------------

describe('TechSystem applyTechEffects 私有方法', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('Writing 技术应用后 researchRate 增加', () => {
    const civ = makeCiv()
    const writing = TECHNOLOGIES.find(t => t.name === 'Writing')!
    const beforeRate = civ.research.researchRate
    ;(sys as any).applyTechEffects(civ, writing)
    expect(civ.research.researchRate).toBeGreaterThan(beforeRate)
  })

  it('Writing 技术应用后 researchRate *= (1 + 0.25)', () => {
    const civ = makeCiv()
    const writing = TECHNOLOGIES.find(t => t.name === 'Writing')!
    ;(sys as any).applyTechEffects(civ, writing)
    expect(civ.research.researchRate).toBeCloseTo(1.25)
  })

  it('无 research_speed 效果的技术不改变 researchRate', () => {
    const civ = makeCiv()
    const agri = TECHNOLOGIES.find(t => t.name === 'Agriculture')!
    const beforeRate = civ.research.researchRate
    ;(sys as any).applyTechEffects(civ, agri)
    expect(civ.research.researchRate).toBe(beforeRate)
  })
})

// ----------------------------------------------------------------
// tickCounter 行为
// ----------------------------------------------------------------

describe('TechSystem tickCounter 行为', () => {
  let sys: TechSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 tickCounter 为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })

  it('update 调用后 tickCounter 增加', () => {
    const mockCivManager = { civilizations: new Map() } as any
    sys.update(mockCivManager)
    expect((sys as any).tickCounter).toBe(1)
  })

  it('连续 10 次 update 后 tickCounter 为 10', () => {
    const mockCivManager = { civilizations: new Map() } as any
    for (let i = 0; i < 10; i++) sys.update(mockCivManager)
    expect((sys as any).tickCounter).toBe(10)
  })

  it('update 每 10 tick 才处理研究（前 9 tick 跳过）', () => {
    const mockGetCultureBonus = vi.fn().mockReturnValue(1)
    const mockGetReligionTechBonus = vi.fn().mockReturnValue(1)
    const civ = makeCiv({ research: { currentTech: 'Writing', progress: 0, completed: [], researchRate: 1 } })
    const mockCivManager = {
      civilizations: new Map([[1, civ]]),
      getCultureBonus: mockGetCultureBonus,
      getReligionTechBonus: mockGetReligionTechBonus,
      em: { getComponent: vi.fn().mockReturnValue(null) }
    } as any
    // 前 9 tick 不处理
    for (let i = 0; i < 9; i++) sys.update(mockCivManager)
    expect(civ.research.progress).toBe(0)
  })

  it('update 第 10 tick 处理研究（progress 增加）', () => {
    const civ = makeCiv({ research: { currentTech: 'Writing', progress: 0, completed: [], researchRate: 1 } })
    const mockCivManager = {
      civilizations: new Map([[1, civ]]),
      getCultureBonus: vi.fn().mockReturnValue(1),
      getReligionTechBonus: vi.fn().mockReturnValue(1),
      em: { getComponent: vi.fn().mockReturnValue(null) }
    } as any
    for (let i = 0; i < 10; i++) sys.update(mockCivManager)
    expect(civ.research.progress).toBeGreaterThan(0)
  })
})
