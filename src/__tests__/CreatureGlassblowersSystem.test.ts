import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlassblowersSystem } from '../systems/CreatureGlassblowersSystem'
import type { Glassblower, GlassType } from '../systems/CreatureGlassblowersSystem'

let nextId = 1
function makeSys(): CreatureGlassblowersSystem { return new CreatureGlassblowersSystem() }
function makeMaker(entityId: number, glassType: GlassType = 'clear'): Glassblower {
  return { id: nextId++, entityId, skill: 40, piecesMade: 20, glassType, lungCapacity: 80, reputation: 60, tick: 0 }
}

describe('CreatureGlassblowersSystem.getMakers', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无吹玻璃工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'stained'))
    expect((sys as any).makers[0].glassType).toBe('stained')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种玻璃类型', () => {
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].glassType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
