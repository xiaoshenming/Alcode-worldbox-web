import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCorruptionSystem } from '../systems/WorldCorruptionSystem'

function makeSys(): WorldCorruptionSystem { return new WorldCorruptionSystem() }

describe('WorldCorruptionSystem.getCorruption', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始腐败为0', () => {
    expect(sys.getCorruption(0, 0)).toBe(0)
  })
  it('越界坐标返回0', () => {
    expect(sys.getCorruption(-1, -1)).toBe(0)
    expect(sys.getCorruption(9999, 9999)).toBe(0)
  })
  it('注入后可查询', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.8  // tile(0,0) = index 0
    expect(sys.getCorruption(0, 0)).toBeCloseTo(0.8, 5)
  })
})

describe('WorldCorruptionSystem.getCorruptedTileCount', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为0', () => {
    expect(sys.getCorruptedTileCount()).toBe(0)
  })
  it('注入高值后增加', () => {
    const map = (sys as any).corruptionMap as Float32Array
    // threshold=0.15 in the source
    map[0] = 0.5
    map[1] = 0.8
    map[2] = 0.05  // below threshold
    expect(sys.getCorruptedTileCount()).toBeGreaterThanOrEqual(2)
  })
})
