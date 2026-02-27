import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNaturalWonderSystem } from '../systems/WorldNaturalWonderSystem'
import type { NaturalWonder, WonderType } from '../systems/WorldNaturalWonderSystem'

function makeSys(): WorldNaturalWonderSystem { return new WorldNaturalWonderSystem() }
let nextId = 1
function makeWonder(type: WonderType = 'waterfall', x = 20, y = 30): NaturalWonder {
  return { id: nextId++, type, x, y, radius: 8, power: 3, discovered: false, discoveredBy: null, age: 100 }
}

describe('WorldNaturalWonderSystem.getWonders', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无自然奇观', () => { expect(sys.getWonders()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wonders.push(makeWonder())
    expect(sys.getWonders()).toHaveLength(1)
  })
  it('支持5种奇观类型', () => {
    const types: WonderType[] = ['waterfall', 'crystal_cave', 'ancient_tree', 'geyser', 'aurora_zone']
    expect(types).toHaveLength(5)
  })
  it('奇观字段正确', () => {
    ;(sys as any).wonders.push(makeWonder('geyser'))
    const w = sys.getWonders()[0]
    expect(w.type).toBe('geyser')
    expect(w.power).toBe(3)
    expect(w.discovered).toBe(false)
  })
})

describe('WorldNaturalWonderSystem.getWonderCount', () => {
  let sys: WorldNaturalWonderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始数量为0', () => { expect(sys.getWonderCount()).toBe(0) })
  it('注入后数量正确', () => {
    ;(sys as any).wonders.push(makeWonder())
    ;(sys as any).wonders.push(makeWonder())
    expect(sys.getWonderCount()).toBe(2)
  })
})
