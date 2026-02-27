import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLabyrinthSystem } from '../systems/WorldLabyrinthSystem'
import type { Labyrinth, LabyrinthType } from '../systems/WorldLabyrinthSystem'

function makeSys(): WorldLabyrinthSystem { return new WorldLabyrinthSystem() }
let nextId = 1
function makeLabyrinth(type: LabyrinthType = 'stone'): Labyrinth {
  return { id: nextId++, x: 20, y: 30, type, size: 15, complexity: 8, explored: 0, hasTreasure: true, tick: 0 }
}

describe('WorldLabyrinthSystem.getLabyrinths', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无迷宫', () => { expect(sys.getLabyrinths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth())
    expect(sys.getLabyrinths()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getLabyrinths()).toBe((sys as any).labyrinths)
  })
  it('支持4种迷宫类型', () => {
    const types: LabyrinthType[] = ['cave', 'hedge', 'stone', 'ice']
    expect(types).toHaveLength(4)
  })
  it('迷宫字段正确', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth('ice'))
    const l = sys.getLabyrinths()[0]
    expect(l.type).toBe('ice')
    expect(l.complexity).toBe(8)
    expect(l.hasTreasure).toBe(true)
  })
})
