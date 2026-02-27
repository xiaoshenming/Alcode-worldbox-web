import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGrudgeSystem } from '../systems/CreatureGrudgeSystem'
import type { Grudge, GrudgeReason } from '../systems/CreatureGrudgeSystem'

let nextId = 1
function makeSys(): CreatureGrudgeSystem { return new CreatureGrudgeSystem() }
function makeGrudge(holderId: number, targetId: number, reason: GrudgeReason = 'attacked'): Grudge {
  return { id: nextId++, holderId, targetId, reason, intensity: 50, tick: 0 }
}

describe('CreatureGrudgeSystem.getGrudges', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无积怨', () => { expect(sys.getGrudges()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2, 'betrayal'))
    expect(sys.getGrudges()[0].reason).toBe('betrayal')
  })
  it('返回内部引用', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    expect(sys.getGrudges()).toBe((sys as any).grudges)
  })
  it('支持所有 6 种积怨原因', () => {
    const reasons: GrudgeReason[] = ['attacked', 'territory', 'theft', 'betrayal', 'insult', 'family_harm']
    reasons.forEach((r, i) => { ;(sys as any).grudges.push(makeGrudge(i + 1, i + 10, r)) })
    const all = sys.getGrudges()
    reasons.forEach((r, i) => { expect(all[i].reason).toBe(r) })
  })
})

describe('CreatureGrudgeSystem.getGrudgesFor', () => {
  let sys: CreatureGrudgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    expect(sys.getGrudgesFor(999)).toHaveLength(0)
  })
  it('过滤特定持grudge者', () => {
    ;(sys as any).grudges.push(makeGrudge(1, 2))
    ;(sys as any).grudges.push(makeGrudge(1, 3))
    ;(sys as any).grudges.push(makeGrudge(2, 3))
    const result = sys.getGrudgesFor(1)
    expect(result).toHaveLength(2)
    result.forEach(g => expect(g.holderId).toBe(1))
  })
})
