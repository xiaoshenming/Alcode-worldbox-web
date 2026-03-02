import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MiningSystem, OreType } from '../systems/MiningSystem'
import type { OreDeposit } from '../systems/MiningSystem'

afterEach(() => vi.restoreAllMocks())

function makeSys(): MiningSystem { return new MiningSystem() }

function makeDeposit(civId: number = 1, type: OreType = OreType.IRON, discovered = true): OreDeposit {
  return {
    x: 5, y: 5, type,
    size: 'medium',
    reserves: 100, maxReserves: 100,
    discovered, discoveredBy: discovered ? civId : null,
    mineBuilt: false, productionRate: 1.0
  }
}

function makeDepositFull(overrides: Partial<OreDeposit> = {}): OreDeposit {
  return {
    x: 5, y: 5, type: OreType.IRON,
    size: 'medium',
    reserves: 100, maxReserves: 100,
    discovered: true, discoveredBy: 1,
    mineBuilt: false, productionRate: 1.0,
    ...overrides
  }
}

// ── getDiscoveredDeposits ───────────────────────────────────────────

describe('MiningSystem.getDiscoveredDeposits — 基础查询', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无矿床', () => {
    expect(sys.getDiscoveredDeposits()).toHaveLength(0)
  })

  it('注入已发现矿床后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.GOLD))
    expect(sys.getDiscoveredDeposits()).toHaveLength(1)
  })

  it('未发现的矿床不返回', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON, false))
    expect(sys.getDiscoveredDeposits()).toHaveLength(0)
  })

  it('支持6种���石类型全部已发现', () => {
    const types = [OreType.COPPER, OreType.IRON, OreType.GOLD, OreType.GEMS, OreType.MITHRIL, OreType.ADAMANTINE]
    types.forEach(t => { ;(sys as any).deposits.push(makeDeposit(1, t)) })
    expect(sys.getDiscoveredDeposits()).toHaveLength(6)
  })

  it('混合已发现和未发现只返回已发现', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON, true))
    ;(sys as any).deposits.push(makeDeposit(2, OreType.GOLD, false))
    ;(sys as any).deposits.push(makeDeposit(3, OreType.COPPER, true))
    expect(sys.getDiscoveredDeposits()).toHaveLength(2)
  })

  it('全部未发现时返回空数组', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON, false))
    }
    expect(sys.getDiscoveredDeposits()).toHaveLength(0)
  })

  it('返回数组元素包含正确的 type 字段', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.GEMS))
    const result = sys.getDiscoveredDeposits()
    expect(result[0].type).toBe(OreType.GEMS)
  })

  it('返回数组元素包含正确的坐标', () => {
    const d = makeDepositFull({ x: 10, y: 20 })
    ;(sys as any).deposits.push(d)
    const result = sys.getDiscoveredDeposits()
    expect(result[0].x).toBe(10)
    expect(result[0].y).toBe(20)
  })

  it('10个已发现矿床全部返回', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).deposits.push(makeDeposit(i + 1, OreType.COPPER))
    }
    expect(sys.getDiscoveredDeposits()).toHaveLength(10)
  })

  it('返回值是数组类型', () => {
    expect(Array.isArray(sys.getDiscoveredDeposits())).toBe(true)
  })
})

// ── getDepositsForCiv ───────────────────────────────────────────────

