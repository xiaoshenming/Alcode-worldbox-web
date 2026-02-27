import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLamplighterSystem } from '../systems/CreatureLamplighterSystem'
import type { Lamplighter, FuelType } from '../systems/CreatureLamplighterSystem'

let nextId = 1
function makeSys(): CreatureLamplighterSystem { return new CreatureLamplighterSystem() }
function makeLamplighter(entityId: number, fuelType: FuelType = 'oil'): Lamplighter {
  return { id: nextId++, entityId, skill: 60, lampsLit: 50, lampsMaintained: 30, fuelType, routeLength: 20, efficiency: 80, tick: 0 }
}

describe('CreatureLamplighterSystem.getLamplighters', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无点灯人', () => { expect(sys.getLamplighters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'gas'))
    expect(sys.getLamplighters()[0].fuelType).toBe('gas')
  })
  it('返回内部引用', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    expect(sys.getLamplighters()).toBe((sys as any).lamplighters)
  })
  it('支持所有 4 种燃料', () => {
    const fuels: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    fuels.forEach((f, i) => { ;(sys as any).lamplighters.push(makeLamplighter(i + 1, f)) })
    const all = sys.getLamplighters()
    fuels.forEach((f, i) => { expect(all[i].fuelType).toBe(f) })
  })
  it('多个全部返回', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    ;(sys as any).lamplighters.push(makeLamplighter(2))
    expect(sys.getLamplighters()).toHaveLength(2)
  })
})
