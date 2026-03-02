import { describe, it, expect } from 'vitest'
import {
  WILDLIFE_RULES,
  MAX_WILDLIFE,
  SPAWN_INTERVAL,
  HUNT_RANGE,
  FLEE_RANGE,
  AREA_CHECK_SIZE,
  MAX_AGE_WILDLIFE,
  type WildlifeType,
} from '../systems/EcosystemData'
import { TileType } from '../utils/Constants'

describe('EcosystemData', () => {
  describe('WILDLIFE_RULES', () => {
    it('应包含所有8种野生动物', () => {
      const species = WILDLIFE_RULES.map(r => r.species)
      expect(species).toContain('deer')
      expect(species).toContain('bear')
      expect(species).toContain('fish')
      expect(species).toContain('eagle')
      expect(species).toContain('snake')
      expect(species).toContain('rabbit')
      expect(species).toContain('boar')
      expect(species).toContain('fox')
      expect(WILDLIFE_RULES.length).toBe(8)
    })

    it('每条规则都有有效的生物群系数组', () => {
      for (const rule of WILDLIFE_RULES) {
        expect(Array.isArray(rule.biome)).toBe(true)
        expect(rule.biome.length).toBeGreaterThan(0)
      }
    })

    it('每条规则的spawnChance应大于0', () => {
      for (const rule of WILDLIFE_RULES) {
        expect(rule.spawnChance).toBeGreaterThan(0)
      }
    })

    it('每条规则的maxPerBiome应大于0', () => {
      for (const rule of WILDLIFE_RULES) {
        expect(rule.maxPerBiome).toBeGreaterThan(0)
      }
    })

    it('每条规则的speed应大于0', () => {
      for (const rule of WILDLIFE_RULES) {
        expect(rule.speed).toBeGreaterThan(0)
      }
    })

    it('掠食者的prey数组不为空', () => {
      const predators = WILDLIFE_RULES.filter(r => r.predator)
      expect(predators.length).toBeGreaterThan(0)
      for (const pred of predators) {
        expect(pred.prey.length).toBeGreaterThan(0)
      }
    })

    it('非掠食者的prey数组为空', () => {
      const nonPredators = WILDLIFE_RULES.filter(r => !r.predator)
      for (const np of nonPredators) {
        expect(np.prey.length).toBe(0)
      }
    })

    it('鱼只生活在浅水区', () => {
      const fish = WILDLIFE_RULES.find(r => r.species === 'fish')
      expect(fish).toBeDefined()
      expect(fish!.biome).toContain(TileType.SHALLOW_WATER)
    })

    it('兔子不是掠食者且逃离多种捕食者', () => {
      const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')
      expect(rabbit).toBeDefined()
      expect(rabbit!.predator).toBe(false)
      expect(rabbit!.fleeFrom.length).toBeGreaterThan(3)
    })

    it('熊的伤害应高于鱼', () => {
      const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
      const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
      expect(bear.damage).toBeGreaterThan(fish.damage)
    })
  })

  describe('常量', () => {
    it('MAX_WILDLIFE应为正整数', () => {
      expect(MAX_WILDLIFE).toBeGreaterThan(0)
      expect(Number.isInteger(MAX_WILDLIFE)).toBe(true)
    })

    it('SPAWN_INTERVAL应为正整数', () => {
      expect(SPAWN_INTERVAL).toBeGreaterThan(0)
      expect(Number.isInteger(SPAWN_INTERVAL)).toBe(true)
    })

    it('HUNT_RANGE应小于FLEE_RANGE', () => {
      expect(HUNT_RANGE).toBeLessThan(FLEE_RANGE)
    })

    it('AREA_CHECK_SIZE应为正整数', () => {
      expect(AREA_CHECK_SIZE).toBeGreaterThan(0)
    })
  })

  describe('MAX_AGE_WILDLIFE', () => {
    const species: WildlifeType[] = ['deer', 'bear', 'fish', 'eagle', 'snake', 'rabbit', 'boar', 'fox']

    it('应包含所有8种野生动物的寿命范围', () => {
      for (const s of species) {
        expect(MAX_AGE_WILDLIFE[s]).toBeDefined()
      }
    })

    it('每种动物的最小寿命应小于最大寿命', () => {
      for (const s of species) {
        const [min, max] = MAX_AGE_WILDLIFE[s]
        expect(min).toBeLessThan(max)
        expect(min).toBeGreaterThan(0)
      }
    })

    it('熊的寿命应高于鱼', () => {
      const [bearMin] = MAX_AGE_WILDLIFE.bear
      const [, fishMax] = MAX_AGE_WILDLIFE.fish
      expect(bearMin).toBeGreaterThan(fishMax)
    })
  })
})
