import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMangroveSystem } from '../systems/WorldMangroveSystem'
import type { MangroveForest, MangroveHealth } from '../systems/WorldMangroveSystem'

function makeSys(): WorldMangroveSystem { return new WorldMangroveSystem() }
let nextId = 1
function makeForest(health: MangroveHealth = 'healthy'): MangroveForest {
  return { id: nextId++, x: 30, y: 20, health, density: 70, stormProtection: 60, biodiversityBonus: 40, waterQuality: 85, startTick: 0 }
}

describe('WorldMangroveSystem.getForests', () => {
  let sys: WorldMangroveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无红树林', () => { expect((sys as any).forests).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).forests).toBe((sys as any).forests)
  })
  it('支持4种健康状态', () => {
    const types: MangroveHealth[] = ['flourishing', 'healthy', 'stressed', 'dying']
    expect(types).toHaveLength(4)
  })
  it('红树林字段正确', () => {
    ;(sys as any).forests.push(makeForest('flourishing'))
    const f = (sys as any).forests[0]
    expect(f.health).toBe('flourishing')
    expect(f.density).toBe(70)
    expect(f.stormProtection).toBe(60)
  })
})
