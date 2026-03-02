import { describe, it, expect } from 'vitest'
import {
  RARITY_WEIGHTS,
  RARITY_COLORS,
  RARITY_UPPER,
  EVENT_DEFINITIONS,
  weakestCiv,
} from '../systems/WorldEventDefinitions'

describe('WorldEventDefinitions', () => {
  describe('RARITY_WEIGHTS', () => {
    it('应包含common/rare/epic三种稀有度', () => {
      expect(RARITY_WEIGHTS.common).toBeDefined()
      expect(RARITY_WEIGHTS.rare).toBeDefined()
      expect(RARITY_WEIGHTS.epic).toBeDefined()
    })

    it('common权重应高于rare', () => {
      expect(RARITY_WEIGHTS.common).toBeGreaterThan(RARITY_WEIGHTS.rare)
    })

    it('rare权重应高于epic', () => {
      expect(RARITY_WEIGHTS.rare).toBeGreaterThan(RARITY_WEIGHTS.epic)
    })

    it('所有权重应为正数', () => {
      for (const w of Object.values(RARITY_WEIGHTS)) {
        expect(w).toBeGreaterThan(0)
      }
    })
  })

  describe('RARITY_COLORS', () => {
    it('应包含三种稀有度的颜色', () => {
      expect(RARITY_COLORS.common).toBeDefined()
      expect(RARITY_COLORS.rare).toBeDefined()
      expect(RARITY_COLORS.epic).toBeDefined()
    })

    it('颜色应为合法的十六进制格式', () => {
      for (const color of Object.values(RARITY_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('RARITY_UPPER', () => {
    it('应为大写版本', () => {
      expect(RARITY_UPPER.common).toBe('COMMON')
      expect(RARITY_UPPER.rare).toBe('RARE')
      expect(RARITY_UPPER.epic).toBe('EPIC')
    })
  })

  describe('EVENT_DEFINITIONS', () => {
    it('应包含10个���件', () => {
      expect(EVENT_DEFINITIONS.length).toBe(10)
    })

    it('每个事件都有唯一的id', () => {
      const ids = EVENT_DEFINITIONS.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('每个事件都有name和description', () => {
      for (const def of EVENT_DEFINITIONS) {
        expect(def.name.trim().length).toBeGreaterThan(0)
        expect(def.description.trim().length).toBeGreaterThan(0)
      }
    })

    it('每个事件的rarity都是有效值', () => {
      const validRarities = new Set(['common', 'rare', 'epic'])
      for (const def of EVENT_DEFINITIONS) {
        expect(validRarities.has(def.rarity)).toBe(true)
      }
    })

    it('每个事件的duration和cooldown都是正整数', () => {
      for (const def of EVENT_DEFINITIONS) {
        expect(def.duration).toBeGreaterThan(0)
        expect(def.cooldown).toBeGreaterThan(0)
      }
    })

    it('每个事件都有effect函数', () => {
      for (const def of EVENT_DEFINITIONS) {
        expect(typeof def.effect).toBe('function')
      }
    })

    it('应包含golden_age事件', () => {
      const goldenAge = EVENT_DEFINITIONS.find(e => e.id === 'golden_age')
      expect(goldenAge).toBeDefined()
      expect(goldenAge!.rarity).toBe('rare')
    })

    it('应包含meteor_shower事件且为epic', () => {
      const meteor = EVENT_DEFINITIONS.find(e => e.id === 'meteor_shower')
      expect(meteor).toBeDefined()
      expect(meteor!.rarity).toBe('epic')
    })

    it('应包含bountiful_harvest事件且为common', () => {
      const harvest = EVENT_DEFINITIONS.find(e => e.id === 'bountiful_harvest')
      expect(harvest).toBeDefined()
      expect(harvest!.rarity).toBe('common')
    })

    it('cooldown应大于或等于duration', () => {
      for (const def of EVENT_DEFINITIONS) {
        expect(def.cooldown).toBeGreaterThanOrEqual(def.duration)
      }
    })
  })

  describe('weakestCiv', () => {
    function makeMockCivManager(civs: Array<{ id: number; name: string; population: number; techLevel: number; resources: { gold: number } }>) {
      return {
        civilizations: new Map(civs.map(c => [c.id, c as any])),
      } as any
    }

    it('无文明时返回null', () => {
      const cm = makeMockCivManager([])
      expect(weakestCiv(cm)).toBeNull()
    })

    it('单文明时返回该文明', () => {
      const cm = makeMockCivManager([
        { id: 1, name: 'A', population: 10, techLevel: 1, resources: { gold: 5 } },
      ])
      const result = weakestCiv(cm)
      expect(result).not.toBeNull()
      expect((result as any).id).toBe(1)
    })

    it('返回得分最低的文明（population+techLevel*10+gold）', () => {
      const cm = makeMockCivManager([
        { id: 1, name: 'Strong', population: 100, techLevel: 5, resources: { gold: 200 } },
        { id: 2, name: 'Weak', population: 5, techLevel: 1, resources: { gold: 0 } },
        { id: 3, name: 'Medium', population: 50, techLevel: 2, resources: { gold: 30 } },
      ])
      const result = weakestCiv(cm)
      expect((result as any).id).toBe(2)
    })

    it('相同得分时返回其中一个', () => {
      const cm = makeMockCivManager([
        { id: 1, name: 'A', population: 10, techLevel: 1, resources: { gold: 0 } },
        { id: 2, name: 'B', population: 10, techLevel: 1, resources: { gold: 0 } },
      ])
      const result = weakestCiv(cm)
      expect(result).not.toBeNull()
    })
  })
})
