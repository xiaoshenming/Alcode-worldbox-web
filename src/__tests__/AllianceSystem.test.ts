import { describe, it, expect, beforeEach } from 'vitest'
import { AllianceSystem } from '../systems/AllianceSystem'
import type { Alliance } from '../systems/AllianceSystem'

function makeAS(): AllianceSystem {
  return new AllianceSystem()
}

function makeAlliance(id: number, members: number[], overrides: Partial<Alliance> = {}): Alliance {
  return {
    id,
    name: `Alliance-${id}`,
    members: new Set(members),
    createdTick: 0,
    isFederation: false,
    federationTick: 0,
    ...overrides,
  }
}

describe('AllianceSystem', () => {
  let as: AllianceSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('初始状态alliances为空', () => {
    expect((as as any).alliances).toHaveLength(0)
  })

  it('注入一个联盟后内部数组包含数据', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    expect((as as any).alliances).toHaveLength(1)
    expect((as as any).alliances[0].id).toBe(1)
  })

  it('多个联盟都能注入', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    ;(as as any).alliances.push(makeAlliance(2, [30, 40]))
    ;(as as any).alliances.push(makeAlliance(3, [50, 60, 70]))
    expect((as as any).alliances).toHaveLength(3)
  })

  it('alliances是数组类型', () => {
    expect(Array.isArray((as as any).alliances)).toBe(true)
  })

  it('联盟属性字段正确', () => {
    const alliance = makeAlliance(5, [1, 2], { isFederation: true, federationTick: 500 })
    ;(as as any).alliances.push(alliance)
    const result = (as as any).alliances[0]
    expect(result.isFederation).toBe(true)
    expect(result.federationTick).toBe(500)
    expect(result.members.has(1)).toBe(true)
    expect(result.members.has(2)).toBe(true)
  })

  it('civId不在任何联盟时内部alliances中无包含', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    const found = (as as any).alliances.find((a: Alliance) => a.members.has(99))
    expect(found).toBeUndefined()
  })

  it('多个联盟时civId在正确的联盟中', () => {
    const a1 = makeAlliance(1, [10, 20])
    const a2 = makeAlliance(2, [30, 40])
    ;(as as any).alliances.push(a1)
    ;(as as any).alliances.push(a2)
    const found10 = (as as any).alliances.find((a: Alliance) => a.members.has(10))
    const found30 = (as as any).alliances.find((a: Alliance) => a.members.has(30))
    expect(found10?.id).toBe(1)
    expect(found30?.id).toBe(2)
  })

  it('刚成立的联盟isFederation为false', () => {
    ;(as as any).alliances.push(makeAlliance(1, [7, 8]))
    const result = (as as any).alliances[0]
    expect(result.isFederation).toBe(false)
  })

  it('update不崩溃（空civManager）', () => {
    const mockCM = { civilizations: new Map() }
    const mockEM = { getComponent: () => undefined, getEntitiesWithComponents: () => [] }
    const mockWorld = {}
    const mockParticles = {}
    expect(() => as.update(mockCM as any, mockEM as any, mockWorld as any, mockParticles as any, 0)).not.toThrow()
  })
})
