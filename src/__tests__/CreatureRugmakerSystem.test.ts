import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRugmakerSystem } from '../systems/CreatureRugmakerSystem'
import type { Rugmaker, RugPattern } from '../systems/CreatureRugmakerSystem'

let nextId = 1
function makeSys(): CreatureRugmakerSystem { return new CreatureRugmakerSystem() }
function makeRugmaker(entityId: number, pattern: RugPattern = 'geometric'): Rugmaker {
  return { id: nextId++, entityId, skill: 70, rugsMade: 10, pattern, knotDensity: 65, colorCount: 5, tick: 0 }
}

describe('CreatureRugmakerSystem.getRugmakers', () => {
  let sys: CreatureRugmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地毯工', () => { expect(sys.getRugmakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1, 'tribal'))
    expect(sys.getRugmakers()[0].pattern).toBe('tribal')
  })
  it('返回内部引用', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1))
    expect(sys.getRugmakers()).toBe((sys as any).rugmakers)
  })
  it('支持所有4种图案', () => {
    const patterns: RugPattern[] = ['geometric', 'floral', 'medallion', 'tribal']
    patterns.forEach((p, i) => { ;(sys as any).rugmakers.push(makeRugmaker(i + 1, p)) })
    const all = sys.getRugmakers()
    patterns.forEach((p, i) => { expect(all[i].pattern).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).rugmakers.push(makeRugmaker(1))
    ;(sys as any).rugmakers.push(makeRugmaker(2))
    expect(sys.getRugmakers()).toHaveLength(2)
  })
})
