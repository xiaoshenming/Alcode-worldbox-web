import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwageBlockerSystem } from '../systems/CreatureSwageBlockerSystem'
import type { SwageBlocker } from '../systems/CreatureSwageBlockerSystem'

let nextId = 1
function makeSys(): CreatureSwageBlockerSystem { return new CreatureSwageBlockerSystem() }
function makeWorker(entityId: number): SwageBlocker {
  return { id: nextId++, entityId, swageBlockSkill: 70, cavitySelection: 65, metalForming: 80, shapeAccuracy: 75, tick: 0 }
}

describe('CreatureSwageBlockerSystem.getSwageBlockers', () => {
  let sys: CreatureSwageBlockerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锻模工', () => { expect((sys as any).swageBlockers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    expect((sys as any).swageBlockers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    expect((sys as any).swageBlockers).toBe((sys as any).swageBlockers)
  })
  it('字段正确', () => {
    ;(sys as any).swageBlockers.push(makeWorker(2))
    const w = (sys as any).swageBlockers[0]
    expect(w.swageBlockSkill).toBe(70)
    expect(w.metalForming).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).swageBlockers.push(makeWorker(1))
    ;(sys as any).swageBlockers.push(makeWorker(2))
    expect((sys as any).swageBlockers).toHaveLength(2)
  })
})
