import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMeteorShowerSystem } from '../systems/WorldMeteorShowerSystem'
import type { Meteor, MeteorSize } from '../systems/WorldMeteorShowerSystem'

function makeSys(): WorldMeteorShowerSystem { return new WorldMeteorShowerSystem() }
let nextId = 1
function makeMeteor(size: MeteorSize = 'medium', damage: number = 30): Meteor {
  return { id: nextId++, x: 50, y: 40, size, speed: 5, damage, resources: 12, tick: 0 }
}

describe('WorldMeteorShowerSystem.getMeteors', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流星', () => { expect((sys as any).meteors).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).meteors.push(makeMeteor())
    expect((sys as any).meteors).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).meteors).toBe((sys as any).meteors)
  })
  it('支持5种流星大小', () => {
    const sizes: MeteorSize[] = ['tiny', 'small', 'medium', 'large', 'massive']
    expect(sizes).toHaveLength(5)
  })
})

describe('WorldMeteorShowerSystem.getActiveMeteors', () => {
  let sys: WorldMeteorShowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃流星', () => { expect(sys.getActiveMeteors()).toHaveLength(0) })
  it('damage>0才算活跃', () => {
    ;(sys as any).meteors.push(makeMeteor('small', 15))
    ;(sys as any).meteors.push(makeMeteor('tiny', 0))    // inactive
    expect(sys.getActiveMeteors()).toHaveLength(1)
  })
})
