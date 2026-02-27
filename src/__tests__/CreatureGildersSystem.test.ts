import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGildersSystem } from '../systems/CreatureGildersSystem'
import type { Gilder, GildingMethod } from '../systems/CreatureGildersSystem'

let nextId = 1
function makeSys(): CreatureGildersSystem { return new CreatureGildersSystem() }
function makeMaker(entityId: number, gildingMethod: GildingMethod = 'water'): Gilder {
  return { id: nextId++, entityId, skill: 40, piecesGilded: 15, gildingMethod, leafThinness: 70, reputation: 60, tick: 0 }
}

describe('CreatureGildersSystem.getMakers', () => {
  let sys: CreatureGildersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镀金工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'fire'))
    expect(sys.getMakers()[0].gildingMethod).toBe('fire')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有 4 种镀金方法', () => {
    const methods: GildingMethod[] = ['water', 'oil', 'fire', 'mercury']
    methods.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = sys.getMakers()
    methods.forEach((m, i) => { expect(all[i].gildingMethod).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
