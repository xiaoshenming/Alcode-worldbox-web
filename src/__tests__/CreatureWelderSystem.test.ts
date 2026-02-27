import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWelderSystem } from '../systems/CreatureWelderSystem'
import type { Welder } from '../systems/CreatureWelderSystem'

let nextId = 1
function makeSys(): CreatureWelderSystem { return new CreatureWelderSystem() }
function makeWelder(entityId: number): Welder {
  return { id: nextId++, entityId, weldingSkill: 70, jointStrength: 65, heatPrecision: 80, metalBonding: 75, tick: 0 }
}

describe('CreatureWelderSystem.getWelders', () => {
  let sys: CreatureWelderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无焊工', () => { expect(sys.getWelders()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect(sys.getWelders()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).welders.push(makeWelder(1))
    expect(sys.getWelders()).toBe((sys as any).welders)
  })
  it('字段正确', () => {
    ;(sys as any).welders.push(makeWelder(2))
    const w = sys.getWelders()[0]
    expect(w.weldingSkill).toBe(70)
    expect(w.heatPrecision).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).welders.push(makeWelder(1))
    ;(sys as any).welders.push(makeWelder(2))
    expect(sys.getWelders()).toHaveLength(2)
  })
})
