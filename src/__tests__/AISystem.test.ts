import { describe, it, expect } from 'vitest'
import { AISystem } from '../systems/AISystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeMocks() {
  const em = new EntityManager()
  const world = { width: 20, height: 20, getTile: () => TileType.GRASS, tick: 0 }
  const particles = { spawnDeath: () => {}, spawnBirth: () => {}, spawn: () => {} }
  const factory = { spawn: () => em.createEntity() }
  const spatialHash = { query: () => [] as number[] }
  return { em, world, particles, factory, spatialHash }
}

function makeSys() {
  const mocks = makeMocks()
  const sys = new AISystem(mocks.em as any, mocks.world as any, mocks.particles as any, mocks.factory as any, mocks.spatialHash as any)
  return { sys, ...mocks }
}

describe('AISystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/AISystem')
    expect(mod.AISystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(AISystem)
  })

  it('update() 空实体管理器不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 8; i++) {
      expect(() => sys.update()).not.toThrow()
    }
  })

  it('setResourceSystem() 可以设置', () => {
    const { sys } = makeSys()
    const mockRes = { getResourcesNear: () => [] }
    expect(() => sys.setResourceSystem(mockRes as any)).not.toThrow()
  })

  it('setCivManager() 可以设置', () => {
    const { sys } = makeSys()
    const mockCiv = { civilizations: new Map() }
    expect(() => sys.setCivManager(mockCiv as any)).not.toThrow()
  })

  it('有实体但缺少组件时 update() 不崩溃', () => {
    const { sys, em } = makeSys()
    em.createEntity()
    em.createEntity()
    expect(() => sys.update()).not.toThrow()
  })
})
