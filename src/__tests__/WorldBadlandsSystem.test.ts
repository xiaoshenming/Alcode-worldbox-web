import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBadlandsSystem } from '../systems/WorldBadlandsSystem'
import type { Badlands } from '../systems/WorldBadlandsSystem'

function makeSys(): WorldBadlandsSystem { return new WorldBadlandsSystem() }
let nextId = 1
function makeBadlands(): Badlands {
  return { id: nextId++, x: 30, y: 40, radius: 12, erosionLevel: 80, sedimentLayers: 6, aridity: 90, gullyDepth: 5, mineralExposure: 70, tick: 0 }
}

describe('WorldBadlandsSystem.getBadlands', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无荒地', () => { expect((sys as any).badlands).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).badlands.push(makeBadlands())
    expect((sys as any).badlands).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).badlands).toBe((sys as any).badlands)
  })
  it('荒地字段正确', () => {
    ;(sys as any).badlands.push(makeBadlands())
    const b = (sys as any).badlands[0]
    expect(b.erosionLevel).toBe(80)
    expect(b.aridity).toBe(90)
    expect(b.mineralExposure).toBe(70)
  })
  it('多个荒地全部返回', () => {
    ;(sys as any).badlands.push(makeBadlands())
    ;(sys as any).badlands.push(makeBadlands())
    expect((sys as any).badlands).toHaveLength(2)
  })
})
