import { describe, it, expect, beforeEach } from 'vitest'
import { MigrationSystem } from '../systems/MigrationSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeSys() { return new MigrationSystem() }

function makeMockWorld() {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => TileType.GRASS,
    setTile: () => {}
  }
}

describe('MigrationSystem', () => {
  let sys: MigrationSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始bands为空Map', () => { expect((sys as any).bands.size).toBe(0) })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map() }
    const particles = { spawnMigration: () => {}, spawn: () => {}, spawnDeath: () => {} }
    expect(() => sys.update(em, world as any, civManager as any, particles as any)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map() }
    const particles = { spawnMigration: () => {}, spawn: () => {}, spawnDeath: () => {} }
    expect(() => {
      for (let i = 0; i < 3; i++) sys.update(em, world as any, civManager as any, particles as any)
    }).not.toThrow()
  })
  it('bands初始为空Map', () => { expect((sys as any).bands.size).toBe(0) })
})
