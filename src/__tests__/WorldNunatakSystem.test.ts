import { describe, it, expect, beforeEach } from 'vitest'
import { WorldNunatakSystem } from '../systems/WorldNunatakSystem'
import type { Nunatak } from '../systems/WorldNunatakSystem'

function makeSys(): WorldNunatakSystem { return new WorldNunatakSystem() }
let nextId = 1
function makeNunatak(): Nunatak {
  return { id: nextId++, x: 30, y: 40, peakHeight: 20, iceThickness: 50, exposedRock: 30, weathering: 5, alpineLife: 20, windExposure: 90, tick: 0 }
}

describe('WorldNunatakSystem.getNunataks', () => {
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰原岛峰', () => { expect((sys as any).nunataks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).nunataks).toBe((sys as any).nunataks)
  })
  it('冰原岛峰字段正确', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    const n = (sys as any).nunataks[0]
    expect(n.peakHeight).toBe(20)
    expect(n.windExposure).toBe(90)
    expect(n.alpineLife).toBe(20)
  })
  it('多个冰原岛峰全部返回', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    ;(sys as any).nunataks.push(makeNunatak())
    expect((sys as any).nunataks).toHaveLength(2)
  })
})
