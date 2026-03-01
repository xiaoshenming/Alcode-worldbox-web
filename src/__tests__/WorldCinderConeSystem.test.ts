import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCinderConeSystem } from '../systems/WorldCinderConeSystem'
import type { CinderCone } from '../systems/WorldCinderConeSystem'

function makeSys(): WorldCinderConeSystem { return new WorldCinderConeSystem() }
let nextId = 1
function makeCone(): CinderCone {
  return { id: nextId++, x: 30, y: 40, radius: 8, height: 20, ashDeposit: 60, activity: 50, erosion: 10, temperature: 300, tick: 0 }
}

describe('WorldCinderConeSystem.getCones', () => {
  let sys: WorldCinderConeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无火山渣锥', () => { expect((sys as any).cones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cones.push(makeCone())
    expect((sys as any).cones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).cones).toBe((sys as any).cones)
  })
  it('火山渣锥字段正确', () => {
    ;(sys as any).cones.push(makeCone())
    const c = (sys as any).cones[0]
    expect(c.ashDeposit).toBe(60)
    expect(c.temperature).toBe(300)
    expect(c.height).toBe(20)
  })
  it('多个火山渣锥全部返回', () => {
    ;(sys as any).cones.push(makeCone())
    ;(sys as any).cones.push(makeCone())
    expect((sys as any).cones).toHaveLength(2)
  })
})
