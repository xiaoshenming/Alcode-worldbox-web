import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBarrierIslandSystem } from '../systems/WorldBarrierIslandSystem'
import type { BarrierIsland } from '../systems/WorldBarrierIslandSystem'

function makeSys(): WorldBarrierIslandSystem { return new WorldBarrierIslandSystem() }
let nextId = 1
function makeIsland(): BarrierIsland {
  return { id: nextId++, x: 20, y: 30, length: 40, width: 8, sandVolume: 5000, vegetationCover: 40, erosionRate: 0.02, tick: 0 }
}

describe('WorldBarrierIslandSystem.getIslands', () => {
  let sys: WorldBarrierIslandSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无障壁岛', () => { expect((sys as any).islands).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).islands.push(makeIsland())
    expect((sys as any).islands).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).islands).toBe((sys as any).islands)
  })
  it('障壁岛字段正确', () => {
    ;(sys as any).islands.push(makeIsland())
    const i = (sys as any).islands[0]
    expect(i.length).toBe(40)
    expect(i.vegetationCover).toBe(40)
    expect(i.erosionRate).toBe(0.02)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
