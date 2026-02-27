import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPhreaticExplosionSystem } from '../systems/WorldPhreaticExplosionSystem'
import type { PhreaticExplosion } from '../systems/WorldPhreaticExplosionSystem'

function makeSys(): WorldPhreaticExplosionSystem { return new WorldPhreaticExplosionSystem() }
let nextId = 1
function makeExplosion(): PhreaticExplosion {
  return { id: nextId++, x: 30, y: 40, blastRadius: 10, steamPressure: 80, debrisEjection: 60, groundwaterDepth: 20, age: 100, tick: 0 }
}

describe('WorldPhreaticExplosionSystem.getExplosions', () => {
  let sys: WorldPhreaticExplosionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蒸汽爆炸', () => { expect(sys.getExplosions()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).explosions.push(makeExplosion())
    expect(sys.getExplosions()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getExplosions()).toBe((sys as any).explosions)
  })
  it('蒸汽爆炸字段正确', () => {
    ;(sys as any).explosions.push(makeExplosion())
    const e = sys.getExplosions()[0]
    expect(e.steamPressure).toBe(80)
    expect(e.blastRadius).toBe(10)
    expect(e.debrisEjection).toBe(60)
  })
})
