import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWheelersSystem } from '../systems/CreatureWheelersSystem'
import type { Wheeler, WheelType } from '../systems/CreatureWheelersSystem'

let nextId = 1
function makeSys(): CreatureWheelersSystem { return new CreatureWheelersSystem() }
function makeWheeler(entityId: number, type: WheelType = 'cart'): Wheeler {
  return { id: nextId++, entityId, skill: 70, wheelsBuilt: 12, wheelType: type, balance: 65, reputation: 45, tick: 0 }
}

describe('CreatureWheelersSystem.getWheelers', () => {
  let sys: CreatureWheelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车轮工', () => { expect((sys as any).wheelers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelers.push(makeWheeler(1, 'mill'))
    expect((sys as any).wheelers[0].wheelType).toBe('mill')
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelers.push(makeWheeler(1))
    expect((sys as any).wheelers).toBe((sys as any).wheelers)
  })
  it('支持所有4种车轮类型', () => {
    const types: WheelType[] = ['cart', 'mill', 'spinning', 'gear']
    types.forEach((t, i) => { ;(sys as any).wheelers.push(makeWheeler(i + 1, t)) })
    const all = (sys as any).wheelers
    types.forEach((t, i) => { expect(all[i].wheelType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelers.push(makeWheeler(1))
    ;(sys as any).wheelers.push(makeWheeler(2))
    expect((sys as any).wheelers).toHaveLength(2)
  })
})
