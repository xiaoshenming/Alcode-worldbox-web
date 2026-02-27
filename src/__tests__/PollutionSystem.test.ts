import { describe, it, expect, beforeEach } from 'vitest'
import { PollutionSystem } from '../systems/PollutionSystem'

function makeSys(): PollutionSystem { return new PollutionSystem() }

describe('PollutionSystem getters', () => {
  let sys: PollutionSystem
  beforeEach(() => { sys = makeSys() })

  it('未污染区域返回0', () => {
    expect(sys.getPollution(0, 0)).toBe(0)
  })
  it('getAveragePollution初始为0', () => {
    expect(sys.getAveragePollution()).toBe(0)
  })
  it('isHealthHazard在无污染时返回false', () => {
    expect(sys.isHealthHazard(0, 0)).toBe(false)
  })
  // getCropPenalty returns 1 (multiplier) when pollution is below threshold
  it('getCropPenalty在无污染时为1（无惩罚乘数）', () => {
    expect(sys.getCropPenalty(0, 0)).toBe(1)
  })
  it('高污染时getCropPenalty<1（有惩罚）', () => {
    // Direct write to Float32Array internal grid at index 0 (position 0,0)
    ;(sys as any).grid[0] = 0.9
    expect(sys.getCropPenalty(0, 0)).toBeLessThan(1)
  })
  it('直接写入grid后可检测到污染', () => {
    ;(sys as any).grid[0] = 0.9
    expect(sys.getPollution(0, 0)).toBeGreaterThan(0)
    expect(sys.isHealthHazard(0, 0)).toBe(true)
  })
})
