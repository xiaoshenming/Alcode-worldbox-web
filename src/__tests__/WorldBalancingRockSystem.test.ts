import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBalancingRockSystem } from '../systems/WorldBalancingRockSystem'
import type { BalancingRock } from '../systems/WorldBalancingRockSystem'

function makeSys(): WorldBalancingRockSystem { return new WorldBalancingRockSystem() }
let nextId = 1
function makeRock(): BalancingRock {
  return { id: nextId++, x: 30, y: 40, boulderWeight: 500, contactArea: 2, stabilityIndex: 85, weatheringAge: 1000, collapseRisk: 10, spectacle: 90, tick: 0 }
}

describe('WorldBalancingRockSystem.getRocks', () => {
  let sys: WorldBalancingRockSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无平衡岩', () => { expect(sys.getRocks()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rocks.push(makeRock())
    expect(sys.getRocks()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRocks()).toBe((sys as any).rocks)
  })
  it('平衡岩字段正确', () => {
    ;(sys as any).rocks.push(makeRock())
    const r = sys.getRocks()[0]
    expect(r.boulderWeight).toBe(500)
    expect(r.stabilityIndex).toBe(85)
    expect(r.collapseRisk).toBe(10)
  })
  it('多个平衡岩全部返回', () => {
    ;(sys as any).rocks.push(makeRock())
    ;(sys as any).rocks.push(makeRock())
    expect(sys.getRocks()).toHaveLength(2)
  })
})
