import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFertilitySystem } from '../systems/WorldFertilitySystem'

function makeSys(): WorldFertilitySystem { return new WorldFertilitySystem() }

describe('WorldFertilitySystem.getFertility', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => { sys = makeSys() })

  it('未初始化时越界返回0', () => {
    expect(sys.getFertility(-1, -1)).toBe(0)
  })
  it('初始化后可查询', () => {
    sys.init(10, 10, Array.from({ length: 10 }, () => Array(10).fill(3)))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(0)
  })
  it('可通过setFertility设置值', () => {
    sys.init(10, 10, Array.from({ length: 10 }, () => Array(10).fill(3)))
    sys.setFertility(2, 2, 75)
    expect(sys.getFertility(2, 2)).toBe(75)
  })
})

describe('WorldFertilitySystem.getAverageFertility', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => { sys = makeSys() })

  it('未初始化时返回0', () => {
    expect(sys.getAverageFertility()).toBe(0)
  })
  it('初始化后返回非负值', () => {
    sys.init(10, 10, Array.from({ length: 10 }, () => Array(10).fill(3)))
    expect(sys.getAverageFertility()).toBeGreaterThanOrEqual(0)
  })
  it('isInitialized在初始化后为true', () => {
    expect(sys.isInitialized()).toBe(false)
    sys.init(5, 5, Array.from({ length: 5 }, () => Array(5).fill(3)))
    expect(sys.isInitialized()).toBe(true)
  })
})
