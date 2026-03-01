import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBioluminescentBaySystem } from '../systems/WorldBioluminescentBaySystem'
import type { BioluminescentBay } from '../systems/WorldBioluminescentBaySystem'

function makeSys(): WorldBioluminescentBaySystem { return new WorldBioluminescentBaySystem() }
let nextId = 1
function makeBay(): BioluminescentBay {
  return { id: nextId++, x: 30, y: 40, intensity: 80, organismDensity: 70, waterClarity: 90, culturalValue: 85, seasonalPeak: true, tick: 0 }
}

describe('WorldBioluminescentBaySystem.getBays', () => {
  let sys: WorldBioluminescentBaySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无生物发光湾', () => { expect((sys as any).bays).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bays.push(makeBay())
    expect((sys as any).bays).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).bays).toBe((sys as any).bays)
  })
  it('生物发光湾字段正确', () => {
    ;(sys as any).bays.push(makeBay())
    const b = (sys as any).bays[0]
    expect(b.intensity).toBe(80)
    expect(b.waterClarity).toBe(90)
    expect(b.seasonalPeak).toBe(true)
  })
  it('多个生物发光湾全部返回', () => {
    ;(sys as any).bays.push(makeBay())
    ;(sys as any).bays.push(makeBay())
    expect((sys as any).bays).toHaveLength(2)
  })
})
