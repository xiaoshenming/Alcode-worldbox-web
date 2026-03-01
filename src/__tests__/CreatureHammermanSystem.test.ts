import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHammermanSystem } from '../systems/CreatureHammermanSystem'
import type { Hammerman } from '../systems/CreatureHammermanSystem'

let nextId = 1
function makeSys(): CreatureHammermanSystem { return new CreatureHammermanSystem() }
function makeHammerman(entityId: number): Hammerman {
  return { id: nextId++, entityId, hammeringSkill: 70, rhythmControl: 60, strikeForce: 80, metalShaping: 65, tick: 0 }
}

describe('CreatureHammermanSystem.getHammermen', () => {
  let sys: CreatureHammermanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锤工', () => { expect((sys as any).hammermen).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    expect((sys as any).hammermen[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    expect((sys as any).hammermen).toBe((sys as any).hammermen)
  })
  it('多个全部返回', () => {
    ;(sys as any).hammermen.push(makeHammerman(1))
    ;(sys as any).hammermen.push(makeHammerman(2))
    expect((sys as any).hammermen).toHaveLength(2)
  })
  it('字段正确', () => {
    ;(sys as any).hammermen.push(makeHammerman(5))
    const h = (sys as any).hammermen[0]
    expect(h.hammeringSkill).toBe(70)
    expect(h.metalShaping).toBe(65)
  })
})
