import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFerruleMakersSystem } from '../systems/CreatureFerruleMakersSystem'
import type { FerruleMaker, FerruleType } from '../systems/CreatureFerruleMakersSystem'

let nextId = 1
function makeSys(): CreatureFerruleMakersSystem { return new CreatureFerruleMakersSystem() }
function makeMaker(entityId: number, ferruleType: FerruleType = 'staff'): FerruleMaker {
  return { id: nextId++, entityId, skill: 40, ferrulesMade: 10, ferruleType, fitPrecision: 70, reputation: 60, tick: 0 }
}

describe('CreatureFerruleMakersSystem.getMakers', () => {
  let sys: CreatureFerruleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无箍工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tool'))
    expect(sys.getMakers()[0].ferruleType).toBe('tool')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种箍类型', () => {
    const types: FerruleType[] = ['staff', 'tool', 'umbrella', 'furniture']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].ferruleType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
