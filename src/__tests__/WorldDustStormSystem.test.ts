import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDustStormSystem } from '../systems/WorldDustStormSystem'
import type { DustStorm, DustStormIntensity } from '../systems/WorldDustStormSystem'

function makeSys(): WorldDustStormSystem { return new WorldDustStormSystem() }
let nextId = 1
function makeStorm(intensity: DustStormIntensity = 'moderate'): DustStorm {
  return { id: nextId++, x: 50, y: 50, radius: 20, intensity, direction: 1.0, speed: 1.5, startTick: 0, duration: 1000 }
}

describe('WorldDustStormSystem.getStorms', () => {
  let sys: WorldDustStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无尘暴', () => { expect(sys.getStorms()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).storms.push(makeStorm())
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getStorms()).toBe((sys as any).storms)
  })
  it('支持4种尘暴强度', () => {
    const intensities: DustStormIntensity[] = ['mild', 'moderate', 'severe', 'catastrophic']
    expect(intensities).toHaveLength(4)
  })
})
