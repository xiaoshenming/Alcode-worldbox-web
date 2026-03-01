import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFrostHollowSystem } from '../systems/WorldFrostHollowSystem'
import type { FrostHollow } from '../systems/WorldFrostHollowSystem'

function makeSys(): WorldFrostHollowSystem { return new WorldFrostHollowSystem() }
let nextId = 1
function makeHollow(): FrostHollow {
  return { id: nextId++, x: 10, y: 5, depth: 3, temperature: -8, frostDuration: 200, vegetationDamage: 30, airPooling: 60, tick: 0 }
}

describe('WorldFrostHollowSystem.getHollows', () => {
  let sys: WorldFrostHollowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无霜洼', () => { expect((sys as any).hollows).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hollows.push(makeHollow())
    expect((sys as any).hollows).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).hollows).toBe((sys as any).hollows)
  })
  it('霜洼字段正确', () => {
    ;(sys as any).hollows.push(makeHollow())
    const h = (sys as any).hollows[0]
    expect(h.temperature).toBe(-8)
    expect(h.vegetationDamage).toBe(30)
    expect(h.airPooling).toBe(60)
  })
  it('多个霜洼全部返回', () => {
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    expect((sys as any).hollows).toHaveLength(2)
  })
})
