import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTelepathySystem } from '../systems/CreatureTelepathySystem'
import type { TelepathicLink, TelepathicAbility } from '../systems/CreatureTelepathySystem'

let nextId = 1
function makeSys(): CreatureTelepathySystem { return new CreatureTelepathySystem() }
function makeLink(senderId: number, receiverId: number, ability: TelepathicAbility = 'danger_sense'): TelepathicLink {
  return { id: nextId++, senderId, receiverId, ability, strength: 60, tick: 0 }
}

describe('CreatureTelepathySystem getters', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无感应链接', () => { expect(sys.getLinks()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'mind_speak'))
    expect(sys.getLinks()[0].ability).toBe('mind_speak')
  })
  it('返回只读引用', () => {
    ;(sys as any).links.push(makeLink(1, 2))
    expect(sys.getLinks()).toBe((sys as any).links)
  })
  it('getPower无记录返回0', () => {
    expect(sys.getPower(999)).toBe(0)
  })
  it('getPower可通过powerMap注入', () => {
    ;(sys as any).powerMap.set(1, 85)
    expect(sys.getPower(1)).toBe(85)
  })
  it('支持所有6种心灵能力', () => {
    const abilities: TelepathicAbility[] = ['danger_sense', 'mind_speak', 'empathy', 'suggestion', 'mind_shield', 'foresight']
    abilities.forEach((a, i) => { ;(sys as any).links.push(makeLink(i + 1, i + 2, a)) })
    expect(sys.getLinks()).toHaveLength(6)
  })
})
