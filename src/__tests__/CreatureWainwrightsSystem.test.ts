import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWainwrightsSystem } from '../systems/CreatureWainwrightsSystem'
import type { Wainwright, WagonType } from '../systems/CreatureWainwrightsSystem'

let nextId = 1
function makeSys(): CreatureWainwrightsSystem { return new CreatureWainwrightsSystem() }
function makeMaker(entityId: number, type: WagonType = 'handcart'): Wainwright {
  return { id: nextId++, entityId, skill: 70, wagonsBuilt: 12, wagonType: type, durability: 65, reputation: 45, tick: 0 }
}

describe('CreatureWainwrightsSystem.getWainwrights', () => {
  let sys: CreatureWainwrightsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车辆工匠', () => { expect(sys.getWainwrights()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wainwrights.push(makeMaker(1, 'wagon'))
    expect(sys.getWainwrights()[0].wagonType).toBe('wagon')
  })
  it('返回内部引用', () => {
    ;(sys as any).wainwrights.push(makeMaker(1))
    expect(sys.getWainwrights()).toBe((sys as any).wainwrights)
  })
  it('支持所有4种车辆类型', () => {
    const types: WagonType[] = ['handcart', 'oxcart', 'wagon', 'chariot']
    types.forEach((t, i) => { ;(sys as any).wainwrights.push(makeMaker(i + 1, t)) })
    const all = sys.getWainwrights()
    types.forEach((t, i) => { expect(all[i].wagonType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).wainwrights.push(makeMaker(1))
    ;(sys as any).wainwrights.push(makeMaker(2))
    expect(sys.getWainwrights()).toHaveLength(2)
  })
})
