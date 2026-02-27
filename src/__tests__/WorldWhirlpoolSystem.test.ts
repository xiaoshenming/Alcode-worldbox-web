import { describe, it, expect, beforeEach } from 'vitest'
import { WorldWhirlpoolSystem } from '../systems/WorldWhirlpoolSystem'
import type { Whirlpool } from '../systems/WorldWhirlpoolSystem'

function makeSys(): WorldWhirlpoolSystem { return new WorldWhirlpoolSystem() }
let nextId = 1
function makeWhirlpool(active: boolean = true): Whirlpool {
  return { id: nextId++, x: 30, y: 30, radius: 5, strength: 70, rotation: 0, rotSpeed: 0.1, duration: 500, maxDuration: 1000, active }
}

describe('WorldWhirlpoolSystem.getWhirlpools', () => {
  let sys: WorldWhirlpoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无漩涡', () => { expect(sys.getWhirlpools()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool())
    expect(sys.getWhirlpools()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getWhirlpools()).toBe((sys as any).whirlpools)
  })
  it('漩涡字段正确', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool())
    const w = sys.getWhirlpools()[0]
    expect(w.strength).toBe(70)
    expect(w.active).toBe(true)
  })
})

describe('WorldWhirlpoolSystem.getActiveWhirlpools', () => {
  let sys: WorldWhirlpoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃漩涡', () => { expect(sys.getActiveWhirlpools()).toHaveLength(0) })
  it('active=true才返回', () => {
    ;(sys as any).whirlpools.push(makeWhirlpool(true))
    ;(sys as any).whirlpools.push(makeWhirlpool(false))
    expect(sys.getActiveWhirlpools()).toHaveLength(1)
  })
})
