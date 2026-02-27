import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWiredrawerSystem } from '../systems/CreatureWiredrawerSystem'
import type { Wiredrawer } from '../systems/CreatureWiredrawerSystem'

let nextId = 1
function makeSys(): CreatureWiredrawerSystem { return new CreatureWiredrawerSystem() }
function makeWiredrawer(entityId: number): Wiredrawer {
  return { id: nextId++, entityId, metalDrawing: 70, dieWork: 65, gaugeControl: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureWiredrawerSystem.getWiredrawers', () => {
  let sys: CreatureWiredrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无拔丝工', () => { expect(sys.getWiredrawers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect(sys.getWiredrawers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    expect(sys.getWiredrawers()).toBe((sys as any).wiredrawers)
  })
  it('字段正确', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(2))
    const w = sys.getWiredrawers()[0]
    expect(w.metalDrawing).toBe(70)
    expect(w.gaugeControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).wiredrawers.push(makeWiredrawer(1))
    ;(sys as any).wiredrawers.push(makeWiredrawer(2))
    expect(sys.getWiredrawers()).toHaveLength(2)
  })
})
