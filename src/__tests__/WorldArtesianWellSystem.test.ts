import { describe, it, expect, beforeEach } from 'vitest'
import { WorldArtesianWellSystem } from '../systems/WorldArtesianWellSystem'
import type { ArtesianWell } from '../systems/WorldArtesianWellSystem'

function makeSys(): WorldArtesianWellSystem { return new WorldArtesianWellSystem() }
let nextId = 1
function makeWell(): ArtesianWell {
  return { id: nextId++, x: 20, y: 30, waterPressure: 70, flowRate: 50, aquiferDepth: 100, waterPurity: 90, tick: 0 }
}

describe('WorldArtesianWellSystem.getWells', () => {
  let sys: WorldArtesianWellSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无自流井', () => { expect(sys.getWells()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wells.push(makeWell())
    expect(sys.getWells()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getWells()).toBe((sys as any).wells)
  })
  it('自流井字段正确', () => {
    ;(sys as any).wells.push(makeWell())
    const w = sys.getWells()[0]
    expect(w.waterPressure).toBe(70)
    expect(w.aquiferDepth).toBe(100)
    expect(w.waterPurity).toBe(90)
  })
  it('多个自流井全部返回', () => {
    ;(sys as any).wells.push(makeWell())
    ;(sys as any).wells.push(makeWell())
    expect(sys.getWells()).toHaveLength(2)
  })
})
