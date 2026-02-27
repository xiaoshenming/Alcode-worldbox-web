import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWheelwrightSystem } from '../systems/CreatureWheelwrightSystem'
import type { Wheelwright } from '../systems/CreatureWheelwrightSystem'

let nextId = 1
function makeSys(): CreatureWheelwrightSystem { return new CreatureWheelwrightSystem() }
function makeMaker(entityId: number): Wheelwright {
  return { id: nextId++, entityId, woodBending: 70, spokeFitting: 65, rimShaping: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureWheelwrightSystem.getWheelwrights', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车轮工匠', () => { expect(sys.getWheelwrights()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect(sys.getWheelwrights()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect(sys.getWheelwrights()).toBe((sys as any).wheelwrights)
  })
  it('字段正确', () => {
    ;(sys as any).wheelwrights.push(makeMaker(2))
    const w = sys.getWheelwrights()[0]
    expect(w.woodBending).toBe(70)
    expect(w.rimShaping).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    ;(sys as any).wheelwrights.push(makeMaker(2))
    expect(sys.getWheelwrights()).toHaveLength(2)
  })
})
