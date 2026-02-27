import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAppliqueMakersSystem } from '../systems/CreatureAppliqueMakersSystem'
import type { AppliqueMaker, AppliqueType } from '../systems/CreatureAppliqueMakersSystem'

// CreatureAppliqueMakersSystem 测试:
// - getMakers() → 返回内部数组引用

let nextId = 1

function makeAppliqSys(): CreatureAppliqueMakersSystem {
  return new CreatureAppliqueMakersSystem()
}

function makeMaker(entityId: number, appliqueType: AppliqueType = 'raw_edge'): AppliqueMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    piecesMade: 5,
    appliqueType,
    cutPrecision: 34,
    reputation: 33,
    tick: 0,
  }
}

describe('CreatureAppliqueMakersSystem.getMakers', () => {
  let sys: CreatureAppliqueMakersSystem

  beforeEach(() => { sys = makeAppliqSys(); nextId = 1 })

  it('初始无匠人', () => {
    expect(sys.getMakers()).toHaveLength(0)
  })

  it('注入匠人后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle_turn'))
    expect(sys.getMakers()).toHaveLength(1)
    expect(sys.getMakers()[0].appliqueType).toBe('needle_turn')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种贴布类型', () => {
    const types: AppliqueType[] = ['raw_edge', 'needle_turn', 'reverse', 'shadow']
    types.forEach((t, i) => {
      ;(sys as any).makers.push(makeMaker(i + 1, t))
    })
    const all = sys.getMakers()
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].appliqueType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'shadow')
    m.skill = 85
    m.piecesMade = 15
    m.cutPrecision = 74
    m.reputation = 76
    ;(sys as any).makers.push(m)
    const result = sys.getMakers()[0]
    expect(result.skill).toBe(85)
    expect(result.piecesMade).toBe(15)
    expect(result.cutPrecision).toBe(74)
    expect(result.reputation).toBe(76)
  })
})
