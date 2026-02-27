import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'

function makeSys(): WorldBorderSystem { return new WorldBorderSystem() }

describe('WorldBorderSystem', () => {
  let sys: WorldBorderSystem
  beforeEach(() => { sys = makeSys() })

  it('初始边界风格为VOID', () => {
    expect(sys.getBorderStyle()).toBe('VOID')
  })
  it('getRepulsionForce中心点无排斥力', () => {
    const f = sys.getRepulsionForce(100, 100)
    expect(f.fx).toBe(0)
    expect(f.fy).toBe(0)
  })
  it('getRepulsionForce边缘有排斥力', () => {
    const f = sys.getRepulsionForce(0, 0)
    expect(f.fx).toBeGreaterThan(0)
    expect(f.fy).toBeGreaterThan(0)
  })
})
