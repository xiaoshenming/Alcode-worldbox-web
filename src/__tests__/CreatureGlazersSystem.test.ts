import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGlazersSystem } from '../systems/CreatureGlazersSystem'
import type { Glazer, GlassType } from '../systems/CreatureGlazersSystem'

let nextId = 1
function makeSys(): CreatureGlazersSystem { return new CreatureGlazersSystem() }
function makeGlazer(entityId: number, glassType: GlassType = 'clear'): Glazer {
  return { id: nextId++, entityId, skill: 40, panesInstalled: 30, glassType, clarity: 80, artistry: 70, tick: 0 }
}

describe('CreatureGlazersSystem.getGlazers', () => {
  let sys: CreatureGlazersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无玻璃工', () => { expect(sys.getGlazers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).glazers.push(makeGlazer(1, 'leaded'))
    expect(sys.getGlazers()[0].glassType).toBe('leaded')
  })
  it('返回内部引用', () => {
    ;(sys as any).glazers.push(makeGlazer(1))
    expect(sys.getGlazers()).toBe((sys as any).glazers)
  })
  it('支持所有 4 种玻璃类型', () => {
    const types: GlassType[] = ['clear', 'colored', 'stained', 'leaded']
    types.forEach((t, i) => { ;(sys as any).glazers.push(makeGlazer(i + 1, t)) })
    const all = sys.getGlazers()
    types.forEach((t, i) => { expect(all[i].glassType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).glazers.push(makeGlazer(1))
    ;(sys as any).glazers.push(makeGlazer(2))
    expect(sys.getGlazers()).toHaveLength(2)
  })
})
