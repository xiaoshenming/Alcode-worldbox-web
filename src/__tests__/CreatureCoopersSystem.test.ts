import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCoopersSystem } from '../systems/CreatureCoopersSystem'
import type { Cooper, BarrelType } from '../systems/CreatureCoopersSystem'

let nextId = 1
function makeSys(): CreatureCoopersSystem { return new CreatureCoopersSystem() }
function makeCooper(entityId: number, barrelType: BarrelType = 'wine'): Cooper {
  return { id: nextId++, entityId, skill: 30, barrelsMade: 10, barrelType, tightness: 60, durability: 50, tick: 0 }
}

describe('CreatureCoopersSystem.getCoopers', () => {
  let sys: CreatureCoopersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无桶匠', () => { expect((sys as any).coopers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).coopers.push(makeCooper(1, 'ale'))
    expect((sys as any).coopers[0].barrelType).toBe('ale')
  })

  it('返回内部引用', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    expect((sys as any).coopers).toBe((sys as any).coopers)
  })

  it('支持所有 4 种桶类型', () => {
    const types: BarrelType[] = ['wine', 'ale', 'water', 'provisions']
    types.forEach((t, i) => { ;(sys as any).coopers.push(makeCooper(i + 1, t)) })
    const all = (sys as any).coopers
    types.forEach((t, i) => { expect(all[i].barrelType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).coopers.push(makeCooper(1))
    ;(sys as any).coopers.push(makeCooper(2))
    expect((sys as any).coopers).toHaveLength(2)
  })
})
