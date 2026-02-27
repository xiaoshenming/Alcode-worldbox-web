import { describe, it, expect, beforeEach } from 'vitest'
import { WonderSystem } from '../systems/WonderSystem'
import type { ActiveWonder } from '../systems/WonderSystem'

// WonderSystem 测试：
// - getActiveWonders()      → 返回活跃奇观数组
// - getAvailableWonders()   → 返回未建/未建设中的奇观定义
// - hasWonder(civId, id)    → 检查指定文明是否拥有某奇观
// - getXxxBonus(civId)      → 各奇观效果加成（条件返回特定值或 1.0）
// 通过 as any 注入私有字段 activeWonders/constructions 测试状态。

function makeWS(): WonderSystem {
  return new WonderSystem()
}

function makeActiveWonder(defId: string, civId: number, entityId = 1, x = 0, y = 0): ActiveWonder {
  return { defId, civId, entityId, x, y, completedAt: 0 }
}

// ── getActiveWonders ──────────────────────────────────────────────────────────

describe('WonderSystem.getActiveWonders', () => {
  let ws: WonderSystem

  beforeEach(() => {
    ws = makeWS()
  })

  it('初始��空', () => {
    expect(ws.getActiveWonders()).toHaveLength(0)
  })

  it('注入奇观后可查询到', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    expect(ws.getActiveWonders()).toHaveLength(1)
    expect(ws.getActiveWonders()[0].defId).toBe('great_library')
  })

  it('多个奇观都能查询到', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    ;(ws as any).activeWonders.push(makeActiveWonder('colosseum', 2))
    expect(ws.getActiveWonders()).toHaveLength(2)
  })
})

// ── getAvailableWonders ───────────────────────────────────────────────────────

describe('WonderSystem.getAvailableWonders', () => {
  let ws: WonderSystem

  beforeEach(() => {
    ws = makeWS()
  })

  it('初始时 5 个奇观全部可用', () => {
    expect(ws.getAvailableWonders()).toHaveLength(5)
  })

  it('建成一个奇观后可用数减少', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every(d => d.id !== 'great_library')).toBe(true)
  })

  it('在建设中的奇观也从可用列表移除', () => {
    ;(ws as any).constructions.push({ defId: 'colosseum', civId: 1, startedAt: 0 })
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every(d => d.id !== 'colosseum')).toBe(true)
  })

  it('全部奇观建成后返回空数组', () => {
    const ids = ['great_library', 'colosseum', 'grand_bazaar', 'world_tree', 'sky_fortress']
    ids.forEach(id => { ;(ws as any).activeWonders.push(makeActiveWonder(id, 1)) })
    expect(ws.getAvailableWonders()).toHaveLength(0)
  })
})

// ── hasWonder ─────────────────────────────────────────────────────────────────

describe('WonderSystem.hasWonder', () => {
  let ws: WonderSystem

  beforeEach(() => {
    ws = makeWS()
  })

  it('无奇观时返回 false', () => {
    expect(ws.hasWonder(1, 'great_library')).toBe(false)
  })

  it('文明拥有奇观时返回 true', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 5))
    expect(ws.hasWonder(5, 'great_library')).toBe(true)
  })

  it('文明 id 不匹配时返回 false', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(2, 'great_library')).toBe(false)
  })

  it('奇观 id 不匹配时返回 false', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
  })
})

// ── getXxxBonus ───────────────────────────────────────────────────────────────

describe('WonderSystem bonus methods', () => {
  let ws: WonderSystem

  beforeEach(() => {
    ws = makeWS()
  })

  it('getResearchBonus：无 great_library 时返回 1.0', () => {
    expect(ws.getResearchBonus(1)).toBe(1.0)
  })

  it('getResearchBonus：有 great_library 时返回 1.5', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    expect(ws.getResearchBonus(1)).toBe(1.5)
  })

  it('getCombatBonus：有 colosseum 时返回 1.3', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('colosseum', 1))
    expect(ws.getCombatBonus(1)).toBe(1.3)
    expect(ws.getCombatBonus(2)).toBe(1.0)  // 其他文明无效
  })

  it('getHappinessBonus：有 colosseum 时返回 10', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('colosseum', 3))
    expect(ws.getHappinessBonus(3)).toBe(10)
    expect(ws.getHappinessBonus(1)).toBe(0)
  })

  it('getTradeBonus：有 grand_bazaar 时返回 2.0', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.getTradeBonus(2)).toBe(2.0)
    expect(ws.getTradeBonus(1)).toBe(1.0)
  })

  it('getResourceBonus：有 grand_bazaar 时返回 1.2', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.getResourceBonus(2)).toBe(1.2)
  })

  it('getFoodBonus：有 world_tree 时返回 1.5', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('world_tree', 4))
    expect(ws.getFoodBonus(4)).toBe(1.5)
    expect(ws.getFoodBonus(1)).toBe(1.0)
  })

  it('getPopCapBonus：有 world_tree 时返回 1.3', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('world_tree', 4))
    expect(ws.getPopCapBonus(4)).toBe(1.3)
  })

  it('getBuildingHPBonus：有 sky_fortress 时返回 2.0', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('sky_fortress', 5))
    expect(ws.getBuildingHPBonus(5)).toBe(2.0)
    expect(ws.getBuildingHPBonus(1)).toBe(1.0)
  })

  it('getDefenseBonus：有 sky_fortress 时返回 1.5', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('sky_fortress', 5))
    expect(ws.getDefenseBonus(5)).toBe(1.5)
  })

  it('同一文明拥有多个奇观时各 bonus 独立计算', () => {
    ;(ws as any).activeWonders.push(makeActiveWonder('great_library', 1))
    ;(ws as any).activeWonders.push(makeActiveWonder('colosseum', 1))
    expect(ws.getResearchBonus(1)).toBe(1.5)
    expect(ws.getCombatBonus(1)).toBe(1.3)
    expect(ws.getFoodBonus(1)).toBe(1.0)  // 无 world_tree
  })
})
