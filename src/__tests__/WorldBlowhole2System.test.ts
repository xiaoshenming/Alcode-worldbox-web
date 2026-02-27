import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBlowhole2System } from '../systems/WorldBlowhole2System'
import type { Blowhole2 } from '../systems/WorldBlowhole2System'

function makeSys(): WorldBlowhole2System { return new WorldBlowhole2System() }
let nextId = 1
function makeBlowhole(): Blowhole2 {
  return { id: nextId++, x: 15, y: 25, shaftDepth: 10, openingDiameter: 3, sprayHeight: 8, waveForce: 70, erosionRate: 2, spectacle: 80, tick: 0 }
}

describe('WorldBlowhole2System.getBlowholes', () => {
  let sys: WorldBlowhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无喷水孔', () => { expect(sys.getBlowholes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    expect(sys.getBlowholes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getBlowholes()).toBe((sys as any).blowholes)
  })
  it('喷水孔字段正确', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    const b = sys.getBlowholes()[0]
    expect(b.waveForce).toBe(70)
    expect(b.spectacle).toBe(80)
    expect(b.sprayHeight).toBe(8)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
