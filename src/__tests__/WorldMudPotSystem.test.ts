import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMudPotSystem } from '../systems/WorldMudPotSystem'
import type { MudPot } from '../systems/WorldMudPotSystem'

function makeSys(): WorldMudPotSystem { return new WorldMudPotSystem() }
let nextId = 1
function makePot(): MudPot {
  return { id: nextId++, x: 20, y: 30, viscosity: 0.7, temperature: 80, bubbleRate: 5, acidContent: 3, age: 200, tick: 0 }
}

describe('WorldMudPotSystem.getPots', () => {
  let sys: WorldMudPotSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥泉', () => { expect(sys.getPots()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pots.push(makePot())
    expect(sys.getPots()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPots()).toBe((sys as any).pots)
  })
  it('泥泉字段正确', () => {
    ;(sys as any).pots.push(makePot())
    const p = sys.getPots()[0]
    expect(p.viscosity).toBe(0.7)
    expect(p.bubbleRate).toBe(5)
    expect(p.acidContent).toBe(3)
  })
  it('多个泥泉全部返回', () => {
    ;(sys as any).pots.push(makePot())
    ;(sys as any).pots.push(makePot())
    expect(sys.getPots()).toHaveLength(2)
  })
})
