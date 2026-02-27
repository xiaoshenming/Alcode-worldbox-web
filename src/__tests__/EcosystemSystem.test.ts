import { describe, it, expect, beforeEach } from 'vitest'
import { EcosystemSystem } from '../systems/EcosystemSystem'
import type { WildlifeType } from '../systems/EcosystemSystem'

// EcosystemSystem 的可测公开方法：
// - getEcosystemHealth() → 返回内部 ecosystemHealth 数值（初始 50）
// - getWildlifeCounts()  → 返回 wildlifeCounts 的快照 Map
// 通过直接操作私有字段（as any）注入测试数据，不调用复杂 update。

function makeES(): EcosystemSystem {
  return new EcosystemSystem()
}

// ── getEcosystemHealth ────────────────────────────────────────────────────────

describe('EcosystemSystem.getEcosystemHealth', () => {
  let es: EcosystemSystem

  beforeEach(() => {
    es = makeES()
  })

  it('初始值为 50', () => {
    expect(es.getEcosystemHealth()).toBe(50)
  })

  it('注入不同值后返回对应数值', () => {
    ;(es as any).ecosystemHealth = 75
    expect(es.getEcosystemHealth()).toBe(75)
  })

  it('注入最大值 100 时正确返回', () => {
    ;(es as any).ecosystemHealth = 100
    expect(es.getEcosystemHealth()).toBe(100)
  })

  it('注入最小值 0 时正确返回', () => {
    ;(es as any).ecosystemHealth = 0
    expect(es.getEcosystemHealth()).toBe(0)
  })

  it('返回值是数字类型', () => {
    expect(typeof es.getEcosystemHealth()).toBe('number')
  })
})

// ── getWildlifeCounts ─────────────────────────────────────────────────────────

describe('EcosystemSystem.getWildlifeCounts', () => {
  let es: EcosystemSystem

  beforeEach(() => {
    es = makeES()
  })

  it('初始时返回空 Map', () => {
    expect(es.getWildlifeCounts().size).toBe(0)
  })

  it('注入野生动物计数后可查询到', () => {
    ;(es as any).wildlifeCounts.set('deer', 5)
    ;(es as any).wildlifeCounts.set('bear', 2)
    const counts = es.getWildlifeCounts()
    expect(counts.get('deer')).toBe(5)
    expect(counts.get('bear')).toBe(2)
  })

  it('返回值是 Map 类型', () => {
    expect(es.getWildlifeCounts() instanceof Map).toBe(true)
  })

  it('返回的是快照（修改不影响内部状态）', () => {
    ;(es as any).wildlifeCounts.set('fox', 3)
    const snapshot = es.getWildlifeCounts()
    snapshot.set('fox', 999)
    // 内部数据不受影响
    expect(es.getWildlifeCounts().get('fox')).toBe(3)
  })

  it('所有野生动物类型都能存储', () => {
    const types: WildlifeType[] = ['deer', 'bear', 'fish', 'eagle', 'snake', 'rabbit', 'boar', 'fox']
    types.forEach((type, i) => {
      ;(es as any).wildlifeCounts.set(type, i + 1)
    })
    const counts = es.getWildlifeCounts()
    types.forEach((type, i) => {
      expect(counts.get(type)).toBe(i + 1)
    })
    expect(counts.size).toBe(8)
  })

  it('清空计数后返回空 Map', () => {
    ;(es as any).wildlifeCounts.set('deer', 5)
    ;(es as any).wildlifeCounts.clear()
    expect(es.getWildlifeCounts().size).toBe(0)
  })
})

// ── 构造函数 ruleMap ──────────────────────────────────────────────────────────

describe('EcosystemSystem constructor', () => {
  it('构造后 ruleMap 包含所有 8 种野生动物', () => {
    const es = makeES()
    const ruleMap = (es as any).ruleMap as Map<string, unknown>
    const expectedSpecies: WildlifeType[] = ['deer', 'bear', 'fish', 'eagle', 'snake', 'rabbit', 'boar', 'fox']
    for (const species of expectedSpecies) {
      expect(ruleMap.has(species)).toBe(true)
    }
    expect(ruleMap.size).toBe(8)
  })
})
