import { describe, it, expect } from 'vitest'
import { AISystem } from '../systems/AISystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent, NeedsComponent, AIComponent, CreatureComponent } from '../ecs/Entity'
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
  const sys = new AISystem(
    mocks.em as any, mocks.world as any,
    mocks.particles as any, mocks.factory as any, mocks.spatialHash as any
  )
  return { sys, ...mocks }
}

function addCreatureEntity(em: EntityManager, opts: { health: number; hunger: number; age?: number; maxAge?: number }) {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x: 5, y: 5 })
  em.addComponent<AIComponent>(id, {
    type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0
  })
  em.addComponent<NeedsComponent>(id, { type: 'needs', hunger: opts.hunger, health: opts.health })
  em.addComponent<CreatureComponent>(id, {
    type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false,
    name: 'TestHuman', age: opts.age ?? 0, maxAge: opts.maxAge ?? 1000, gender: 'male'
  })
  return id
}

describe('AISystem breedCooldown 内存泄漏修复', () => {
  it('实体饥饿死亡（health<=0）时 breedCooldown 应被清理', () => {
    const { sys, em } = makeSys()

    // 创建一个健康的实体
    const id = addCreatureEntity(em, { health: 0, hunger: 100 })

    // 人为设置 breedCooldown（内部私有字段通过 as any 访问）
    ;(sys as any).breedCooldown.set(id, 200)
    expect((sys as any).breedCooldown.has(id)).toBe(true)

    // 运行一轮 update（因为批次系统，需要运行多次确保处理到该实体）
    for (let i = 0; i < 8; i++) {
      sys.update()
    }

    // 实体已死亡，breedCooldown 应该被清理
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })

  it('实体老死时 breedCooldown 也应被清理', () => {
    const { sys, em } = makeSys()

    // 创建一个濒死的实体（age >= maxAge）
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 999, maxAge: 999 })

    ;(sys as any).breedCooldown.set(id, 300)
    expect((sys as any).breedCooldown.has(id)).toBe(true)

    // age += 0.1 每次 update，从 999 开始只需 1 次
    for (let i = 0; i < 8; i++) {
      sys.update()
    }

    // 实体老死，breedCooldown 应被清理
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })
})
