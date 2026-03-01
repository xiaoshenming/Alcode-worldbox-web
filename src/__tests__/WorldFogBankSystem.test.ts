import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFogBankSystem } from '../systems/WorldFogBankSystem'
import type { FogBank, FogDensity } from '../systems/WorldFogBankSystem'

function makeSys(): WorldFogBankSystem { return new WorldFogBankSystem() }
let nextId = 1
function makeFog(density: FogDensity = 'moderate'): FogBank {
  return { id: nextId++, x: 30, y: 40, density, radius: 15, visibility: 40, speedPenalty: 0.5, duration: 400, startTick: 0 }
}

describe('WorldFogBankSystem.getFogs', () => {
  let sys: WorldFogBankSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雾区', () => { expect(sys.getFogs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getFogs().push(makeFog())
    expect(sys.getFogs()).toHaveLength(1)
  })
  it('支持4种雾密度', () => {
    const densities: FogDensity[] = ['light', 'moderate', 'thick', 'impenetrable']
    expect(densities).toHaveLength(4)
  })
  it('雾区字段正确', () => {
    ;sys.getFogs().push(makeFog('thick'))
    const f = sys.getFogs()[0]
    expect(f.density).toBe('thick')
    expect(f.visibility).toBe(40)
    expect(f.speedPenalty).toBe(0.5)
  })
  it('多个雾区全部返回', () => {
    ;sys.getFogs().push(makeFog())
    ;sys.getFogs().push(makeFog())
    expect(sys.getFogs()).toHaveLength(2)
  })
})
