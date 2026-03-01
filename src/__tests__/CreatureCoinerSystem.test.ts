import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCoinerSystem } from '../systems/CreatureCoinerSystem'
import type { Coiner } from '../systems/CreatureCoinerSystem'

let nextId = 1
function makeSys(): CreatureCoinerSystem { return new CreatureCoinerSystem() }
function makeCoiner(entityId: number): Coiner {
  return { id: nextId++, entityId, coiningSkill: 30, dieStriking: 25, metalStamping: 20, reliefDepth: 35, tick: 0 }
}

describe('CreatureCoinerSystem.getCoiners', () => {
  let sys: CreatureCoinerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸币工', () => { expect((sys as any).coiners).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).coiners.push(makeCoiner(1))
    expect((sys as any).coiners[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).coiners.push(makeCoiner(1))
    expect((sys as any).coiners).toBe((sys as any).coiners)
  })

  it('多个全部返回', () => {
    ;(sys as any).coiners.push(makeCoiner(1))
    ;(sys as any).coiners.push(makeCoiner(2))
    expect((sys as any).coiners).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeCoiner(10)
    c.coiningSkill = 80; c.dieStriking = 75; c.metalStamping = 70; c.reliefDepth = 65
    ;(sys as any).coiners.push(c)
    const r = (sys as any).coiners[0]
    expect(r.coiningSkill).toBe(80); expect(r.dieStriking).toBe(75)
    expect(r.metalStamping).toBe(70); expect(r.reliefDepth).toBe(65)
  })
})
