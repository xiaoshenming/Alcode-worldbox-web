import { describe, it, expect, beforeEach } from 'vitest'
import { MiningSystem, OreType } from '../systems/MiningSystem'

// MiningSystem 测试：
// - getMiningBonus(oreType)      → 纯计算：根据矿石类型返回 {military, wealth, culture}
// - getOreAt(x, y)              → 返回 oreMap[y][x]，越界返回 NONE
// - getOreMap()                 → 返回内部 oreMap 引用
// - getDepositsForCiv(civId)    → 过滤已发现的矿床
// - getDiscoveredDeposits()     → 过滤所有已发现的矿床
// 构造函数只初始化 oreMap（WORLD_WIDTH*WORLD_HEIGHT），速度可接受。

function makeMS(): MiningSystem {
  return new MiningSystem()
}

// ── getMiningBonus ────────────────────────────────────────────────────────────

describe('MiningSystem.getMiningBonus', () => {
  let ms: MiningSystem

  beforeEach(() => {
    ms = makeMS()
  })

  it('NONE 类型返回全零', () => {
    const b = ms.getMiningBonus(OreType.NONE)
    expect(b).toEqual({ military: 0, wealth: 0, culture: 0 })
  })

  it('COPPER: military=5, wealth=2, culture=0', () => {
    expect(ms.getMiningBonus(OreType.COPPER)).toEqual({ military: 5, wealth: 2, culture: 0 })
  })

  it('IRON: military=10, wealth=3, culture=0', () => {
    expect(ms.getMiningBonus(OreType.IRON)).toEqual({ military: 10, wealth: 3, culture: 0 })
  })

  it('GOLD: military=0, wealth=15, culture=2', () => {
    expect(ms.getMiningBonus(OreType.GOLD)).toEqual({ military: 0, wealth: 15, culture: 2 })
  })

  it('GEMS: military=0, wealth=8, culture=12', () => {
    expect(ms.getMiningBonus(OreType.GEMS)).toEqual({ military: 0, wealth: 8, culture: 12 })
  })

  it('MITHRIL: military=20, wealth=10, culture=5', () => {
    expect(ms.getMiningBonus(OreType.MITHRIL)).toEqual({ military: 20, wealth: 10, culture: 5 })
  })

  it('ADAMANTINE: military=25, wealth=12, culture=3', () => {
    expect(ms.getMiningBonus(OreType.ADAMANTINE)).toEqual({ military: 25, wealth: 12, culture: 3 })
  })

  it('稀有矿石军事加成高于普通矿石', () => {
    const copper = ms.getMiningBonus(OreType.COPPER)
    const mithril = ms.getMiningBonus(OreType.MITHRIL)
    expect(mithril.military).toBeGreaterThan(copper.military)
  })

  it('黄金的财富加成最高', () => {
    const gold = ms.getMiningBonus(OreType.GOLD)
    const copper = ms.getMiningBonus(OreType.COPPER)
    const iron = ms.getMiningBonus(OreType.IRON)
    expect(gold.wealth).toBeGreaterThan(copper.wealth)
    expect(gold.wealth).toBeGreaterThan(iron.wealth)
  })
})

// ── getOreAt ──────────────────────────────────────────────────────────────────

describe('MiningSystem.getOreAt', () => {
  let ms: MiningSystem

  beforeEach(() => {
    ms = makeMS()
  })

  it('初始所有位置都是 NONE', () => {
    expect(ms.getOreAt(0, 0)).toBe(OreType.NONE)
    expect(ms.getOreAt(100, 100)).toBe(OreType.NONE)
  })

  it('越界坐标返回 NONE', () => {
    expect(ms.getOreAt(-1, 0)).toBe(OreType.NONE)
    expect(ms.getOreAt(0, -1)).toBe(OreType.NONE)
  })

  it('注入 oreMap 后可读取', () => {
    ;(ms as any).oreMap[10][10] = OreType.GOLD
    expect(ms.getOreAt(10, 10)).toBe(OreType.GOLD)
  })

  it('x 坐标超出 WORLD_W 返回 NONE', () => {
    const W = (ms as any).WORLD_W as number
    expect(ms.getOreAt(W, 0)).toBe(OreType.NONE)
    expect(ms.getOreAt(W + 10, 0)).toBe(OreType.NONE)
  })
})

// ── getOreMap ─────────────────────────────────────────────────────────────────

describe('MiningSystem.getOreMap', () => {
  it('返回内部 oreMap 引用（修改会影响 getOreAt）', () => {
    const ms = makeMS()
    const map = ms.getOreMap()
    map[5][5] = OreType.IRON
    expect(ms.getOreAt(5, 5)).toBe(OreType.IRON)
  })

  it('oreMap 行数等于 WORLD_H', () => {
    const ms = makeMS()
    const H = (ms as any).WORLD_H as number
    expect(ms.getOreMap().length).toBe(H)
  })
})

// ── getDiscoveredDeposits ─────────────────────────────────────────────────────

describe('MiningSystem.getDiscoveredDeposits', () => {
  it('初始无已发现矿床', () => {
    const ms = makeMS()
    expect(ms.getDiscoveredDeposits()).toHaveLength(0)
  })

  it('注入未发现矿床不在结果中', () => {
    const ms = makeMS()
    ;(ms as any).deposits.push({
      x: 10, y: 10, type: OreType.IRON, size: 'small', reserves: 50, maxReserves: 50,
      discovered: false, discoveredBy: null, mineBuilt: false, productionRate: 1,
    })
    expect(ms.getDiscoveredDeposits()).toHaveLength(0)
  })

  it('注入已发现矿床出现在结果中', () => {
    const ms = makeMS()
    ;(ms as any).deposits.push({
      x: 10, y: 10, type: OreType.GOLD, size: 'medium', reserves: 120, maxReserves: 120,
      discovered: true, discoveredBy: 1, mineBuilt: false, productionRate: 2,
    })
    expect(ms.getDiscoveredDeposits()).toHaveLength(1)
    expect(ms.getDiscoveredDeposits()[0].type).toBe(OreType.GOLD)
  })
})

// ── getDepositsForCiv ─────────────────────────────────────────────────────────

describe('MiningSystem.getDepositsForCiv', () => {
  it('文明无矿床时返回空数组', () => {
    const ms = makeMS()
    expect(ms.getDepositsForCiv(1)).toHaveLength(0)
  })

  it('返回指定文明的矿床', () => {
    const ms = makeMS()
    ;(ms as any).deposits.push({
      x: 10, y: 10, type: OreType.IRON, size: 'small', reserves: 50, maxReserves: 50,
      discovered: true, discoveredBy: 3, mineBuilt: false, productionRate: 1,
    })
    ;(ms as any).deposits.push({
      x: 20, y: 20, type: OreType.COPPER, size: 'small', reserves: 50, maxReserves: 50,
      discovered: true, discoveredBy: 5, mineBuilt: false, productionRate: 1,
    })
    expect(ms.getDepositsForCiv(3)).toHaveLength(1)
    expect(ms.getDepositsForCiv(3)[0].discoveredBy).toBe(3)
    expect(ms.getDepositsForCiv(5)).toHaveLength(1)
    expect(ms.getDepositsForCiv(99)).toHaveLength(0)
  })
})
