import { describe, it, expect, beforeEach } from 'vitest'
import { BiomeEvolutionSystem } from '../systems/BiomeEvolutionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeSys() { return new BiomeEvolutionSystem() }

function makeMockWorld() {
  return {
    width: 20,
    height: 20,
    getTile: (_x: number, _y: number) => TileType.GRASS,
    setTile: () => {}
  }
}

function makeMockParticles() {
  return { spawnEvolution: () => {}, spawn: () => {} }
}

function makeMockCivManager() {
  return { civilizations: new Map() }
}

describe('BiomeEvolutionSystem', () => {
  let sys: BiomeEvolutionSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始sampleCount为正数', () => { expect((sys as any).sampleCount).toBeGreaterThan(0) })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = makeMockCivManager()
    const particles = makeMockParticles()
    expect(() => sys.update(world as any, civManager as any, em, particles as any, 0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = makeMockCivManager()
    const particles = makeMockParticles()
    expect(() => {
      for (let i = 0; i < 3; i++) sys.update(world as any, civManager as any, em, particles as any, i)
    }).not.toThrow()
  })
})
