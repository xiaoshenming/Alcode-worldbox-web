import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCometSystem } from '../systems/WorldCometSystem'
import type { Comet, CometEffect } from '../systems/WorldCometSystem'

function makeSys(): WorldCometSystem { return new WorldCometSystem() }
let nextId = 1
function makeComet(effect: CometEffect = 'blessing'): Comet {
  return {
    id: nextId++, trajectory: { startX: 0, startY: 0, endX: 100, endY: 100 },
    speed: 2, brightness: 80, effect, startTick: 0, duration: 500
  }
}

describe('WorldCometSystem.getComets', () => {
  let sys: WorldCometSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彗星', () => { expect(sys.getComets()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).comets.push(makeComet())
    expect(sys.getComets()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getComets()).toBe((sys as any).comets)
  })
  it('支持5种彗星效果', () => {
    const effects: CometEffect[] = ['resource_rain', 'omen', 'inspiration', 'mutation', 'blessing']
    expect(effects).toHaveLength(5)
  })
})

describe('WorldCometSystem.getTotalComets', () => {
  let sys: WorldCometSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getTotalComets()).toBe(0) })
  it('注入totalComets后可查询', () => {
    ;(sys as any).totalComets = 10
    expect(sys.getTotalComets()).toBe(10)
  })
})
