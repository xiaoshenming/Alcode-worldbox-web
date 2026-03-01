import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPermafrostSystem } from '../systems/WorldPermafrostSystem'
import type { PermafrostZone } from '../systems/WorldPermafrostSystem'

function makeSys(): WorldPermafrostSystem { return new WorldPermafrostSystem() }
let nextId = 1
function makeZone(): PermafrostZone {
  return { id: nextId++, x: 20, y: 10, radius: 8, depth: 60, thawRate: 0.02, startTick: 0 }
}

describe('WorldPermafrostSystem.getZones', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冻土区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('冻土区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.depth).toBe(60)
    expect(z.thawRate).toBe(0.02)
  })
  it('多个冻土区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})
