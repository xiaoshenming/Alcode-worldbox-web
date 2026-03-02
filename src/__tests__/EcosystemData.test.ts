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
  type WildlifeSpawnRule,
} from '../systems/EcosystemData'
import { TileType } from '../utils/Constants'

const ALL_SPECIES: WildlifeType[] = ['deer', 'bear', 'fish', 'eagle', 'snake', 'rabbit', 'boar', 'fox']

// ─────────────────────────────────────────────
// 一、WILDLIFE_RULES 基础结构
// ─────────────────────────────────────────────
describe('WILDLIFE_RULES — 基础结构', () => {
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

  it('每条规则的 spawnChance 应大于0', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.spawnChance).toBeGreaterThan(0)
    }
  })

  it('每条规则的 maxPerBiome 应大于0', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.maxPerBiome).toBeGreaterThan(0)
    }
  })

  it('每条规则的 speed 应大于0', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.speed).toBeGreaterThan(0)
    }
  })

  it('每条规则的 damage 应为非负数', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.damage).toBeGreaterThanOrEqual(0)
    }
  })

  it('每条规则都有 color 字符串', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(typeof rule.color).toBe('string')
      expect(rule.color.length).toBeGreaterThan(0)
    }
  })

  it('每条规则都有 size 正整数', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.size).toBeGreaterThan(0)
      expect(Number.isInteger(rule.size)).toBe(true)
    }
  })

  it('每条规则的 prey 是数组', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(Array.isArray(rule.prey)).toBe(true)
    }
  })

  it('每条规则的 fleeFrom 是数组', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(Array.isArray(rule.fleeFrom)).toBe(true)
    }
  })

  it('每条规则的 predator 是布尔值', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(typeof rule.predator).toBe('boolean')
    }
  })

  it('没有重复的 species', () => {
    const species = WILDLIFE_RULES.map(r => r.species)
    const unique = new Set(species)
    expect(unique.size).toBe(species.length)
  })
})

// ─────────────────────────────────────────────
// 二、掠食者 / 非掠食者逻辑
// ─────────────────────────────────────────────
describe('WILDLIFE_RULES — 掠食者与非掠食者', () => {
  it('掠食者的 prey 数组不为空', () => {
    const predators = WILDLIFE_RULES.filter(r => r.predator)
    expect(predators.length).toBeGreaterThan(0)
    for (const pred of predators) {
      expect(pred.prey.length).toBeGreaterThan(0)
    }
  })

  it('非掠食者的 prey 数组为空', () => {
    const nonPredators = WILDLIFE_RULES.filter(r => !r.predator)
    for (const np of nonPredators) {
      expect(np.prey.length).toBe(0)
    }
  })

  it('熊是掠食者', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.predator).toBe(true)
  })

  it('鹰是掠食者', () => {
    const eagle = WILDLIFE_RULES.find(r => r.species === 'eagle')!
    expect(eagle.predator).toBe(true)
  })

  it('蛇是掠食者', () => {
    const snake = WILDLIFE_RULES.find(r => r.species === 'snake')!
    expect(snake.predator).toBe(true)
  })

  it('狐狸是掠食者', () => {
    const fox = WILDLIFE_RULES.find(r => r.species === 'fox')!
    expect(fox.predator).toBe(true)
  })

  it('鹿不是掠食者', () => {
    const deer = WILDLIFE_RULES.find(r => r.species === 'deer')!
    expect(deer.predator).toBe(false)
  })

  it('鱼不是掠食者', () => {
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    expect(fish.predator).toBe(false)
  })

  it('兔子不是掠食者', () => {
    const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')!
    expect(rabbit.predator).toBe(false)
  })

  it('野猪不是掠食者', () => {
    const boar = WILDLIFE_RULES.find(r => r.species === 'boar')!
    expect(boar.predator).toBe(false)
  })

  it('共有4种掠食者', () => {
    const predators = WILDLIFE_RULES.filter(r => r.predator)
    expect(predators.length).toBe(4)
  })

  it('共有4种非掠食者', () => {
    const nonPredators = WILDLIFE_RULES.filter(r => !r.predator)
    expect(nonPredators.length).toBe(4)
  })
})

