import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPlainsSystem } from '../systems/WorldPlainsSystem'
import type { Plains } from '../systems/WorldPlainsSystem'

function makeSys(): WorldPlainsSystem { return new WorldPlainsSystem() }
let nextId = 1
function makePlains(): Plains {
  return { id: nextId++, x: 30, y: 40, radius: 20, grassHeight: 5, soilFertility: 80, windExposure: 60, wildlifeAbundance: 70, moisture: 50, tick: 0 }
}

describe('WorldPlainsSystem.getPlains', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无平原', () => { expect(sys.getPlains()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plains.push(makePlains())
    expect(sys.getPlains()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPlains()).toBe((sys as any).plains)
  })
  it('平原字段正确', () => {
    ;(sys as any).plains.push(makePlains())
    const p = sys.getPlains()[0]
    expect(p.soilFertility).toBe(80)
    expect(p.wildlifeAbundance).toBe(70)
    expect(p.moisture).toBe(50)
  })
})
