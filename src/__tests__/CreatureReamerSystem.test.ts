import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureReamerSystem } from '../systems/CreatureReamerSystem'
import type { Reamer } from '../systems/CreatureReamerSystem'

let nextId = 1
function makeSys(): CreatureReamerSystem { return new CreatureReamerSystem() }
function makeReamer(entityId: number): Reamer {
  return { id: nextId++, entityId, reamingSkill: 70, holePrecision: 65, surfaceFinish: 80, dimensionalTolerance: 75, tick: 0 }
}

describe('CreatureReamerSystem.getReamers', () => {
  let sys: CreatureReamerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铰孔工', () => { expect(sys.getReamers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    expect(sys.getReamers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    expect(sys.getReamers()).toBe((sys as any).reamers)
  })
  it('字段正确', () => {
    ;(sys as any).reamers.push(makeReamer(2))
    const r = sys.getReamers()[0]
    expect(r.reamingSkill).toBe(70)
    expect(r.surfaceFinish).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).reamers.push(makeReamer(1))
    ;(sys as any).reamers.push(makeReamer(2))
    expect(sys.getReamers()).toHaveLength(2)
  })
})
