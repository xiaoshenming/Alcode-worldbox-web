import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSpireSystem } from '../systems/WorldSpireSystem'
import type { Spire } from '../systems/WorldSpireSystem'

function makeSys(): WorldSpireSystem { return new WorldSpireSystem() }
let nextId = 1
function makeSpire(): Spire {
  return { id: nextId++, x: 25, y: 35, height: 20, baseWidth: 5, stability: 85, erosionRate: 0.015, rockType: 3, windResistance: 70, tick: 0 }
}

describe('WorldSpireSystem.getSpires', () => {
  let sys: WorldSpireSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无尖峰', () => { expect(sys.getSpires()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spires.push(makeSpire())
    expect(sys.getSpires()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSpires()).toBe((sys as any).spires)
  })
  it('尖峰字段正确', () => {
    ;(sys as any).spires.push(makeSpire())
    const s = sys.getSpires()[0]
    expect(s.height).toBe(20)
    expect(s.stability).toBe(85)
    expect(s.windResistance).toBe(70)
  })
})
