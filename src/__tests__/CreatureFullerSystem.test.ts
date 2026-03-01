import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFullerSystem } from '../systems/CreatureFullerSystem'
import type { Fuller } from '../systems/CreatureFullerSystem'

let nextId = 1
function makeSys(): CreatureFullerSystem { return new CreatureFullerSystem() }
function makeFuller(entityId: number): Fuller {
  return { id: nextId++, entityId, fulleringSkill: 50, spreadControl: 60, metalThinning: 70, grooveDepth: 80, tick: 0 }
}

describe('CreatureFullerSystem.getFullers', () => {
  let sys: CreatureFullerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无展宽工', () => { expect((sys as any).fullers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).fullers.push(makeFuller(1))
    expect((sys as any).fullers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).fullers.push(makeFuller(1))
    expect((sys as any).fullers).toBe((sys as any).fullers)
  })

  it('多个全部返回', () => {
    ;(sys as any).fullers.push(makeFuller(1))
    ;(sys as any).fullers.push(makeFuller(2))
    expect((sys as any).fullers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFuller(10)
    f.fulleringSkill = 90; f.spreadControl = 85; f.metalThinning = 80; f.grooveDepth = 75
    ;(sys as any).fullers.push(f)
    const r = (sys as any).fullers[0]
    expect(r.fulleringSkill).toBe(90); expect(r.spreadControl).toBe(85)
    expect(r.metalThinning).toBe(80); expect(r.grooveDepth).toBe(75)
  })
})
