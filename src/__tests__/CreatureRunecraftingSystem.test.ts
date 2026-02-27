import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRunecraftingSystem } from '../systems/CreatureRunecraftingSystem'
import type { Rune, RuneType } from '../systems/CreatureRunecraftingSystem'

let nextId = 1
function makeSys(): CreatureRunecraftingSystem { return new CreatureRunecraftingSystem() }
function makeRune(creator: number, type: RuneType = 'fire'): Rune {
  return { id: nextId++, type, power: 60, creator, tick: 0 }
}

describe('CreatureRunecraftingSystem.getRunes', () => {
  let sys: CreatureRunecraftingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无符文', () => { expect(sys.getRunes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).runes.push(makeRune(1, 'ice'))
    expect(sys.getRunes()[0].type).toBe('ice')
  })
  it('返回内部引用', () => {
    ;(sys as any).runes.push(makeRune(1))
    expect(sys.getRunes()).toBe((sys as any).runes)
  })
  it('支持所有7种符文类型', () => {
    const types: RuneType[] = ['fire', 'ice', 'lightning', 'earth', 'wind', 'shadow', 'light']
    types.forEach((t, i) => { ;(sys as any).runes.push(makeRune(i + 1, t)) })
    expect(sys.getRunes()).toHaveLength(7)
  })
})
