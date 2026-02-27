import { describe, it, expect, beforeEach } from 'vitest'
import { NavalSystem } from '../systems/NavalSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeSys() { return new NavalSystem() }

function makeMockWorld() {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => TileType.DEEP_WATER,
    setTile: () => {}
  }
}

describe('NavalSystem', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始portShipCount为空Map', () => { expect((sys as any).portShipCount.size).toBe(0) })

  it('初始_combatGrid为空Map', () => { expect((sys as any)._combatGrid.size).toBe(0) })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnCombat: () => {}, spawn: () => {}, spawnDeath: () => {} }
    expect(() => sys.update(em, world as any, civManager as any, particles as any, 0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnCombat: () => {}, spawn: () => {}, spawnDeath: () => {} }
    expect(() => {
      for (let i = 0; i < 3; i++) sys.update(em, world as any, civManager as any, particles as any, i)
    }).not.toThrow()
  })
})
