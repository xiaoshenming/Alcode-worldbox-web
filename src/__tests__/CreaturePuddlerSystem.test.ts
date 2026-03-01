import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePuddlerSystem } from '../systems/CreaturePuddlerSystem'
import type { Puddler } from '../systems/CreaturePuddlerSystem'

let nextId = 1
function makeSys(): CreaturePuddlerSystem { return new CreaturePuddlerSystem() }
function makePuddler(entityId: number): Puddler {
  return { id: nextId++, entityId, puddlingSkill: 70, stirringTechnique: 65, carbonControl: 75, ironPurity: 80, tick: 0 }
}

describe('CreaturePuddlerSystem.getPuddlers', () => {
  let sys: CreaturePuddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无精炼工', () => { expect((sys as any).puddlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    expect((sys as any).puddlers).toBe((sys as any).puddlers)
  })
  it('字段正确', () => {
    ;(sys as any).puddlers.push(makePuddler(2))
    const p = (sys as any).puddlers[0]
    expect(p.puddlingSkill).toBe(70)
    expect(p.ironPurity).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).puddlers.push(makePuddler(1))
    ;(sys as any).puddlers.push(makePuddler(2))
    expect((sys as any).puddlers).toHaveLength(2)
  })
})
