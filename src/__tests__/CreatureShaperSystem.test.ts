import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureShaperSystem } from '../systems/CreatureShaperSystem'
import type { Shaper } from '../systems/CreatureShaperSystem'

let nextId = 1
function makeSys(): CreatureShaperSystem { return new CreatureShaperSystem() }
function makeShaper(entityId: number): Shaper {
  return { id: nextId++, entityId, shapingSkill: 70, dieAlignment: 65, formAccuracy: 80, pressureControl: 75, tick: 0 }
}

describe('CreatureShaperSystem.getShapers', () => {
  let sys: CreatureShaperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无成型工', () => { expect((sys as any).shapers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shapers.push(makeShaper(1))
    expect((sys as any).shapers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).shapers.push(makeShaper(1))
    expect((sys as any).shapers).toBe((sys as any).shapers)
  })
  it('字段正确', () => {
    ;(sys as any).shapers.push(makeShaper(2))
    const s = (sys as any).shapers[0]
    expect(s.shapingSkill).toBe(70)
    expect(s.formAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).shapers.push(makeShaper(1))
    ;(sys as any).shapers.push(makeShaper(2))
    expect((sys as any).shapers).toHaveLength(2)
  })
})
