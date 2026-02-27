import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMangroveDeltaSystem } from '../systems/WorldMangroveDeltaSystem'
import type { MangroveDelta } from '../systems/WorldMangroveDeltaSystem'

function makeSys(): WorldMangroveDeltaSystem { return new WorldMangroveDeltaSystem() }
let nextId = 1
function makeDelta(): MangroveDelta {
  return { id: nextId++, x: 25, y: 35, radius: 12, mangrovesDensity: 80, sedimentDeposit: 50, tidalRange: 4, biodiversity: 90, salinity: 25, tick: 0 }
}

describe('WorldMangroveDeltaSystem.getDeltas', () => {
  let sys: WorldMangroveDeltaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无红树林三角洲', () => { expect(sys.getDeltas()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deltas.push(makeDelta())
    expect(sys.getDeltas()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDeltas()).toBe((sys as any).deltas)
  })
  it('红树林三角洲字段正确', () => {
    ;(sys as any).deltas.push(makeDelta())
    const d = sys.getDeltas()[0]
    expect(d.mangrovesDensity).toBe(80)
    expect(d.biodiversity).toBe(90)
    expect(d.salinity).toBe(25)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
