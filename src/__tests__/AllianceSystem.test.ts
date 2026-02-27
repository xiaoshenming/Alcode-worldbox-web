import { describe, it, expect, beforeEach } from 'vitest'
import { AllianceSystem } from '../systems/AllianceSystem'
import type { Alliance } from '../systems/AllianceSystem'

// AllianceSystem 的纯查询方法测试：
// - getAlliances()          → 返回内部联盟数组
// - getAllianceForCiv(id)   → 返回含有该 civId 的联盟或 null
// 通过直接操作私有字段（as any）注入测试数据。

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

// ── getAlliances ───────────────────────────────────────────────────────────────

describe('AllianceSystem.getAlliances', () => {
  let as: AllianceSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('初始状态返回空数组', () => {
    expect(as.getAlliances()).toHaveLength(0)
  })

  it('注入一个联盟后可查询到', () => {
    const alliance = makeAlliance(1, [10, 20])
    ;(as as any).alliances.push(alliance)
    expect(as.getAlliances()).toHaveLength(1)
    expect(as.getAlliances()[0].id).toBe(1)
  })

  it('多个联盟都能查询到', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    ;(as as any).alliances.push(makeAlliance(2, [30, 40]))
    ;(as as any).alliances.push(makeAlliance(3, [50, 60, 70]))
    expect(as.getAlliances()).toHaveLength(3)
  })

  it('返回数组类型', () => {
    expect(Array.isArray(as.getAlliances())).toBe(true)
  })

  it('联盟属性字段正确', () => {
    const alliance = makeAlliance(5, [1, 2], { isFederation: true, federationTick: 500 })
    ;(as as any).alliances.push(alliance)
    const result = as.getAlliances()[0]
    expect(result.isFederation).toBe(true)
    expect(result.federationTick).toBe(500)
    expect(result.members.has(1)).toBe(true)
    expect(result.members.has(2)).toBe(true)
  })
})

// ── getAllianceForCiv ──────────────────────────────────────────────────────────

describe('AllianceSystem.getAllianceForCiv', () => {
  let as: AllianceSystem

  beforeEach(() => {
    as = makeAS()
  })

  it('无联盟时返回 null', () => {
    expect(as.getAllianceForCiv(1)).toBeNull()
  })

  it('civId 在联盟中时返回对应联盟', () => {
    const alliance = makeAlliance(1, [10, 20, 30])
    ;(as as any).alliances.push(alliance)
    expect(as.getAllianceForCiv(10)).toBe(alliance)
    expect(as.getAllianceForCiv(20)).toBe(alliance)
    expect(as.getAllianceForCiv(30)).toBe(alliance)
  })

  it('civId 不在任何联盟时返回 null', () => {
    ;(as as any).alliances.push(makeAlliance(1, [10, 20]))
    expect(as.getAllianceForCiv(99)).toBeNull()
  })

  it('多个联盟时返回正确的联盟', () => {
    const a1 = makeAlliance(1, [10, 20])
    const a2 = makeAlliance(2, [30, 40])
    ;(as as any).alliances.push(a1)
    ;(as as any).alliances.push(a2)
    expect(as.getAllianceForCiv(10)).toBe(a1)
    expect(as.getAllianceForCiv(30)).toBe(a2)
    expect(as.getAllianceForCiv(40)).toBe(a2)
  })

  it('civId 在第一个匹配到即返回（find 语义）', () => {
    // 即使 Set.has 是 O(1)，多联盟中只要有一个包含 civId 就返回
    ;(as as any).alliances.push(makeAlliance(1, [100, 200]))
    ;(as as any).alliances.push(makeAlliance(2, [300, 400]))
    expect(as.getAllianceForCiv(100)).not.toBeNull()
    expect(as.getAllianceForCiv(400)).not.toBeNull()
  })

  it('刚成立的联盟 isFederation 为 false', () => {
    ;(as as any).alliances.push(makeAlliance(1, [7, 8]))
    const result = as.getAllianceForCiv(7)
    expect(result).not.toBeNull()
    expect(result!.isFederation).toBe(false)
  })
})
