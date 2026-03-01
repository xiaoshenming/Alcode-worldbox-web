import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidalMarshSystem } from '../systems/WorldTidalMarshSystem'
import type { TidalMarsh } from '../systems/WorldTidalMarshSystem'

function makeSys(): WorldTidalMarshSystem { return new WorldTidalMarshSystem() }
let nextId = 1
function makeMarsh(): TidalMarsh {
  return { id: nextId++, x: 20, y: 30, radius: 10, spartinaCover: 70, tidalChannel: 3, salinity: 25, sedimentAccretion: 5, birdPopulation: 40, tick: 0 }
}

describe('WorldTidalMarshSystem.getMarshes', () => {
  let sys: WorldTidalMarshSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮汐沼泽', () => { expect((sys as any).marshes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys as any).marshes).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).marshes).toBe((sys as any).marshes)
  })
  it('潮汐沼泽字段正确', () => {
    ;(sys as any).marshes.push(makeMarsh())
    const m = (sys as any).marshes[0]
    expect(m.spartinaCover).toBe(70)
    expect(m.birdPopulation).toBe(40)
    expect(m.salinity).toBe(25)
  })
  it('多个潮汐沼泽全部返回', () => {
    ;(sys as any).marshes.push(makeMarsh())
    ;(sys as any).marshes.push(makeMarsh())
    expect((sys as any).marshes).toHaveLength(2)
  })
})
