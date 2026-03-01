import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMigrationMemorySystem } from '../systems/CreatureMigrationMemorySystem'
import type { HabitatMemory, MigrationRoute } from '../systems/CreatureMigrationMemorySystem'

let nextId = 1
function makeSys(): CreatureMigrationMemorySystem { return new CreatureMigrationMemorySystem() }
function makeMemory(creatureId: number): HabitatMemory {
  return { id: nextId++, creatureId, x: 10, y: 20, quality: 70, season: 0, visits: 3, lastVisitTick: 0, inherited: false }
}
function makeRoute(raceType = 'human'): MigrationRoute {
  return { id: nextId++, raceType, waypoints: [{ x: 5, y: 5, quality: 80 }], followers: 10, age: 100 }
}

describe('CreatureMigrationMemorySystem.getMemories / getRoutes', () => {
  let sys: CreatureMigrationMemorySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无记忆', () => { expect((sys as any).memories).toHaveLength(0) })
  it('注入 memory 后可查询', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect((sys as any).memories[0].creatureId).toBe(1)
  })
  it('getMemories 返回内部引用', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect((sys as any).memories).toBe((sys as any).memories)
  })
  it('初始无路线', () => { expect((sys as any).routes).toHaveLength(0) })
  it('注入 route 后可查询', () => {
    ;(sys as any).routes.push(makeRoute('elf'))
    expect((sys as any).routes[0].raceType).toBe('elf')
  })
})

describe('CreatureMigrationMemorySystem.getCreatureMemories', () => {
  let sys: CreatureMigrationMemorySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).memories.push(makeMemory(1))
    expect(sys.getCreatureMemories(999)).toHaveLength(0)
  })
  it('按生物过滤', () => {
    ;(sys as any).memories.push(makeMemory(1))
    ;(sys as any).memories.push(makeMemory(1))
    ;(sys as any).memories.push(makeMemory(2))
    expect(sys.getCreatureMemories(1)).toHaveLength(2)
  })
})
