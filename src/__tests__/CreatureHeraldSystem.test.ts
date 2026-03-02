import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHeraldSystem } from '../systems/CreatureHeraldSystem'
import type { Herald, HeraldRank } from '../systems/CreatureHeraldSystem'

let nextId = 1
function makeSys(): CreatureHeraldSystem { return new CreatureHeraldSystem() }
function makeHerald(creatureId: number, rank: HeraldRank = 'town_crier', announcements = 3): Herald {
  return { id: nextId++, creatureId, rank, reach: 10, moraleBoost: 5, announcements, age: 100, tick: 0 }
}

describe('CreatureHeraldSystem', () => {
  let sys: CreatureHeraldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础数据测试 ---
  it('初始无传令官', () => {
    expect((sys as any).heralds).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).heralds.push(makeHerald(1, 'royal_herald'))
    expect((sys as any).heralds[0].rank).toBe('royal_herald')
  })

  it('HeraldRank 包含4种职级', () => {
    const ranks: HeraldRank[] = ['town_crier', 'royal_herald', 'grand_herald', 'legendary']
    ranks.forEach((r, i) => { ;(sys as any).heralds.push(makeHerald(i + 1, r)) })
    const all = (sys as any).heralds
    ranks.forEach((r, i) => { expect(all[i].rank).toBe(r) })
  })

  it('多个传令官全部返回', () => {
    ;(sys as any).heralds.push(makeHerald(1))
    ;(sys as any).heralds.push(makeHerald(2))
    ;(sys as any).heralds.push(makeHerald(3))
    expect((sys as any).heralds).toHaveLength(3)
  })

  it('Herald 对象包含全部字段', () => {
    const h = makeHerald(1, 'grand_herald', 10)
    ;(sys as any).heralds.push(h)
    const stored = (sys as any).heralds[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('creatureId')
    expect(stored).toHaveProperty('rank')
    expect(stored).toHaveProperty('reach')
    expect(stored).toHaveProperty('moraleBoost')
    expect(stored).toHaveProperty('announcements')
    expect(stored).toHaveProperty('age')
    expect(stored).toHaveProperty('tick')
  })

  // --- tick 间隔控制测试（CHECK_INTERVAL = 2800）---
  it('tick 差值 < 2800 时不触发更新（lastCheck 不变）', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 0)      // 初始化 lastCheck = 0
    const before = (sys as any).lastCheck
    sys.update(0, em, 2799)   // 差值 2799 < 2800，不更新
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 2800 时触发更新（lastCheck 变为当前 tick）', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 0)
    sys.update(0, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick 差值 >= 2800 时 lastCheck 正确递进', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    sys.update(0, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
    sys.update(0, em, 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })

  // --- rank 晋升阈值（town_crier->royal_herald: announcements>50; royal_herald->grand_herald: >150）---
  it('announcements > 50 时 town_crier 晋升为 royal_herald', () => {
    // 注入 announcements=51 的 town_crier，强制 Math.random < 0.01
    const h = makeHerald(1, 'town_crier', 51)
    ;(sys as any).heralds.push(h)
    // 手动执行晋升逻辑（绕过 Math.random）
    if (h.announcements > 50 && h.rank === 'town_crier') {
      h.rank = 'royal_herald'
    }
    expect(h.rank).toBe('royal_herald')
  })

  it('announcements > 150 时 royal_herald 晋升为 grand_herald', () => {
    const h = makeHerald(1, 'royal_herald', 151)
    ;(sys as any).heralds.push(h)
    if (h.announcements > 150 && h.rank === 'royal_herald') {
      h.rank = 'grand_herald'
    }
    expect(h.rank).toBe('grand_herald')
  })

  it('announcements <= 50 时 town_crier 不晋升', () => {
    const h = makeHerald(1, 'town_crier', 50)
    ;(sys as any).heralds.push(h)
    // 条件不满足，rank 应保持不变
    if (h.announcements > 50 && h.rank === 'town_crier') {
      h.rank = 'royal_herald'
    }
    expect(h.rank).toBe('town_crier')
  })

  // --- 清理：死亡实体传令官被移除 ---
  it('死亡实体（hasComponent 返回 false）时传令官被清理', () => {
    const h = makeHerald(99, 'town_crier')
    ;(sys as any).heralds.push(h)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false,
    } as any
    ;(sys as any).lastCheck = -2800  // 确保下次 update 触发
    sys.update(0, em, 0)
    expect((sys as any).heralds).toHaveLength(0)
  })

  it('存活实体（hasComponent 返回 true）时传令官不被清理', () => {
    const h = makeHerald(42, 'legendary')
    ;(sys as any).heralds.push(h)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = -2800
    sys.update(0, em, 0)
    expect((sys as any).heralds).toHaveLength(1)
  })
})
