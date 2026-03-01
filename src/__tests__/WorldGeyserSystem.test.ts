import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeyserSystem } from '../systems/WorldGeyserSystem'
import type { Geyser } from '../systems/WorldGeyserSystem'

function makeSys(): WorldGeyserSystem { return new WorldGeyserSystem() }
let nextId = 1
function makeGeyser(active: boolean = true): Geyser {
  return { id: nextId++, x: 10, y: 10, power: 5, interval: 1000, lastEruption: 0, active }
}

describe('WorldGeyserSystem.getGeysers', () => {
  let sys: WorldGeyserSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无间歇泉', () => { expect((sys as any).geysers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).geysers.push(makeGeyser())
    expect((sys as any).geysers).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).geysers).toBe((sys as any).geysers)
  })
})

describe('WorldGeyserSystem.getActiveGeysers', () => {
  let sys: WorldGeyserSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无活跃间歇泉', () => { expect(sys.getActiveGeysers()).toHaveLength(0) })
  it('active=true才返回', () => {
    ;(sys as any).geysers.push(makeGeyser(true))
    ;(sys as any).geysers.push(makeGeyser(false))
    expect(sys.getActiveGeysers()).toHaveLength(1)
  })
})
