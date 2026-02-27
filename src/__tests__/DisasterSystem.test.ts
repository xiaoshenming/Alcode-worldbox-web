import { describe, it, expect } from 'vitest'
import { DisasterSystem } from '../systems/DisasterSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeMocks() {
  const em = new EntityManager()
  const world = { width: 20, height: 20, getTile: () => TileType.GRASS, setTile: () => {}, tick: 0 }
  const particles = { spawnExplosion: () => {}, spawn: () => {}, spawnDeath: () => {} }
  return { em, world, particles }
}

function makeSys() {
  const { em, world, particles } = makeMocks()
  const sys = new DisasterSystem(world as any, particles as any, em)
  return { sys, em, world }
}

describe('DisasterSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/DisasterSystem')
    expect(mod.DisasterSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(DisasterSystem)
  })

  it('update() 空世界不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 10; i++) {
      expect(() => sys.update()).not.toThrow()
    }
  })
})
