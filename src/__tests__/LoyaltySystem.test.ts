import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LoyaltySystem } from '../systems/LoyaltySystem'

function makeLS(): LoyaltySystem {
  return new LoyaltySystem()
}

afterEach(() => vi.restoreAllMocks())

// ── getLoyalty 基础行为 ──────────────────────────────────────────────

describe('LoyaltySystem.getLoyalty — 默认值行为', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('未注册的文明返回默认值 70', () => {
    expect(ls.getLoyalty(1)).toBe(70)
    expect(ls.getLoyalty(99)).toBe(70)
    expect(ls.getLoyalty(0)).toBe(70)
  })

  it('负数文明ID也返回默认值 70', () => {
    expect(ls.getLoyalty(-1)).toBe(70)
    expect(ls.getLoyalty(-999)).toBe(70)
  })

  it('极大文明ID返回默认值 70', () => {
    expect(ls.getLoyalty(Number.MAX_SAFE_INTEGER)).toBe(70)
  })

  it('默认值是数字类型', () => {
    expect(typeof ls.getLoyalty(5)).toBe('number')
  })

  it('初始状态 loyalty Map 为空', () => {
    expect((ls as any).loyalty.size).toBe(0)
  })
})

// ── getLoyalty 注入值行为 ────────────────────────────────────────────

describe('LoyaltySystem.getLoyalty — 注入值查询', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('注入后返回注入的值', () => {
    ;(ls as any).loyalty.set(1, 85)
    expect(ls.getLoyalty(1)).toBe(85)
  })

  it('注入低忠诚度值', () => {
    ;(ls as any).loyalty.set(2, 20)
    expect(ls.getLoyalty(2)).toBe(20)
  })

  it('注入满忠诚度 100', () => {
    ;(ls as any).loyalty.set(3, 100)
    expect(ls.getLoyalty(3)).toBe(100)
  })

  it('注入零忠诚度', () => {
    ;(ls as any).loyalty.set(4, 0)
    expect(ls.getLoyalty(4)).toBe(0)
  })

  it('注入后可覆盖', () => {
    ;(ls as any).loyalty.set(1, 50)
    ;(ls as any).loyalty.set(1, 80)
    expect(ls.getLoyalty(1)).toBe(80)
  })

  it('注入小数忠诚度', () => {
    ;(ls as any).loyalty.set(5, 45.5)
    expect(ls.getLoyalty(5)).toBe(45.5)
  })

  it('注入最小有效值 1', () => {
    ;(ls as any).loyalty.set(6, 1)
    expect(ls.getLoyalty(6)).toBe(1)
  })

  it('注入最大有效值 99', () => {
    ;(ls as any).loyalty.set(7, 99)
    expect(ls.getLoyalty(7)).toBe(99)
  })

  it('注入精确的默认值 70 也应正确读取', () => {
    ;(ls as any).loyalty.set(8, 70)
    expect(ls.getLoyalty(8)).toBe(70)
    // 确认是已注册的，非默认
    expect((ls as any).loyalty.has(8)).toBe(true)
  })
})

// ── 多文明独立存储 ───────────────────────────────────────────────────

describe('LoyaltySystem.getLoyalty — 多文明独立存储', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('多个文明独立存储', () => {
    ;(ls as any).loyalty.set(1, 90)
    ;(ls as any).loyalty.set(2, 30)
    ;(ls as any).loyalty.set(3, 55)
    expect(ls.getLoyalty(1)).toBe(90)
    expect(ls.getLoyalty(2)).toBe(30)
    expect(ls.getLoyalty(3)).toBe(55)
    expect(ls.getLoyalty(4)).toBe(70)
  })

  it('未注入文明与已注入文明共存时互不干扰', () => {
    ;(ls as any).loyalty.set(10, 45)
    expect(ls.getLoyalty(10)).toBe(45)
    expect(ls.getLoyalty(11)).toBe(70)
  })

  it('10个文明批量注入后全部正确读取', () => {
    const data: [number, number][] = [
      [1, 10], [2, 20], [3, 30], [4, 40], [5, 50],
      [6, 60], [7, 70], [8, 80], [9, 90], [10, 100]
    ]
    data.forEach(([id, val]) => { ;(ls as any).loyalty.set(id, val) })
    data.forEach(([id, val]) => { expect(ls.getLoyalty(id)).toBe(val) })
  })

  it('注入文明1不影响文明2的默认值', () => {
    ;(ls as any).loyalty.set(1, 25)
    expect(ls.getLoyalty(2)).toBe(70)
  })

  it('覆盖一个文明不影响另一个文明', () => {
    ;(ls as any).loyalty.set(1, 40)
    ;(ls as any).loyalty.set(2, 60)
    ;(ls as any).loyalty.set(1, 95) // 覆盖
    expect(ls.getLoyalty(1)).toBe(95)
    expect(ls.getLoyalty(2)).toBe(60)
  })
})

// ── loyalty Map 内部结构 ─────────────────────────────────────────────

