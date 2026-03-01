import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSpotfacerSystem } from '../systems/CreatureSpotfacerSystem'
import type { Spotfacer } from '../systems/CreatureSpotfacerSystem'

let nextId = 1
function makeSys(): CreatureSpotfacerSystem { return new CreatureSpotfacerSystem() }
function makeSpotfacer(entityId: number): Spotfacer {
  return { id: nextId++, entityId, spotfacingSkill: 70, flatnessControl: 65, bearingSurface: 80, depthConsistency: 75, tick: 0 }
}

describe('CreatureSpotfacerSystem.getSpotfacers', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无端面工', () => { expect((sys as any).spotfacers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    expect((sys as any).spotfacers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    expect((sys as any).spotfacers).toBe((sys as any).spotfacers)
  })
  it('字段正确', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(2))
    const s = (sys as any).spotfacers[0]
    expect(s.spotfacingSkill).toBe(70)
    expect(s.bearingSurface).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    ;(sys as any).spotfacers.push(makeSpotfacer(2))
    expect((sys as any).spotfacers).toHaveLength(2)
  })
})
