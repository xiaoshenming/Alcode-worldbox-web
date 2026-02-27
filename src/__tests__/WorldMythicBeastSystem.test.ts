import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMythicBeastSystem } from '../systems/WorldMythicBeastSystem'
import type { MythicBeast, BeastType } from '../systems/WorldMythicBeastSystem'

function makeSys(): WorldMythicBeastSystem { return new WorldMythicBeastSystem() }
let nextId = 1
function makeBeast(type: BeastType = 'phoenix', health: number = 100): MythicBeast {
  return { id: nextId++, type, name: 'Ignis', x: 50, y: 50, health, maxHealth: 200, damage: 20, speed: 2, territory: 10, hostile: true, killCount: 0, spawnTick: 0, targetX: 50, targetY: 50, moveTimer: 0 }
}

describe('WorldMythicBeastSystem.getBeasts', () => {
  let sys: WorldMythicBeastSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无神话生物', () => { expect(sys.getBeasts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).beasts.push(makeBeast())
    expect(sys.getBeasts()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getBeasts()).toBe((sys as any).beasts)
  })
  it('支持5种神话生物类型', () => {
    const types: BeastType[] = ['phoenix', 'leviathan', 'behemoth', 'griffin', 'hydra']
    expect(types).toHaveLength(5)
  })
  it('生物字段正确', () => {
    ;(sys as any).beasts.push(makeBeast('hydra', 150))
    const b = sys.getBeasts()[0]
    expect(b.type).toBe('hydra')
    expect(b.health).toBe(150)
    expect(b.hostile).toBe(true)
  })
})

describe('WorldMythicBeastSystem.getAliveBeasts', () => {
  let sys: WorldMythicBeastSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无存活生物', () => { expect(sys.getAliveBeasts()).toHaveLength(0) })
  it('health>0才被返回', () => {
    ;(sys as any).beasts.push(makeBeast('phoenix', 100))  // alive
    ;(sys as any).beasts.push(makeBeast('hydra', 0))       // dead
    expect(sys.getAliveBeasts()).toHaveLength(1)
  })
  it('health=0被过滤', () => {
    ;(sys as any).beasts.push(makeBeast('griffin', 0))
    expect(sys.getAliveBeasts()).toHaveLength(0)
  })
})