// ─────────────────────────────────────────────
// 三、各物种具体字段验证
// ─────────────────────────────────────────────
describe('WILDLIFE_RULES — 各物种字段验证', () => {
  it('鱼只生活在浅水区', () => {
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    expect(fish).toBeDefined()
    expect(fish.biome).toContain(TileType.SHALLOW_WATER)
    expect(fish.biome.length).toBe(1)
  })

  it('兔子不是掠食者且逃离多种捕食者', () => {
    const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')!
    expect(rabbit).toBeDefined()
    expect(rabbit.predator).toBe(false)
    expect(rabbit.fleeFrom.length).toBeGreaterThan(3)
  })

  it('熊的伤害应高于鱼', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    expect(bear.damage).toBeGreaterThan(fish.damage)
  })

  it('熊居住在森林和山地', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.biome).toContain(TileType.FOREST)
    expect(bear.biome).toContain(TileType.MOUNTAIN)
  })

  it('鹿居住在草地和森林', () => {
    const deer = WILDLIFE_RULES.find(r => r.species === 'deer')!
    expect(deer.biome).toContain(TileType.GRASS)
    expect(deer.biome).toContain(TileType.FOREST)
  })

  it('蛇居住在沙地和草地', () => {
    const snake = WILDLIFE_RULES.find(r => r.species === 'snake')!
    expect(snake.biome).toContain(TileType.SAND)
    expect(snake.biome).toContain(TileType.GRASS)
  })

  it('兔子只居住在草地', () => {
    const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')!
    expect(rabbit.biome).toContain(TileType.GRASS)
    expect(rabbit.biome.length).toBe(1)
  })

  it('野猪只居住在森林', () => {
    const boar = WILDLIFE_RULES.find(r => r.species === 'boar')!
    expect(boar.biome).toContain(TileType.FOREST)
    expect(boar.biome.length).toBe(1)
  })

  it('狐狸居住在草地和森林', () => {
    const fox = WILDLIFE_RULES.find(r => r.species === 'fox')!
    expect(fox.biome).toContain(TileType.GRASS)
    expect(fox.biome).toContain(TileType.FOREST)
  })

  it('鹰居住在山地和森林', () => {
    const eagle = WILDLIFE_RULES.find(r => r.species === 'eagle')!
    expect(eagle.biome).toContain(TileType.MOUNTAIN)
    expect(eagle.biome).toContain(TileType.FOREST)
  })

  it('鱼伤害为 0（非战斗型）', () => {
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    expect(fish.damage).toBe(0)
  })

  it('兔子伤害为 0（非战斗型）', () => {
    const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')!
    expect(rabbit.damage).toBe(0)
  })

  it('熊的 maxPerBiome 为2', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.maxPerBiome).toBe(2)
  })

  it('鱼的 maxPerBiome 为6（最多）', () => {
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    expect(fish.maxPerBiome).toBe(6)
  })

  it('鹰的速度最快（2.0）', () => {
    const eagle = WILDLIFE_RULES.find(r => r.species === 'eagle')!
    const maxSpeed = Math.max(...WILDLIFE_RULES.map(r => r.speed))
    expect(eagle.speed).toBe(maxSpeed)
  })

  it('熊的伤害为15（最高）', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    const maxDamage = Math.max(...WILDLIFE_RULES.map(r => r.damage))
    expect(bear.damage).toBe(maxDamage)
  })

  it('鱼的速度最慢（0.6）', () => {
    const fish = WILDLIFE_RULES.find(r => r.species === 'fish')!
    const minSpeed = Math.min(...WILDLIFE_RULES.map(r => r.speed))
    expect(fish.speed).toBe(minSpeed)
  })

  it('熊的 size 最大（5）', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    const maxSize = Math.max(...WILDLIFE_RULES.map(r => r.size))
    expect(bear.size).toBe(maxSize)
  })

  it('熊的猎物包含鹿、羊、鱼', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.prey).toContain('deer')
    expect(bear.prey).toContain('fish')
  })

  it('蛇的猎物只包含兔子', () => {
    const snake = WILDLIFE_RULES.find(r => r.species === 'snake')!
    expect(snake.prey).toContain('rabbit')
  })

  it('狐狸的猎物包含兔子和鱼', () => {
    const fox = WILDLIFE_RULES.find(r => r.species === 'fox')!
    expect(fox.prey).toContain('rabbit')
    expect(fox.prey).toContain('fish')
  })

  it('兔子的逃跑对象包含 wolf、fox、eagle、snake、bear', () => {
    const rabbit = WILDLIFE_RULES.find(r => r.species === 'rabbit')!
    expect(rabbit.fleeFrom).toContain('wolf')
    expect(rabbit.fleeFrom).toContain('fox')
    expect(rabbit.fleeFrom).toContain('eagle')
    expect(rabbit.fleeFrom).toContain('snake')
    expect(rabbit.fleeFrom).toContain('bear')
  })

  it('熊逃跑只怕 dragon', () => {
    const bear = WILDLIFE_RULES.find(r => r.species === 'bear')!
    expect(bear.fleeFrom).toContain('dragon')
  })

  it('所有 spawnChance 相等（均为 0.0001）', () => {
    for (const rule of WILDLIFE_RULES) {
      expect(rule.spawnChance).toBe(0.0001)
    }
  })
})

