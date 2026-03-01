import { describe, it, expect, beforeEach } from 'vitest'
import { WorldVolcanicIslandSystem } from '../systems/WorldVolcanicIslandSystem'
import type { VolcanicIsland, IslandStage } from '../systems/WorldVolcanicIslandSystem'

function makeSys(): WorldVolcanicIslandSystem { return new WorldVolcanicIslandSystem() }
let nextId = 1
function makeIsland(stage: IslandStage = 'barren'): VolcanicIsland {
  return { id: nextId++, x: 40, y: 50, radius: 10, stage, age: 200, fertility: 20, tick: 0 }
}

describe('WorldVolcanicIslandSystem.getIslands', () => {
  let sys: WorldVolcanicIslandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火山岛', () => { expect((sys as any).islands).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).islands.push(makeIsland())
    expect((sys as any).islands).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).islands).toBe((sys as any).islands)
  })
  it('支持5种岛屿阶段', () => {
    const stages: IslandStage[] = ['erupting', 'cooling', 'barren', 'fertile', 'lush']
    expect(stages).toHaveLength(5)
  })
  it('火山岛字段正确', () => {
    ;(sys as any).islands.push(makeIsland('lush'))
    const i = (sys as any).islands[0]
    expect(i.stage).toBe('lush')
    expect(i.radius).toBe(10)
    expect(i.fertility).toBe(20)
  })
})
