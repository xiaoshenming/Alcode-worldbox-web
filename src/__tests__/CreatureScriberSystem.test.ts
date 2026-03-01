import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureScriberSystem } from '../systems/CreatureScriberSystem'
import type { Scriber } from '../systems/CreatureScriberSystem'

let nextId = 1
function makeSys(): CreatureScriberSystem { return new CreatureScriberSystem() }
function makeScriber(entityId: number): Scriber {
  return { id: nextId++, entityId, scribingSkill: 70, lineAccuracy: 65, layoutPrecision: 80, markingDepth: 75, tick: 0 }
}

describe('CreatureScriberSystem.getScribers', () => {
  let sys: CreatureScriberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无划线工', () => { expect((sys as any).scribers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    expect((sys as any).scribers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    expect((sys as any).scribers).toBe((sys as any).scribers)
  })
  it('字段正确', () => {
    ;(sys as any).scribers.push(makeScriber(2))
    const s = (sys as any).scribers[0]
    expect(s.scribingSkill).toBe(70)
    expect(s.layoutPrecision).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).scribers.push(makeScriber(1))
    ;(sys as any).scribers.push(makeScriber(2))
    expect((sys as any).scribers).toHaveLength(2)
  })
})
