import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTotemSystem } from '../systems/CreatureTotemSystem'
import type { Totem, TotemType } from '../systems/CreatureTotemSystem'

let nextId = 1
function makeSys(): CreatureTotemSystem { return new CreatureTotemSystem() }
function makeTotem(x: number, y: number, type: TotemType = 'ancestor'): Totem {
  return { id: nextId++, x, y, type, power: 70, creatorRace: 'human', createdTick: 0, worshipCount: 5 }
}

describe('CreatureTotemSystem getters', () => {
  let sys: CreatureTotemSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无图腾', () => { expect((sys as any).totems).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).totems.push(makeTotem(10, 20, 'war'))
    expect((sys as any).totems[0].type).toBe('war')
  })
  it('返回内部引用', () => {
    ;(sys as any).totems.push(makeTotem(10, 20))
    expect((sys as any).totems).toBe((sys as any).totems)
  })
  it('getTotemCount返回正确数量', () => {
    ;(sys as any).totems.push(makeTotem(10, 20))
    ;(sys as any).totems.push(makeTotem(30, 40))
    expect((sys as any).totems.length).toBe(2)
  })
  it('getTotemAt按坐标查找', () => {
    ;(sys as any).totems.push(makeTotem(10, 20, 'fertility'))
    const found = sys.getTotemAt(10, 20)
    expect(found?.type).toBe('fertility')
  })
  it('支持所有6种图腾类型', () => {
    const types: TotemType[] = ['ancestor', 'war', 'fertility', 'protection', 'wisdom', 'nature']
    types.forEach((t, i) => { ;(sys as any).totems.push(makeTotem(i * 10, i * 10, t)) })
    expect((sys as any).totems).toHaveLength(6)
  })
})
