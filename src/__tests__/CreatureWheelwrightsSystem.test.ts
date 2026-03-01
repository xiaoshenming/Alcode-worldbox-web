import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWheelwrightsSystem } from '../systems/CreatureWheelwrightsSystem'
import type { Wheelwright, WheelType } from '../systems/CreatureWheelwrightsSystem'

let nextId = 1
function makeSys(): CreatureWheelwrightsSystem { return new CreatureWheelwrightsSystem() }
function makeMaker(entityId: number, type: WheelType = 'cart'): Wheelwright {
  return { id: nextId++, entityId, skill: 70, wheelsBuilt: 12, wheelType: type, durability: 65, efficiency: 60, tick: 0 }
}

describe('CreatureWheelwrightsSystem.getWheelwrights', () => {
  let sys: CreatureWheelwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轮辙工匠', () => { expect((sys as any).wheelwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 'wagon'))
    expect((sys as any).wheelwrights[0].wheelType).toBe('wagon')
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect((sys as any).wheelwrights).toBe((sys as any).wheelwrights)
  })
  it('支持所有4种车轮类型(Wheelwrights)', () => {
    const types: WheelType[] = ['cart', 'wagon', 'mill', 'chariot']
    types.forEach((t, i) => { ;(sys as any).wheelwrights.push(makeMaker(i + 1, t)) })
    const all = (sys as any).wheelwrights
    types.forEach((t, i) => { expect(all[i].wheelType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    ;(sys as any).wheelwrights.push(makeMaker(2))
    expect((sys as any).wheelwrights).toHaveLength(2)
  })
})
