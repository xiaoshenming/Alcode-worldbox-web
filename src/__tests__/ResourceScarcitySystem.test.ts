import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceScarcitySystem } from '../systems/ResourceScarcitySystem'
import type { ScarcityResource, ScarcityLevel, CivResourceState } from '../systems/ResourceScarcitySystem'

function makeSys(): ResourceScarcitySystem { return new ResourceScarcitySystem() }

function makeState(foodCurrent: number, foodCapacity: number): CivResourceState {
  return {
    famineTicks: 0,
    droughtTicks: 0,
    resources: {
      FOOD: { current: foodCurrent, capacity: foodCapacity, consumptionRate: 0, productionRate: 0 },
      WOOD: { current: 100, capacity: 100, consumptionRate: 0, productionRate: 0 },
      STONE: { current: 100, capacity: 100, consumptionRate: 0, productionRate: 0 },
      GOLD: { current: 100, capacity: 100, consumptionRate: 0, productionRate: 0 },
      WATER: { current: 100, capacity: 100, consumptionRate: 0, productionRate: 0 },
    }
  }
}

describe('ResourceScarcitySystem.getResourceLevel', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回ABUNDANT（默认100%）', () => {
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })
  it('注入低百分比后返回DEPLETED', () => {
    ;(sys as any).states.set(1, makeState(0, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('DEPLETED')
  })
  it('注入满量时返回ABUNDANT', () => {
    ;(sys as any).states.set(1, makeState(100, 100))
    expect(sys.getResourceLevel(1, 'FOOD')).toBe('ABUNDANT')
  })
  it('支持5种资源类型', () => {
    const resources: ScarcityResource[] = ['FOOD', 'WOOD', 'STONE', 'GOLD', 'WATER']
    resources.forEach(r => {
      const level = sys.getResourceLevel(1, r)
      expect(level).toBeDefined()
    })
  })
  it('支持5���稀缺等级', () => {
    const levels: ScarcityLevel[] = ['ABUNDANT', 'SUFFICIENT', 'SCARCE', 'CRITICAL', 'DEPLETED']
    expect(levels).toHaveLength(5)
  })
})

describe('ResourceScarcitySystem.getResourcePercent', () => {
  let sys: ResourceScarcitySystem
  beforeEach(() => { sys = makeSys() })

  it('未注入时返回1.0（100%）', () => {
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(1.0)
  })
  it('注入后返回正确百分比', () => {
    ;(sys as any).states.set(1, makeState(50, 100))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0.5)
  })
  it('capacity为0时返回0', () => {
    ;(sys as any).states.set(1, makeState(50, 0))
    expect(sys.getResourcePercent(1, 'FOOD')).toBe(0)
  })
})
