import { describe, it, expect, beforeEach } from 'vitest'
import { SeasonVisualSystem } from '../systems/SeasonVisualSystem'
import { Season } from '../systems/SeasonSystem'

function makeSys() { return new SeasonVisualSystem() }

describe('SeasonVisualSystem', () => {
  let sys: SeasonVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始particles为数组', () => { expect(Array.isArray((sys as any).particles)).toBe(true) })

  it('初始prevSeason为Spring', () => {
    expect((sys as any).prevSeason).toBe(Season.Spring)
  })

  it('particles数组预分配了固定数量', () => {
    // 预分配粒子池，数组长度应大于0
    expect((sys as any).particles.length).toBeGreaterThan(0)
  })

  it('初始_cachedOverlayAlpha为-1（强制重计算）', () => {
    expect((sys as any)._cachedOverlayAlpha).toBe(-1)
  })

  it('update() 不崩溃（Spring季节）', () => {
    expect(() => sys.update(0, Season.Spring, 0, false)).not.toThrow()
  })

  it('update() 不崩溃（Winter夜晚）', () => {
    expect(() => sys.update(100, Season.Winter, 0, true)).not.toThrow()
  })
})