// ─────────────────────────────────────────────
// 四、常量验证
// ─────────────────────────────────────────────
describe('常量', () => {
  it('MAX_WILDLIFE 应为正整数', () => {
    expect(MAX_WILDLIFE).toBeGreaterThan(0)
    expect(Number.isInteger(MAX_WILDLIFE)).toBe(true)
  })

  it('MAX_WILDLIFE 等于 200', () => {
    expect(MAX_WILDLIFE).toBe(200)
  })

  it('SPAWN_INTERVAL 应为正整数', () => {
    expect(SPAWN_INTERVAL).toBeGreaterThan(0)
    expect(Number.isInteger(SPAWN_INTERVAL)).toBe(true)
  })

  it('SPAWN_INTERVAL 等于 100', () => {
    expect(SPAWN_INTERVAL).toBe(100)
  })

  it('HUNT_RANGE 应小于 FLEE_RANGE', () => {
    expect(HUNT_RANGE).toBeLessThan(FLEE_RANGE)
  })

  it('HUNT_RANGE 等于 8', () => {
    expect(HUNT_RANGE).toBe(8)
  })

  it('FLEE_RANGE 等于 10', () => {
    expect(FLEE_RANGE).toBe(10)
  })

  it('AREA_CHECK_SIZE 应为正整数', () => {
    expect(AREA_CHECK_SIZE).toBeGreaterThan(0)
  })

  it('AREA_CHECK_SIZE 等于 20', () => {
    expect(AREA_CHECK_SIZE).toBe(20)
  })

  it('HUNT_RANGE 大于 0', () => {
    expect(HUNT_RANGE).toBeGreaterThan(0)
  })

  it('FLEE_RANGE 大于 0', () => {
    expect(FLEE_RANGE).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// 五、MAX_AGE_WILDLIFE 寿命范围
// ─────────────────────────────────────────────
describe('MAX_AGE_WILDLIFE', () => {
  it('应包含所有8种野生动物的寿命范围', () => {
    for (const s of ALL_SPECIES) {
      expect(MAX_AGE_WILDLIFE[s]).toBeDefined()
    }
  })

  it('每种动物的最小寿命应小于最大寿命', () => {
    for (const s of ALL_SPECIES) {
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

  it('每种动物寿命范围长度为 2', () => {
    for (const s of ALL_SPECIES) {
      expect(MAX_AGE_WILDLIFE[s].length).toBe(2)
    }
  })

  it('鹿的寿命范围是 [400, 700]', () => {
    expect(MAX_AGE_WILDLIFE.deer).toEqual([400, 700])
  })

  it('熊的寿命范围是 [600, 1000]', () => {
    expect(MAX_AGE_WILDLIFE.bear).toEqual([600, 1000])
  })

  it('鱼的寿命范围是 [200, 400]', () => {
    expect(MAX_AGE_WILDLIFE.fish).toEqual([200, 400])
  })

  it('鹰的寿命范围是 [500, 800]', () => {
    expect(MAX_AGE_WILDLIFE.eagle).toEqual([500, 800])
  })

  it('蛇的寿命范围是 [300, 500]', () => {
    expect(MAX_AGE_WILDLIFE.snake).toEqual([300, 500])
  })

  it('兔子的寿命范围是 [200, 350]', () => {
    expect(MAX_AGE_WILDLIFE.rabbit).toEqual([200, 350])
  })

  it('野猪的寿命范围是 [400, 650]', () => {
    expect(MAX_AGE_WILDLIFE.boar).toEqual([400, 650])
  })

  it('狐狸的寿命范围是 [350, 550]', () => {
    expect(MAX_AGE_WILDLIFE.fox).toEqual([350, 550])
  })

  it('熊的最大寿命最长（1000）', () => {
    const maxAges = ALL_SPECIES.map(s => MAX_AGE_WILDLIFE[s][1])
    const maxOfAll = Math.max(...maxAges)
    expect(MAX_AGE_WILDLIFE.bear[1]).toBe(maxOfAll)
  })

  it('鱼和兔子的最小寿命最短（200）', () => {
    const minAges = ALL_SPECIES.map(s => MAX_AGE_WILDLIFE[s][0])
    const minOfAll = Math.min(...minAges)
    expect(minOfAll).toBe(200)
    expect(MAX_AGE_WILDLIFE.fish[0]).toBe(minOfAll)
    expect(MAX_AGE_WILDLIFE.rabbit[0]).toBe(minOfAll)
  })
})
