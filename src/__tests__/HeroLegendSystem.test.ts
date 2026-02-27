import { describe, it, expect, beforeEach } from 'vitest'
import { HeroLegendSystem } from '../systems/HeroLegendSystem'
import type { HeroFame, LegendaryDeed } from '../systems/HeroLegendSystem'

function makeSys(): HeroLegendSystem { return new HeroLegendSystem() }
function makeDeed(type: string): LegendaryDeed {
  return { type, description: type + ' desc', tick: 0 }
}
function makeFame(entityId: number, fame: number = 0): HeroFame {
  return { entityId, name: 'Hero ' + entityId, fame, title: 'Unknown', deeds: [], civId: 1 }
}

describe('HeroLegendSystem.getLeaderboard', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无英雄', () => { expect(sys.getLeaderboard()).toHaveLength(0) })
  it('注入fameMap+trackedHeroes后可查询', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 200))
    ;(sys as any).trackedHeroes.add(1)
    expect(sys.getLeaderboard()).toHaveLength(1)
  })
  it('未在trackedHeroes中的英雄不返回', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 200))
    // 不加入trackedHeroes
    expect(sys.getLeaderboard()).toHaveLength(0)
  })
  it('按fame降序排列', () => {
    ;(sys as any).fameMap.set(1, makeFame(1, 100))
    ;(sys as any).fameMap.set(2, makeFame(2, 500))
    ;(sys as any).fameMap.set(3, makeFame(3, 50))
    ;(sys as any).trackedHeroes.add(1)
    ;(sys as any).trackedHeroes.add(2)
    ;(sys as any).trackedHeroes.add(3)
    const lb = sys.getLeaderboard()
    expect(lb[0].fame).toBeGreaterThanOrEqual(lb[1].fame)
    expect(lb[1].fame).toBeGreaterThanOrEqual(lb[2].fame)
  })
  it('getFame可查询单个英雄（无需trackedHeroes）', () => {
    ;(sys as any).fameMap.set(5, makeFame(5, 300))
    const f = sys.getFame(5)
    expect(f).toBeDefined()
    expect(f!.fame).toBe(300)
  })
  it('getFame查询不存在的英雄返回undefined', () => {
    expect(sys.getFame(999)).toBeUndefined()
  })
})

describe('HeroLegendSystem.getMonuments', () => {
  let sys: HeroLegendSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无纪念碑', () => { expect(sys.getMonuments()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).monuments.push({ entityId: 1, heroName: 'A', deeds: [], civId: 1, x: 5, y: 5 })
    expect(sys.getMonuments()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).monuments.push({ entityId: 1, heroName: 'A', deeds: [], civId: 1, x: 5, y: 5 })
    expect(sys.getMonuments()).toBe((sys as any).monuments)
  })
})
