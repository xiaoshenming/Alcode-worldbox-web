import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAmbitionSystem } from '../systems/CreatureAmbitionSystem'
import type { CreatureAmbition, AmbitionType } from '../systems/CreatureAmbitionSystem'

// CreatureAmbitionSystem 测试:
// - getAmbition(id)      → 未注册返回 undefined，注入后返回抱负数据
// - getAmbitions()       → 返回内部 Map 引用
// - getAmbitionCount()   → 返回注册数量
// - getFulfilledCount()  → 返回已完成数量
// update() 依赖 EntityManager，不在此测试。

function makeCAS2(): CreatureAmbitionSystem {
  return new CreatureAmbitionSystem()
}

function makeAmbition(entityId: number, ambition: AmbitionType = 'become_leader', fulfilled = false): CreatureAmbition {
  return {
    entityId,
    ambition,
    progress: fulfilled ? 100 : 50,
    startedAt: 0,
    fulfilled,
    reward: 'Charisma +10',
  }
}

describe('CreatureAmbitionSystem.getAmbition', () => {
  let cas: CreatureAmbitionSystem

  beforeEach(() => { cas = makeCAS2() })

  it('未注册实体返回 undefined', () => {
    expect(cas.getAmbition(1)).toBeUndefined()
    expect(cas.getAmbition(999)).toBeUndefined()
  })

  it('注入抱负后可查询', () => {
    ;(cas as any).ambitions.set(1, makeAmbition(1, 'explore_unknown'))
    const amb = cas.getAmbition(1)
    expect(amb).toBeDefined()
    expect(amb!.ambition).toBe('explore_unknown')
  })

  it('不同实体抱负独立', () => {
    ;(cas as any).ambitions.set(1, makeAmbition(1, 'become_leader'))
    ;(cas as any).ambitions.set(2, makeAmbition(2, 'amass_wealth'))
    expect(cas.getAmbition(1)!.ambition).toBe('become_leader')
    expect(cas.getAmbition(2)!.ambition).toBe('amass_wealth')
    expect(cas.getAmbition(3)).toBeUndefined()
  })

  it('支持所有 6 种抱负类型', () => {
    const types: AmbitionType[] = ['become_leader', 'build_monument', 'explore_unknown', 'master_craft', 'defeat_rival', 'amass_wealth']
    types.forEach((t, i) => {
      ;(cas as any).ambitions.set(i + 1, makeAmbition(i + 1, t))
    })
    types.forEach((t, i) => {
      expect(cas.getAmbition(i + 1)!.ambition).toBe(t)
    })
  })
})

describe('CreatureAmbitionSystem.getAmbitionCount', () => {
  let cas: CreatureAmbitionSystem

  beforeEach(() => { cas = makeCAS2() })

  it('初始数量为 0', () => {
    expect(cas.getAmbitionCount()).toBe(0)
  })

  it('注入后数量正确', () => {
    ;(cas as any).ambitions.set(1, makeAmbition(1))
    ;(cas as any).ambitions.set(2, makeAmbition(2))
    expect(cas.getAmbitionCount()).toBe(2)
  })

  it('与 Map.size 一致', () => {
    ;(cas as any).ambitions.set(1, makeAmbition(1))
    ;(cas as any).ambitions.set(2, makeAmbition(2))
    ;(cas as any).ambitions.set(3, makeAmbition(3))
    expect(cas.getAmbitionCount()).toBe((cas as any).ambitions.size)
  })
})

describe('CreatureAmbitionSystem.getAmbitions', () => {
  let cas: CreatureAmbitionSystem

  beforeEach(() => { cas = makeCAS2() })

  it('返回内部 Map 引用', () => {
    expect(cas.getAmbitions()).toBe((cas as any).ambitions)
  })

  it('通过 Map 引用可以迭代', () => {
    ;(cas as any).ambitions.set(1, makeAmbition(1, 'defeat_rival'))
    ;(cas as any).ambitions.set(2, makeAmbition(2, 'master_craft'))
    const map = cas.getAmbitions()
    expect(map.size).toBe(2)
    expect(map.get(1)!.ambition).toBe('defeat_rival')
    expect(map.get(2)!.ambition).toBe('master_craft')
  })
})

describe('CreatureAmbitionSystem.getFulfilledCount', () => {
  let cas: CreatureAmbitionSystem

  beforeEach(() => { cas = makeCAS2() })

  it('初始完成数为 0', () => {
    expect(cas.getFulfilledCount()).toBe(0)
  })

  it('注入后完成数为 0（fulfilled 字段不影响计数器）', () => {
    // getFulfilledCount 读的是内部 fulfilledCount 计数器，不是扫描 map
    ;(cas as any).ambitions.set(1, makeAmbition(1, 'become_leader', true))
    expect(cas.getFulfilledCount()).toBe(0)  // 计数器仍为0
  })

  it('直接设置计数器后返回正确值', () => {
    ;(cas as any).fulfilledCount = 5
    expect(cas.getFulfilledCount()).toBe(5)
  })

  it('计数器累加', () => {
    ;(cas as any).fulfilledCount = 3
    expect(cas.getFulfilledCount()).toBe(3)
    ;(cas as any).fulfilledCount = 7
    expect(cas.getFulfilledCount()).toBe(7)
  })
})
