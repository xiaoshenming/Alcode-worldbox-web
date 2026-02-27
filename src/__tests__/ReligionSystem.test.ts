import { describe, it, expect, beforeEach } from 'vitest'
import { ReligionSystem } from '../systems/ReligionSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeSys() { return new ReligionSystem() }

function makeMockWorld() {
  return {
    width: 20, height: 20,
    getTile: (_x: number, _y: number) => TileType.GRASS
  }
}

describe('ReligionSystem', () => {
  let sys: ReligionSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始blessingCooldowns为空Map', () => { expect((sys as any).blessingCooldowns.size).toBe(0) })

  it('update() 空实体管理器不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnBlessing: () => {}, spawn: () => {} }
    expect(() => sys.update(civManager as any, em, world as any, particles as any, 0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const em = new EntityManager()
    const world = makeMockWorld()
    const civManager = { civilizations: new Map(), getRelation: () => 0 }
    const particles = { spawnBlessing: () => {}, spawn: () => {} }
    expect(() => {
      for (let i = 0; i < 3; i++) sys.update(civManager as any, em, world as any, particles as any, i)
    }).not.toThrow()
  })
})
