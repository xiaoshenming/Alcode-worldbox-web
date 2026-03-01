import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'

function makeSys(): WorldBorderSystem { return new WorldBorderSystem() }

describe('WorldBorderSystem', () => {
  let sys: WorldBorderSystem
  beforeEach(() => { sys = makeSys() })

  it('初始边界风格为VOID', () => {
    expect(sys.getBorderStyle()).toBe('VOID')
  })
  it('isNearBorder中心点不在边界', () => {
    expect(sys.isNearBorder(100, 100)).toBe(false)
  })
  it('isNearBorder边缘点在边界', () => {
    expect(sys.isNearBorder(0, 0)).toBe(true)
  })
  it('animTime初始为0', () => { expect((sys as any).animTime).toBe(0) })
  it('_particleCount初始为0', () => { expect((sys as any)._particleCount).toBe(0) })
})