describe('LoyaltySystem — 内部 Map 结构验证', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('内部 loyalty 是 Map 实例', () => {
    expect((ls as any).loyalty).toBeInstanceOf(Map)
  })

  it('注入3个文明后 Map.size 为 3', () => {
    ;(ls as any).loyalty.set(1, 80)
    ;(ls as any).loyalty.set(2, 50)
    ;(ls as any).loyalty.set(3, 30)
    expect((ls as any).loyalty.size).toBe(3)
  })

  it('注入后 Map.has 返回 true', () => {
    ;(ls as any).loyalty.set(42, 65)
    expect((ls as any).loyalty.has(42)).toBe(true)
  })

  it('未注入的文明 Map.has 返回 false', () => {
    expect((ls as any).loyalty.has(100)).toBe(false)
  })

  it('delete 后 getLoyalty 恢复默认值', () => {
    ;(ls as any).loyalty.set(5, 55)
    expect(ls.getLoyalty(5)).toBe(55)
    ;(ls as any).loyalty.delete(5)
    expect(ls.getLoyalty(5)).toBe(70)
  })

  it('clear 后所有文明恢复默认', () => {
    ;(ls as any).loyalty.set(1, 10)
    ;(ls as any).loyalty.set(2, 90)
    ;(ls as any).loyalty.clear()
    expect(ls.getLoyalty(1)).toBe(70)
    expect(ls.getLoyalty(2)).toBe(70)
  })
})

// ── 私有 Helper — getTerritoryCenter ────────────────────────────────

describe('LoyaltySystem — 私有 getTerritoryCenter', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('territory 为空时返回 null', () => {
    const civ = { territory: new Set<string>() }
    const center = (ls as any).getTerritoryCenter(civ)
    expect(center).toBeNull()
  })

  it('单个 tile 时返回该坐标', () => {
    const civ = { territory: new Set(['5,10']) }
    const center = (ls as any).getTerritoryCenter(civ)
    expect(center).toEqual({ x: 5, y: 10 })
  })

  it('两个对称 tile 返回中点', () => {
    const civ = { territory: new Set(['0,0', '10,10']) }
    const center = (ls as any).getTerritoryCenter(civ)
    expect(center).toEqual({ x: 5, y: 5 })
  })

  it('多个 tile 返回近似重心', () => {
    const civ = { territory: new Set(['0,0', '4,0', '2,4']) }
    const center = (ls as any).getTerritoryCenter(civ)
    expect(center).not.toBeNull()
    // 重心 x = (0+4+2)/3 ≈ 2, y = (0+0+4)/3 ≈ 1
    expect(center!.x).toBeCloseTo(2, 0)
    expect(center!.y).toBeCloseTo(1, 0)
  })

  it('超过200个tile时截断采样仍不为 null', () => {
    const tiles = new Set<string>()
    for (let i = 0; i < 300; i++) {
      tiles.add(`${i},${i}`)
    }
    const civ = { territory: tiles }
    const center = (ls as any).getTerritoryCenter(civ)
    expect(center).not.toBeNull()
  })
})

// ── 私有 Helper — pickEdgeTerritory ─────────────────────────────────

describe('LoyaltySystem — 私有 pickEdgeTerritory', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('territory 为空时返回 null', () => {
    const civ = { territory: new Set<string>() }
    expect((ls as any).pickEdgeTerritory(civ)).toBeNull()
  })

  it('单个 tile 时返回该坐标', () => {
    const civ = { territory: new Set(['7,3']) }
    const result = (ls as any).pickEdgeTerritory(civ)
    expect(result).toEqual({ x: 7, y: 3 })
  })

  it('多个 tile 时返回有效坐标', () => {
    const tiles = new Set<string>()
    for (let i = 0; i < 20; i++) { tiles.add(`${i},${i}`) }
    const civ = { territory: tiles }
    const result = (ls as any).pickEdgeTerritory(civ)
    expect(result).not.toBeNull()
    expect(typeof result!.x).toBe('number')
    expect(typeof result!.y).toBe('number')
  })

  it('返回坐标是 territory 中的合法 tile', () => {
    const tiles = new Set(['1,2', '3,4', '5,6'])
    const civ = { territory: tiles }
    const result = (ls as any).pickEdgeTerritory(civ)
    expect(result).not.toBeNull()
    expect(tiles.has(`${result!.x},${result!.y}`)).toBe(true)
  })
})

// ── 边界值和类型安全 ─────────────────────────────────────────────────

describe('LoyaltySystem — 边界值与类型', () => {
  let ls: LoyaltySystem
  beforeEach(() => { ls = makeLS() })

  it('getLoyalty 返回值始终是 number', () => {
    ;(ls as any).loyalty.set(1, 42)
    expect(typeof ls.getLoyalty(1)).toBe('number')
    expect(typeof ls.getLoyalty(999)).toBe('number')
  })

  it('注入边界 0 和 100 均能正确读取', () => {
    ;(ls as any).loyalty.set(1, 0)
    ;(ls as any).loyalty.set(2, 100)
    expect(ls.getLoyalty(1)).toBe(0)
    expect(ls.getLoyalty(2)).toBe(100)
  })

  it('反复覆盖同一文明最终值正确', () => {
    for (let i = 0; i < 100; i++) {
      ;(ls as any).loyalty.set(1, i)
    }
    expect(ls.getLoyalty(1)).toBe(99)
  })

  it('同一实例创建后调用 getLoyalty 不改变内部状态', () => {
    const before = (ls as any).loyalty.size
    ls.getLoyalty(1)
    ls.getLoyalty(2)
    expect((ls as any).loyalty.size).toBe(before)
  })
})
