import { describe, it, expect, beforeEach } from 'vitest'
import { PopulationSystem } from '../systems/PopulationSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeSys() { return new PopulationSystem() }

function makeMockWorld() {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => TileType.GRASS,
    setTile: () => {}
  }
}

describe('PopulationSystem', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始pendingEvents为空', () => { expect((sys as any).pendingEvents).toHaveLength(0) })

  it('初始_civMembersMap为空Map', () => { expect((sys as any)._civMembersMap.size).toBe(0) })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnBirth: () => {}, spawnDeath: () => {}, spawn: () => {} }
    expect(() => sys.update(em, world as any, civManager as any, particles as any, 0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnBirth: () => {}, spawnDeath: () => {}, spawn: () => {} }
    expect(() => {
      for (let i = 0; i < 3; i++) sys.update(em, world as any, civManager as any, particles as any, i)
    }).not.toThrow()
  })
})
