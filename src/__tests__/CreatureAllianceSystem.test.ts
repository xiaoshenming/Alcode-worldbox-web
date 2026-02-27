import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAllianceSystem } from '../systems/CreatureAllianceSystem'
import type { PersonalAlliance } from '../systems/CreatureAllianceSystem'

// CreatureAllianceSystem 测试:
// - getAlliances()          → 返回内部数组引用
// - getAlliancesFor(id)     → 过滤 memberA 或 memberB 等于 id 的联盟
// - getAllianceCount()      → 返回联盟数量
// update() 依赖 EntityManager，不在此测试。

let nextId = 1

function makeALS(): CreatureAllianceSystem {
  return new CreatureAllianceSystem()
}

function makeAlliance(memberA: number, memberB: number, type: PersonalAlliance['type'] = 'friendship'): PersonalAlliance {
  return {
    id: nextId++,
    memberA,
    memberB,
    strength: 50,
    formedAt: 0,
    lastInteraction: 0,
    type,
  }
}

describe('CreatureAllianceSystem.getAllianceCount', () => {
  let als: CreatureAllianceSystem

  beforeEach(() => { als = makeALS(); nextId = 1 })

  it('初始联盟数量为 0', () => {
    expect(als.getAllianceCount()).toBe(0)
  })

  it('注入 1 个联盟后数量为 1', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    expect(als.getAllianceCount()).toBe(1)
  })

  it('注入多个联盟数量累加', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    ;(als as any).alliances.push(makeAlliance(2, 3))
    ;(als as any).alliances.push(makeAlliance(3, 4))
    expect(als.getAllianceCount()).toBe(3)
  })
})

describe('CreatureAllianceSystem.getAlliances', () => {
  let als: CreatureAllianceSystem

  beforeEach(() => { als = makeALS(); nextId = 1 })

  it('初始返回空数组', () => {
    expect(als.getAlliances()).toHaveLength(0)
  })

  it('返回内部数组引用', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    expect(als.getAlliances()).toBe((als as any).alliances)
  })

  it('包含注入的联盟数据', () => {
    const alliance = makeAlliance(1, 2, 'blood_oath')
    ;(als as any).alliances.push(alliance)
    expect(als.getAlliances()[0].type).toBe('blood_oath')
    expect(als.getAlliances()[0].memberA).toBe(1)
    expect(als.getAlliances()[0].memberB).toBe(2)
  })

  it('支持所有 4 种联盟类型', () => {
    const types: PersonalAlliance['type'][] = ['friendship', 'blood_oath', 'mentor', 'rival_respect']
    types.forEach((t, i) => {
      ;(als as any).alliances.push(makeAlliance(i + 1, i + 10, t))
    })
    const all = als.getAlliances()
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureAllianceSystem.getAlliancesFor', () => {
  let als: CreatureAllianceSystem

  beforeEach(() => { als = makeALS(); nextId = 1 })

  it('没有联盟时返回空数组', () => {
    expect(als.getAlliancesFor(1)).toHaveLength(0)
  })

  it('作为 memberA 的联盟被返回', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    expect(als.getAlliancesFor(1)).toHaveLength(1)
  })

  it('作为 memberB 的联盟也被返回', () => {
    ;(als as any).alliances.push(makeAlliance(5, 1))
    expect(als.getAlliancesFor(1)).toHaveLength(1)
  })

  it('只返回包含指定实体的联盟', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    ;(als as any).alliances.push(makeAlliance(2, 3))
    ;(als as any).alliances.push(makeAlliance(3, 4))
    expect(als.getAlliancesFor(1)).toHaveLength(1)  // 只有 1-2
    expect(als.getAlliancesFor(2)).toHaveLength(2)  // 1-2 和 2-3
    expect(als.getAlliancesFor(5)).toHaveLength(0)  // 不存在
  })

  it('多条联盟全部返回', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    ;(als as any).alliances.push(makeAlliance(1, 3))
    ;(als as any).alliances.push(makeAlliance(1, 4))
    expect(als.getAlliancesFor(1)).toHaveLength(3)
  })
})
