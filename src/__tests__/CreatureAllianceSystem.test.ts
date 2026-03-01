import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAllianceSystem } from '../systems/CreatureAllianceSystem'
import type { PersonalAlliance } from '../systems/CreatureAllianceSystem'

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

describe('CreatureAllianceSystem', () => {
  let als: CreatureAllianceSystem

  beforeEach(() => { als = makeALS(); nextId = 1 })

  it('初始联盟数量为0', () => {
    expect((als as any).alliances).toHaveLength(0)
  })

  it('注入1个联盟后数量为1', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    expect((als as any).alliances).toHaveLength(1)
  })

  it('注入多个联盟数量累加', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    ;(als as any).alliances.push(makeAlliance(2, 3))
    ;(als as any).alliances.push(makeAlliance(3, 4))
    expect((als as any).alliances).toHaveLength(3)
  })

  it('alliances是数组', () => {
    expect(Array.isArray((als as any).alliances)).toBe(true)
  })

  it('注入blood_oath联盟后type正确', () => {
    const alliance = makeAlliance(1, 2, 'blood_oath')
    ;(als as any).alliances.push(alliance)
    expect((als as any).alliances[0].type).toBe('blood_oath')
    expect((als as any).alliances[0].memberA).toBe(1)
    expect((als as any).alliances[0].memberB).toBe(2)
  })

  it('支持所有4种联盟类型', () => {
    const types: PersonalAlliance['type'][] = ['friendship', 'blood_oath', 'mentor', 'rival_respect']
    types.forEach((t, i) => {
      ;(als as any).alliances.push(makeAlliance(i + 1, i + 10, t))
    })
    expect((als as any).alliances).toHaveLength(4)
    types.forEach((t, i) => { expect((als as any).alliances[i].type).toBe(t) })
  })

  it('特定id在memberA联盟中可手动查找', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    const found = (als as any).alliances.filter((a: PersonalAlliance) => a.memberA === 1 || a.memberB === 1)
    expect(found).toHaveLength(1)
  })

  it('特定id在memberB联盟中可手动查找', () => {
    ;(als as any).alliances.push(makeAlliance(5, 1))
    const found = (als as any).alliances.filter((a: PersonalAlliance) => a.memberA === 1 || a.memberB === 1)
    expect(found).toHaveLength(1)
  })

  it('过滤指定实体的联盟', () => {
    ;(als as any).alliances.push(makeAlliance(1, 2))
    ;(als as any).alliances.push(makeAlliance(2, 3))
    ;(als as any).alliances.push(makeAlliance(3, 4))
    const forId2 = (als as any).alliances.filter((a: PersonalAlliance) => a.memberA === 2 || a.memberB === 2)
    expect(forId2).toHaveLength(2)
  })

  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    expect(() => als.update(1, mockEM as any, 0)).not.toThrow()
  })
})
