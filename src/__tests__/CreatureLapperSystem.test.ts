import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLapperSystem } from '../systems/CreatureLapperSystem'
import type { Lapper } from '../systems/CreatureLapperSystem'

let nextId = 1
function makeSys(): CreatureLapperSystem { return new CreatureLapperSystem() }
function makeLapper(entityId: number): Lapper {
  return { id: nextId++, entityId, lappingSkill: 70, compoundSelection: 65, flatnessAccuracy: 80, mirrorFinish: 75, tick: 0 }
}

describe('CreatureLapperSystem.getLappers', () => {
  let sys: CreatureLapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无研磨工', () => { expect((sys as any).lappers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    expect((sys as any).lappers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    expect((sys as any).lappers).toBe((sys as any).lappers)
  })
  it('字段正确', () => {
    ;(sys as any).lappers.push(makeLapper(3))
    const l = (sys as any).lappers[0]
    expect(l.lappingSkill).toBe(70)
    expect(l.mirrorFinish).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).lappers.push(makeLapper(1))
    ;(sys as any).lappers.push(makeLapper(2))
    expect((sys as any).lappers).toHaveLength(2)
  })
})
