import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureConstellationSystem } from '../systems/CreatureConstellationSystem'
import type { Constellation, ConstellationType } from '../systems/CreatureConstellationSystem'

let nextId = 1
function makeSys(): CreatureConstellationSystem { return new CreatureConstellationSystem() }
function makeConstellation(discoveredBy: number, type: ConstellationType = 'warrior'): Constellation {
  return { id: nextId++, name: `Star${nextId}`, type, discoveredBy, visibility: 80, bonusStrength: 10, season: 0, tick: 0 }
}

describe('CreatureConstellationSystem.getConstellations', () => {
  let sys: CreatureConstellationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无星座', () => { expect(sys.getConstellations()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).constellations.push(makeConstellation(1, 'harvest'))
    expect(sys.getConstellations()[0].type).toBe('harvest')
  })

  it('返回只读引用', () => {
    ;(sys as any).constellations.push(makeConstellation(1))
    expect(sys.getConstellations()).toBe((sys as any).constellations)
  })

  it('支持所有 5 种星座类型', () => {
    const types: ConstellationType[] = ['warrior', 'harvest', 'voyage', 'wisdom', 'fortune']
    types.forEach((t, i) => { ;(sys as any).constellations.push(makeConstellation(i + 1, t)) })
    const all = sys.getConstellations()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).constellations.push(makeConstellation(1))
    ;(sys as any).constellations.push(makeConstellation(2))
    expect(sys.getConstellations()).toHaveLength(2)
  })
})