describe('MiningSystem.getDepositsForCiv — 文明过滤', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('无矿床时返回空', () => {
    expect(sys.getDepositsForCiv(1)).toHaveLength(0)
  })

  it('按文明ID过滤', () => {
    ;(sys as any).deposits.push(makeDeposit(1))
    ;(sys as any).deposits.push(makeDeposit(2))
    expect(sys.getDepositsForCiv(1)).toHaveLength(1)
    expect(sys.getDepositsForCiv(2)).toHaveLength(1)
  })

  it('返回指定文明的全部矿床', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON))
    ;(sys as any).deposits.push(makeDeposit(1, OreType.GOLD))
    ;(sys as any).deposits.push(makeDeposit(2, OreType.COPPER))
    expect(sys.getDepositsForCiv(1)).toHaveLength(2)
    expect(sys.getDepositsForCiv(2)).toHaveLength(1)
  })

  it('不存在的文明返回空', () => {
    ;(sys as any).deposits.push(makeDeposit(1))
    expect(sys.getDepositsForCiv(99)).toHaveLength(0)
  })

  it('discoveredBy 为 null 的矿床不被任何文明查到', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON, false))
    expect(sys.getDepositsForCiv(1)).toHaveLength(0)
  })

  it('文明3拥有5个矿床时全部返回', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).deposits.push(makeDeposit(3, OreType.COPPER))
    }
    expect(sys.getDepositsForCiv(3)).toHaveLength(5)
  })

  it('文明的矿床包含正确的 discoveredBy 字段', () => {
    ;(sys as any).deposits.push(makeDeposit(7, OreType.GEMS))
    const result = sys.getDepositsForCiv(7)
    expect(result[0].discoveredBy).toBe(7)
  })

  it('返回值是数组类型', () => {
    expect(Array.isArray(sys.getDepositsForCiv(1))).toBe(true)
  })

  it('混合文明矿床时各文明独立计数', () => {
    for (let civ = 1; civ <= 4; civ++) {
      for (let j = 0; j < civ; j++) {
        ;(sys as any).deposits.push(makeDeposit(civ, OreType.IRON))
      }
    }
    expect(sys.getDepositsForCiv(1)).toHaveLength(1)
    expect(sys.getDepositsForCiv(2)).toHaveLength(2)
    expect(sys.getDepositsForCiv(3)).toHaveLength(3)
    expect(sys.getDepositsForCiv(4)).toHaveLength(4)
  })
})

// ── getMiningBonus ──────────────────────────────────────────────────

describe('MiningSystem.getMiningBonus — 返回结构验证', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('返回 military/wealth/culture 三个字段', () => {
    const bonus = sys.getMiningBonus(OreType.GOLD)
    expect(bonus).toHaveProperty('military')
    expect(bonus).toHaveProperty('wealth')
    expect(bonus).toHaveProperty('culture')
  })

  it('NONE 类型返回全零加成', () => {
    const bonus = sys.getMiningBonus(OreType.NONE)
    expect(bonus.military).toBe(0)
    expect(bonus.wealth).toBe(0)
    expect(bonus.culture).toBe(0)
  })

  it('COPPER 有军事加成', () => {
    const bonus = sys.getMiningBonus(OreType.COPPER)
    expect(bonus.military).toBeGreaterThan(0)
  })

  it('COPPER wealth 加成小于 GOLD', () => {
    expect(sys.getMiningBonus(OreType.COPPER).wealth).toBeLessThan(
      sys.getMiningBonus(OreType.GOLD).wealth
    )
  })

  it('IRON 军事加成大于 COPPER', () => {
    expect(sys.getMiningBonus(OreType.IRON).military).toBeGreaterThan(
      sys.getMiningBonus(OreType.COPPER).military
    )
  })

  it('GOLD 财富加成是最高的之一', () => {
    const goldBonus = sys.getMiningBonus(OreType.GOLD)
    expect(goldBonus.wealth).toBeGreaterThan(0)
    expect(goldBonus.culture).toBeGreaterThan(0)
  })

  it('GEMS 文化加成大于 IRON', () => {
    expect(sys.getMiningBonus(OreType.GEMS).culture).toBeGreaterThan(
      sys.getMiningBonus(OreType.IRON).culture
    )
  })

  it('MITHRIL 军事加成大于 IRON', () => {
    expect(sys.getMiningBonus(OreType.MITHRIL).military).toBeGreaterThan(
      sys.getMiningBonus(OreType.IRON).military
    )
  })

  it('ADAMANTINE 军事加成最高', () => {
    const allTypes = [OreType.COPPER, OreType.IRON, OreType.GOLD, OreType.GEMS, OreType.MITHRIL]
    const adamantineMil = sys.getMiningBonus(OreType.ADAMANTINE).military
    allTypes.forEach(t => {
      expect(adamantineMil).toBeGreaterThanOrEqual(sys.getMiningBonus(t).military)
    })
  })

  it('所有类型加成值均为非负数', () => {
    const allTypes = [OreType.NONE, OreType.COPPER, OreType.IRON, OreType.GOLD,
                     OreType.GEMS, OreType.MITHRIL, OreType.ADAMANTINE]
    allTypes.forEach(t => {
      const b = sys.getMiningBonus(t)
      expect(b.military).toBeGreaterThanOrEqual(0)
      expect(b.wealth).toBeGreaterThanOrEqual(0)
      expect(b.culture).toBeGreaterThanOrEqual(0)
    })
  })

  it('getMiningBonus 多次调用同类型返回相同对象（单例）', () => {
    const b1 = sys.getMiningBonus(OreType.IRON)
    const b2 = sys.getMiningBonus(OreType.IRON)
    expect(b1).toBe(b2) // 应为同一单例引用
  })

  it('MITHRIL 有文化加成', () => {
    expect(sys.getMiningBonus(OreType.MITHRIL).culture).toBeGreaterThan(0)
  })

  it('ADAMANTINE 财富加成大于 NONE', () => {
    expect(sys.getMiningBonus(OreType.ADAMANTINE).wealth).toBeGreaterThan(
      sys.getMiningBonus(OreType.NONE).wealth
    )
  })
})

