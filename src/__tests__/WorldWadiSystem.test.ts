import { describe, it, expect, beforeEach } from 'vitest'
import { WorldWadiSystem } from '../systems/WorldWadiSystem'
import type { Wadi } from '../systems/WorldWadiSystem'

function makeSys(): WorldWadiSystem { return new WorldWadiSystem() }
let nextId = 1
function makeWadi(): Wadi {
  return { id: nextId++, x: 20, y: 30, length: 25, depth: 4, waterFrequency: 20, sedimentType: 2, flashFloodRisk: 70, spectacle: 55, tick: 0 }
}

describe('WorldWadiSystem.getWadis', () => {
  let sys: WorldWadiSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无干谷', () => { expect((sys as any).wadis).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wadis.push(makeWadi())
    expect((sys as any).wadis).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).wadis).toBe((sys as any).wadis)
  })
  it('干谷字段正确', () => {
    ;(sys as any).wadis.push(makeWadi())
    const w = (sys as any).wadis[0]
    expect(w.flashFloodRisk).toBe(70)
    expect(w.waterFrequency).toBe(20)
    expect(w.spectacle).toBe(55)
  })
  it('多个干谷全部返回', () => {
    ;(sys as any).wadis.push(makeWadi())
    ;(sys as any).wadis.push(makeWadi())
    expect((sys as any).wadis).toHaveLength(2)
  })
})
