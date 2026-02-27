import { describe, it, expect, beforeEach } from 'vitest'
import {
  createCivilization, resetCivIdCounter, TECH_TREE, TECHNOLOGIES,
  BUILDING_COLORS, BUILDING_SIZES, BuildingType,
  RELIGION_NAMES, RELIGION_TYPES, CULTURE_TRAITS
} from '../civilization/Civilization'

describe('createCivilization', () => {
  beforeEach(() => {
    resetCivIdCounter()
  })

  it('返回有效的文明对象', () => {
    const civ = createCivilization()
    expect(civ).toBeDefined()
    expect(typeof civ.id).toBe('number')
    expect(typeof civ.name).toBe('string')
    expect(civ.name.length).toBeGreaterThan(0)
  })

  it('ID 从 1 开始递增', () => {
    const civ1 = createCivilization()
    const civ2 = createCivilization()
    expect(civ1.id).toBe(1)
    expect(civ2.id).toBe(2)
  })

  it('重置后 ID 重新从 1 开始', () => {
    createCivilization()
    createCivilization()
    resetCivIdCounter()
    const civ = createCivilization()
    expect(civ.id).toBe(1)
  })

  it('初始状态正确', () => {
    const civ = createCivilization()
    expect(civ.population).toBe(0)
    expect(civ.techLevel).toBe(1)
    expect(civ.happiness).toBe(70)
    expect(civ.taxRate).toBe(1)
    expect(civ.revoltTimer).toBe(0)
    expect(civ.diplomaticStance).toBe('neutral')
  })

  it('初始资源正确', () => {
    const civ = createCivilization()
    expect(civ.resources.food).toBe(50)
    expect(civ.resources.wood).toBe(30)
    expect(civ.resources.stone).toBe(10)
    expect(civ.resources.gold).toBe(0)
  })

  it('初始研究状态正确', () => {
    const civ = createCivilization()
    expect(civ.research.currentTech).toBeNull()
    expect(civ.research.progress).toBe(0)
    expect(civ.research.completed).toEqual([])
    expect(civ.research.researchRate).toBe(1.0)
  })

  it('territory 是空 Set', () => {
    const civ = createCivilization()
    expect(civ.territory).toBeInstanceOf(Set)
    expect(civ.territory.size).toBe(0)
  })

  it('relations 是空 Map', () => {
    const civ = createCivilization()
    expect(civ.relations).toBeInstanceOf(Map)
    expect(civ.relations.size).toBe(0)
  })

  it('不同文明有不同的颜色（循环分配）', () => {
    // 创建足够多的文明来验证颜色循环不崩溃
    for (let i = 0; i < 20; i++) {
      const civ = createCivilization()
      expect(typeof civ.color).toBe('string')
      expect(civ.color.startsWith('#')).toBe(true)
    }
  })

  it('名字在创建多个文明时有多样性', () => {
    const names = new Set<string>()
    for (let i = 0; i < 10; i++) {
      names.add(createCivilization().name)
    }
    // 10个文明应该有至少 2 个不同的名字（通常都是唯一的）
    expect(names.size).toBeGreaterThan(1)
  })
})

describe('TECH_TREE', () => {
  it('包含 5 个科技时代', () => {
    expect(Object.keys(TECH_TREE)).toHaveLength(5)
  })

  it('每个时代有名字、描述、解锁列表', () => {
    for (const [, info] of Object.entries(TECH_TREE)) {
      expect(typeof info.name).toBe('string')
      expect(typeof info.description).toBe('string')
      expect(Array.isArray(info.unlocks)).toBe(true)
    }
  })

  it('第 1 层是石器时代', () => {
    expect(TECH_TREE[1].name).toBe('Stone Age')
  })

  it('第 5 层是文艺复兴', () => {
    expect(TECH_TREE[5].name).toBe('Renaissance')
  })
})

describe('TECHNOLOGIES', () => {
  it('包含多项技术', () => {
    expect(TECHNOLOGIES.length).toBeGreaterThan(5)
  })

  it('每项技术有必要字段', () => {
    for (const tech of TECHNOLOGIES) {
      expect(typeof tech.name).toBe('string')
      expect(typeof tech.level).toBe('number')
      expect(tech.level).toBeGreaterThanOrEqual(1)
      expect(tech.level).toBeLessThanOrEqual(5)
      expect(typeof tech.cost).toBe('number')
      expect(tech.cost).toBeGreaterThan(0)
      expect(typeof tech.researchTime).toBe('number')
      expect(tech.researchTime).toBeGreaterThan(0)
      expect(Array.isArray(tech.effects)).toBe(true)
      expect(tech.effects.length).toBeGreaterThan(0)
    }
  })

  it('技术名字唯一', () => {
    const names = TECHNOLOGIES.map(t => t.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })
})

describe('BUILDING_COLORS', () => {
  it('每种建筑类型都有颜色', () => {
    for (const type of Object.values(BuildingType)) {
      expect(typeof BUILDING_COLORS[type]).toBe('string')
      expect(BUILDING_COLORS[type].startsWith('#')).toBe(true)
    }
  })

  it('颜色格式为有效的 #RRGGBB', () => {
    for (const [, color] of Object.entries(BUILDING_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('BUILDING_SIZES', () => {
  it('每种建筑类型都有大小', () => {
    for (const type of Object.values(BuildingType)) {
      expect(typeof BUILDING_SIZES[type]).toBe('number')
      expect(BUILDING_SIZES[type]).toBeGreaterThan(0)
    }
  })

  it('HUT 大小为 1（最小建筑）', () => {
    expect(BUILDING_SIZES[BuildingType.HUT]).toBe(1)
  })

  it('CASTLE 大小为 3（大型建筑）', () => {
    expect(BUILDING_SIZES[BuildingType.CASTLE]).toBe(3)
  })
})

describe('RELIGION_NAMES', () => {
  it('每种��教类型都有名字', () => {
    for (const type of RELIGION_TYPES) {
      expect(typeof RELIGION_NAMES[type]).toBe('string')
      expect(RELIGION_NAMES[type].length).toBeGreaterThan(0)
    }
  })

  it('共有 5 种宗教类型', () => {
    expect(RELIGION_TYPES).toHaveLength(5)
  })
})

describe('CULTURE_TRAITS', () => {
  it('共有 5 种文化特质', () => {
    expect(CULTURE_TRAITS).toHaveLength(5)
  })

  it('包含 warrior 和 merchant', () => {
    expect(CULTURE_TRAITS).toContain('warrior')
    expect(CULTURE_TRAITS).toContain('merchant')
  })
})
