import { describe, it, expect, beforeEach } from 'vitest'
import { CombatSystem } from '../systems/CombatSystem'
import { EntityManager } from '../ecs/Entity'

// Mock 依赖
function makeMocks() {
  const em = new EntityManager()
  const spatialHash = { query: () => [] as number[] }
  const particles = { spawnDeath: () => {}, spawn: () => {}, spawnBirth: () => {} }
  const audio = { playCombat: () => {}, playDeath: () => {}, isMuted: false }
  const civManager = { civilizations: new Map(), getCultureBonus: () => 1 }
  return { em, spatialHash, particles, audio, civManager }
}

function makeSys() {
  const { em, civManager, particles, audio, spatialHash } = makeMocks()
  const sys = new CombatSystem(em as any, civManager as any, particles as any, audio as any, spatialHash as any)
  return { sys, em }
}

describe('CombatSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/CombatSystem')
    expect(mod.CombatSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(CombatSystem)
  })

  it('update() 空实体管理器不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 10; i++) {
      expect(() => sys.update(i)).not.toThrow()
    }
  })

  it('setArtifactSystem() 可以设置', () => {
    const { sys } = makeSys()
    const mockArtifact = { getArtifactCombatBonus: () => 0 }
    expect(() => sys.setArtifactSystem(mockArtifact as any)).not.toThrow()
  })

  it('有实体但缺少组件时 update() 不崩溃', () => {
    const { sys, em } = makeSys()
    // 创建实体但不添加任何组件
    em.createEntity()
    em.createEntity()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('有完整组件的实体时 update() 不崩溃', () => {
    const { em, civManager, particles, audio, spatialHash } = makeMocks()
    const sys = new CombatSystem(em as any, civManager as any, particles as any, audio as any, spatialHash as any)
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    em.addComponent(id, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'Test', age: 0, maxAge: 100, gender: 'male' })
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 })
    expect(() => sys.update(0)).not.toThrow()
  })
})
