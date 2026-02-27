import { describe, it, expect, beforeEach } from 'vitest'
import { WorldInselbergSystem } from '../systems/WorldInselbergSystem'
import type { Inselberg } from '../systems/WorldInselbergSystem'

function makeSys(): WorldInselbergSystem { return new WorldInselbergSystem() }
let nextId = 1
function makeInselberg(): Inselberg {
  return { id: nextId++, x: 20, y: 30, height: 25, baseRadius: 10, rockType: 3, weatheringRate: 2, vegetationCover: 15, spectacle: 75, tick: 0 }
}

describe('WorldInselbergSystem.getInselbergs', () => {
  let sys: WorldInselbergSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无孤立山丘', () => { expect(sys.getInselbergs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).inselbergs.push(makeInselberg())
    expect(sys.getInselbergs()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getInselbergs()).toBe((sys as any).inselbergs)
  })
  it('孤立山丘字段正确', () => {
    ;(sys as any).inselbergs.push(makeInselberg())
    const i = sys.getInselbergs()[0]
    expect(i.height).toBe(25)
    expect(i.weatheringRate).toBe(2)
    expect(i.spectacle).toBe(75)
  })
  it('多个孤立山丘全部返回', () => {
    ;(sys as any).inselbergs.push(makeInselberg())
    ;(sys as any).inselbergs.push(makeInselberg())
    expect(sys.getInselbergs()).toHaveLength(2)
  })
})
