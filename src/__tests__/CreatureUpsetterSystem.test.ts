import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureUpsetterSystem } from '../systems/CreatureUpsetterSystem'
import type { Upsetter } from '../systems/CreatureUpsetterSystem'

let nextId = 1
function makeSys(): CreatureUpsetterSystem { return new CreatureUpsetterSystem() }
function makeUpsetter(entityId: number): Upsetter {
  return { id: nextId++, entityId, upsettingSkill: 70, compressionForce: 65, stockThickening: 80, headForming: 75, tick: 0 }
}

describe('CreatureUpsetterSystem.getUpsetters', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镦粗工', () => { expect(sys.getUpsetters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    expect(sys.getUpsetters()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    expect(sys.getUpsetters()).toBe((sys as any).upsetters)
  })
  it('字段正确', () => {
    ;(sys as any).upsetters.push(makeUpsetter(2))
    const u = sys.getUpsetters()[0]
    expect(u.upsettingSkill).toBe(70)
    expect(u.stockThickening).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    ;(sys as any).upsetters.push(makeUpsetter(2))
    expect(sys.getUpsetters()).toHaveLength(2)
  })
})
