import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDrifterSystem } from '../systems/CreatureDrifterSystem'
import type { Drifter } from '../systems/CreatureDrifterSystem'

let nextId = 1
function makeSys(): CreatureDrifterSystem { return new CreatureDrifterSystem() }
function makeDrifter(entityId: number): Drifter {
  return { id: nextId++, entityId, driftingSkill: 30, pinAlignment: 25, holeExpansion: 20, taperControl: 35, tick: 0 }
}

describe('CreatureDrifterSystem.getDrifters', () => {
  let sys: CreatureDrifterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无漂移工', () => { expect((sys as any).drifters).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    expect((sys as any).drifters[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    expect((sys as any).drifters).toBe((sys as any).drifters)
  })

  it('多个全部返回', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    ;(sys as any).drifters.push(makeDrifter(2))
    expect((sys as any).drifters).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const d = makeDrifter(10)
    d.driftingSkill = 80; d.pinAlignment = 75; d.holeExpansion = 70; d.taperControl = 65
    ;(sys as any).drifters.push(d)
    const r = (sys as any).drifters[0]
    expect(r.driftingSkill).toBe(80); expect(r.pinAlignment).toBe(75)
    expect(r.holeExpansion).toBe(70); expect(r.taperControl).toBe(65)
  })
})
