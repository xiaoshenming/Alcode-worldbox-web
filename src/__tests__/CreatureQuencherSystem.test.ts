import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureQuencherSystem } from '../systems/CreatureQuencherSystem'
import type { Quencher } from '../systems/CreatureQuencherSystem'

let nextId = 1
function makeSys(): CreatureQuencherSystem { return new CreatureQuencherSystem() }
function makeQuencher(entityId: number): Quencher {
  return { id: nextId++, entityId, quenchingSkill: 70, mediumSelection: 65, timingControl: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureQuencherSystem.getQuenchers', () => {
  let sys: CreatureQuencherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无淬火工', () => { expect((sys as any).quenchers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).quenchers.push(makeQuencher(1))
    expect((sys as any).quenchers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).quenchers.push(makeQuencher(1))
    expect((sys as any).quenchers).toBe((sys as any).quenchers)
  })
  it('字段正确', () => {
    ;(sys as any).quenchers.push(makeQuencher(2))
    const q = (sys as any).quenchers[0]
    expect(q.quenchingSkill).toBe(70)
    expect(q.timingControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).quenchers.push(makeQuencher(1))
    ;(sys as any).quenchers.push(makeQuencher(2))
    expect((sys as any).quenchers).toHaveLength(2)
  })
})
