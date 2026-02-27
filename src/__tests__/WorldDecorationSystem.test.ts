import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDecorationSystem } from '../systems/WorldDecorationSystem'

function makeSys(): WorldDecorationSystem { return new WorldDecorationSystem() }

describe('WorldDecorationSystem.count', () => {
  let sys: WorldDecorationSystem
  beforeEach(() => { sys = makeSys() })

  it('初始count为0', () => { expect(sys.count).toBe(0) })
  it('注入decorationCount后count增加', () => {
    ;(sys as any).decorationCount = 3
    expect(sys.count).toBe(3)
  })
  it('decorationCount=0时count为0', () => {
    ;(sys as any).decorationCount = 0
    expect(sys.count).toBe(0)
  })
  it('worldWidth初始为0', () => { expect((sys as any).worldWidth).toBe(0) })
  it('worldHeight初始为0', () => { expect((sys as any).worldHeight).toBe(0) })
})
