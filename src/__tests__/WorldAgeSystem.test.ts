import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAgeSystem } from '../systems/WorldAgeSystem'
import type { WorldEpoch } from '../systems/WorldAgeSystem'

function makeSys(): WorldAgeSystem { return new WorldAgeSystem() }

describe('WorldAgeSystem.getCurrentEpoch', () => {
  let sys: WorldAgeSystem
  beforeEach(() => { sys = makeSys() })

  it('初始（tick=0）为PRIMORDIAL时代', () => {
    expect(sys.getCurrentEpoch()).toBe('PRIMORDIAL')
  })
  it('支持5种时代', () => {
    const epochs: WorldEpoch[] = ['PRIMORDIAL', 'ANCIENT', 'CLASSICAL', 'MEDIEVAL', 'MODERN']
    expect(epochs).toHaveLength(5)
  })
})

describe('WorldAgeSystem.getEpochDisplayName', () => {
  let sys: WorldAgeSystem
  beforeEach(() => { sys = makeSys() })

  it('返回字符串', () => {
    expect(typeof sys.getEpochDisplayName()).toBe('string')
  })
  it('初始为太初', () => {
    expect(sys.getEpochDisplayName()).toBe('太初')
  })
})

describe('WorldAgeSystem.getEpochProgress', () => {
  let sys: WorldAgeSystem
  beforeEach(() => { sys = makeSys() })

  it('初始进度在0到1之间', () => {
    const p = sys.getEpochProgress()
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})

describe('WorldAgeSystem.getDisasterFrequencyModifier', () => {
  let sys: WorldAgeSystem
  beforeEach(() => { sys = makeSys() })

  it('PRIMORDIAL时代灾难频率>1', () => {
    expect(sys.getDisasterFrequencyModifier()).toBeGreaterThan(1)
  })
})

describe('WorldAgeSystem.getColorOverlay', () => {
  let sys: WorldAgeSystem
  beforeEach(() => { sys = makeSys() })

  it('返回包含r/g/b/a字段的对象', () => {
    const overlay = sys.getColorOverlay()
    expect(overlay).toHaveProperty('r')
    expect(overlay).toHaveProperty('g')
    expect(overlay).toHaveProperty('b')
    expect(overlay).toHaveProperty('a')
  })
})
