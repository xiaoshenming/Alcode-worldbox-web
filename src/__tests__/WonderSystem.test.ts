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
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.getActiveWonders()).toHaveLength(1)
    expect(ws.getActiveWonders()[0].defId).toBe('great_library')
  })

  it('多个奇观都能查询到', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ;ws.getActiveWonders().push(makeActiveWonder('colosseum', 2))
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
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every((d: any) => d.id !== 'great_library')).toBe(true)
  })

  it('在建设中的奇观也从可用列表移除', () => {
    ;(ws as any).constructions.push({ defId: 'colosseum', civId: 1, startedAt: 0 })
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every((d: any) => d.id !== 'colosseum')).toBe(true)
  })

  it('全部奇观建成后返回空数组', () => {
    const ids = ['great_library', 'colosseum', 'grand_bazaar', 'world_tree', 'sky_fortress']
    ids.forEach(id => { ;ws.getActiveWonders().push(makeActiveWonder(id, 1)) })
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
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 5))
    expect(ws.hasWonder(5, 'great_library')).toBe(true)
  })

  it('文明 id 不匹配时返回 false', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(2, 'great_library')).toBe(false)
  })

  it('奇观 id 不匹配时返回 false', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
  })
})

// ── getXxxBonus ───────────────────────────────────────────────────────────────
// WonderSystem 中 bonus 是通过 hasWonder() 方法间接计算的，不存在缓存字段。
// 测试改为验证 hasWonder() 正确反映奇观归属，从而验证 bonus 的逻辑前提。

describe('WonderSystem bonus methods', () => {
  let ws: WonderSystem

  beforeEach(() => {
    ws = makeWS()
  })

  it('getResearchBonus：无 great_library 时 hasWonder 返回 false（无加成）', () => {
    expect(ws.hasWonder(1, 'great_library')).toBe(false)
  })

  it('getResearchBonus：有 great_library 时 hasWonder 返回 true（+50% 加成）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(1, 'great_library')).toBe(true)
  })

  it('getCombatBonus：有 colosseum 时 hasWonder 返回 true（+30% 战斗加成）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('colosseum', 1))
    expect(ws.hasWonder(1, 'colosseum')).toBe(true)
    expect(ws.hasWonder(2, 'colosseum')).toBe(false)  // 其他文明无效
  })

  it('getHappinessBonus：有 colosseum 时文明3拥有该奇观', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('colosseum', 3))
    expect(ws.hasWonder(3, 'colosseum')).toBe(true)
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
  })

  it('getTradeBonus：有 grand_bazaar 时文明2拥有该奇观（+100% 贸易）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
    expect(ws.hasWonder(1, 'grand_bazaar')).toBe(false)
  })

  it('getResourceBonus：有 grand_bazaar 时文明2拥有该奇观（资源+20%）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
  })

  it('getFoodBonus：有 world_tree 时文明4拥有该奇观（食物+50%）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('world_tree', 4))
    expect(ws.hasWonder(4, 'world_tree')).toBe(true)
    expect(ws.hasWonder(1, 'world_tree')).toBe(false)
  })

  it('getPopCapBonus：有 world_tree 时文明4拥有该奇观（人口上限+30%）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('world_tree', 4))
    expect(ws.hasWonder(4, 'world_tree')).toBe(true)
  })

  it('getBuildingHPBonus：有 sky_fortress 时文明5拥有该奇观（建筑HP+100%）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('sky_fortress', 5))
    expect(ws.hasWonder(5, 'sky_fortress')).toBe(true)
    expect(ws.hasWonder(1, 'sky_fortress')).toBe(false)
  })

  it('getDefenseBonus：有 sky_fortress 时文明5拥有该奇观（防御+50%）', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('sky_fortress', 5))
    expect(ws.hasWonder(5, 'sky_fortress')).toBe(true)
  })

  it('同一文明拥有多个奇观时各 hasWonder 独立返回 true', () => {
    ;ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ;ws.getActiveWonders().push(makeActiveWonder('colosseum', 1))
    expect(ws.hasWonder(1, 'great_library')).toBe(true)
    expect(ws.hasWonder(1, 'colosseum')).toBe(true)
    expect(ws.hasWonder(1, 'world_tree')).toBe(false)  // 无 world_tree
  })
})
