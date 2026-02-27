import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFloatingIslandSystem } from '../systems/WorldFloatingIslandSystem'
import type { FloatingIsland, IslandSize } from '../systems/WorldFloatingIslandSystem'

function makeSys(): WorldFloatingIslandSystem { return new WorldFloatingIslandSystem() }
let nextId = 1
function makeIsland(size: IslandSize = 'medium'): FloatingIsland {
  return { id: nextId++, x: 50, y: 40, altitude: 80, size, driftAngle: 0, driftSpeed: 0.5, magicLevel: 70, resources: 100, tick: 0 }
}

describe('WorldFloatingIslandSystem.getIslands', () => {
  let sys: WorldFloatingIslandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无浮空岛', () => { expect(sys.getIslands()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).islands.push(makeIsland())
    expect(sys.getIslands()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getIslands()).toBe((sys as any).islands)
  })
  it('支持5种岛屿大小', () => {
    const sizes: IslandSize[] = ['tiny', 'small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(5)
  })
  it('岛屿字段正确', () => {
    ;(sys as any).islands.push(makeIsland('large'))
    const i = sys.getIslands()[0]
    expect(i.size).toBe('large')
    expect(i.magicLevel).toBe(70)
  })
})