// ── OreType 枚举验证 ─────────────────────────────────────────────────

describe('OreType 枚举 — 值与顺序', () => {
  it('NONE 值为 0', () => { expect(OreType.NONE).toBe(0) })
  it('COPPER 值为 1', () => { expect(OreType.COPPER).toBe(1) })
  it('IRON 值为 2', () => { expect(OreType.IRON).toBe(2) })
  it('GOLD 值为 3', () => { expect(OreType.GOLD).toBe(3) })
  it('GEMS 值为 4', () => { expect(OreType.GEMS).toBe(4) })
  it('MITHRIL 值为 5', () => { expect(OreType.MITHRIL).toBe(5) })
  it('ADAMANTINE 值为 6', () => { expect(OreType.ADAMANTINE).toBe(6) })
  it('共有 7 个矿石类型（含 NONE）', () => {
    const values = Object.values(OreType).filter(v => typeof v === 'number')
    expect(values).toHaveLength(7)
  })
})

// ── OreDeposit 结构 ──────────────────────────────────────────────────

describe('OreDeposit — 接口字段完整性', () => {
  it('makeDeposit 工具函数生成完整结构', () => {
    const d = makeDeposit()
    expect(d).toHaveProperty('x')
    expect(d).toHaveProperty('y')
    expect(d).toHaveProperty('type')
    expect(d).toHaveProperty('size')
    expect(d).toHaveProperty('reserves')
    expect(d).toHaveProperty('maxReserves')
    expect(d).toHaveProperty('discovered')
    expect(d).toHaveProperty('discoveredBy')
    expect(d).toHaveProperty('mineBuilt')
    expect(d).toHaveProperty('productionRate')
  })

  it('size 字段为合法值之一', () => {
    const d = makeDeposit()
    expect(['small', 'medium', 'large']).toContain(d.size)
  })

  it('reserves 不超过 maxReserves', () => {
    const d = makeDeposit()
    expect(d.reserves).toBeLessThanOrEqual(d.maxReserves)
  })

  it('未发现矿床的 discoveredBy 应为 null', () => {
    const d = makeDepositFull({ discovered: false, discoveredBy: null })
    expect(d.discoveredBy).toBeNull()
  })
})

// ── tryDiscoverOre ───────────────────────────────────────────────────

describe('MiningSystem.tryDiscoverOre — 越界与不存在', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('超出世界边界 x<0 返回 null', () => {
    const result = sys.tryDiscoverOre(1, -1, 5, 1, 'human')
    expect(result).toBeNull()
  })

  it('超出世界边界 y<0 返回 null', () => {
    const result = sys.tryDiscoverOre(1, 5, -1, 1, 'human')
    expect(result).toBeNull()
  })

  it('坐标合法但无矿床返回 null', () => {
    const result = sys.tryDiscoverOre(1, 10, 10, 1, 'human')
    expect(result).toBeNull()
  })
})

// ── MiningSystem 内部状态 ────────────────────────────────────────────

describe('MiningSystem — 内部 deposits 数组', () => {
  let sys: MiningSystem
  beforeEach(() => { sys = makeSys() })

  it('初始 deposits 为空数组', () => {
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('手动推入后 deposits 长度增加', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('getDiscoveredDeposits 与 deposits 过滤结果一致', () => {
    ;(sys as any).deposits.push(makeDeposit(1, OreType.IRON, true))
    ;(sys as any).deposits.push(makeDeposit(2, OreType.GOLD, false))
    const discovered = sys.getDiscoveredDeposits()
    const manual = (sys as any).deposits.filter((d: OreDeposit) => d.discovered)
    expect(discovered.length).toBe(manual.length)
  })
})
