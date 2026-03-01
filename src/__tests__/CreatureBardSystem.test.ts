import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBardSystem } from '../systems/CreatureBardSystem'
import type { Performance, SongType } from '../systems/CreatureBardSystem'

// CreatureBardSystem 测试:
// - getPerformances()   → 返回只读演出数组内部引用
// - getBardSkill(eid)   → 未注册返回 0，注入后返回对应技能值
// update() 依赖 EntityManager，不在此测试。

let nextPerfId = 1

function makeBardSys(): CreatureBardSystem {
  return new CreatureBardSystem()
}

function makePerformance(performer: number, song: SongType = 'ballad'): Performance {
  return {
    id: nextPerfId++,
    song,
    performer,
    morale_boost: 10,
    radius: 6,
    tick: 0,
  }
}

describe('CreatureBardSystem.getPerformances', () => {
  let sys: CreatureBardSystem

  beforeEach(() => { sys = makeBardSys(); nextPerfId = 1 })

  it('初始无演出', () => {
    expect((sys as any).performances).toHaveLength(0)
  })

  it('注入演出后可查询', () => {
    ;(sys as any).performances.push(makePerformance(1, 'war_chant'))
    expect((sys as any).performances).toHaveLength(1)
    expect((sys as any).performances[0].song).toBe('war_chant')
  })

  it('返回内部引用', () => {
    ;(sys as any).performances.push(makePerformance(1))
    expect((sys as any).performances).toBe((sys as any).performances)
  })

  it('支持所有 5 种歌曲类型', () => {
    const songs: SongType[] = ['war_chant', 'lullaby', 'ballad', 'hymn', 'dirge']
    songs.forEach((s, i) => {
      ;(sys as any).performances.push(makePerformance(i + 1, s))
    })
    const results = (sys as any).performances
    expect(results).toHaveLength(5)
    songs.forEach((s, i) => { expect(results[i].song).toBe(s) })
  })

  it('演出包含正确的表演者 id', () => {
    ;(sys as any).performances.push(makePerformance(42))
    expect((sys as any).performances[0].performer).toBe(42)
  })

  it('多个演出全部返回', () => {
    ;(sys as any).performances.push(makePerformance(1))
    ;(sys as any).performances.push(makePerformance(2))
    ;(sys as any).performances.push(makePerformance(3))
    expect((sys as any).performances).toHaveLength(3)
  })
})

describe('CreatureBardSystem.getBardSkill', () => {
  let sys: CreatureBardSystem

  beforeEach(() => { sys = makeBardSys() })

  it('未注册实体返回 0', () => {
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(0)
    expect(((sys as any).bardSkill.get(999) ?? 0)).toBe(0)
  })

  it('注入技能后可查询', () => {
    ;(sys as any).bardSkill.set(1, 75)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(75)
  })

  it('多个实体技能独立', () => {
    ;(sys as any).bardSkill.set(1, 30)
    ;(sys as any).bardSkill.set(2, 80)
    ;(sys as any).bardSkill.set(3, 55)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(30)
    expect(((sys as any).bardSkill.get(2) ?? 0)).toBe(80)
    expect(((sys as any).bardSkill.get(3) ?? 0)).toBe(55)
    expect(((sys as any).bardSkill.get(4) ?? 0)).toBe(0)
  })

  it('注入零技能值', () => {
    ;(sys as any).bardSkill.set(5, 0)
    expect(((sys as any).bardSkill.get(5) ?? 0)).toBe(0)
  })

  it('注入最大技能 100', () => {
    ;(sys as any).bardSkill.set(6, 100)
    expect(((sys as any).bardSkill.get(6) ?? 0)).toBe(100)
  })
})
