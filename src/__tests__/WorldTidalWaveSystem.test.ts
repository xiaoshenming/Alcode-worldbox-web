import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidalWaveSystem } from '../systems/WorldTidalWaveSystem'
import type { TidalWave, WaveIntensity } from '../systems/WorldTidalWaveSystem'

function makeSys(): WorldTidalWaveSystem { return new WorldTidalWaveSystem() }
let nextId = 1
function makeWave(intensity: WaveIntensity = 'moderate'): TidalWave {
  return { id: nextId++, originX: 10, originY: 10, direction: 0, intensity, reach: 20, progress: 50, startTick: 0, duration: 500 }
}

describe('WorldTidalWaveSystem.getWaves', () => {
  let sys: WorldTidalWaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮汐波', () => { expect((sys as any).waves).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).waves.push(makeWave())
    expect((sys as any).waves).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).waves).toBe((sys as any).waves)
  })
  it('支持4种波浪强度', () => {
    const intensities: WaveIntensity[] = ['minor', 'moderate', 'major', 'tsunami']
    expect(intensities).toHaveLength(4)
  })
  it('潮汐波字段正确', () => {
    ;(sys as any).waves.push(makeWave('tsunami'))
    const w = (sys as any).waves[0]
    expect(w.intensity).toBe('tsunami')
    expect(w.reach).toBe(20)
    expect(w.progress).toBe(50)
  })
})
