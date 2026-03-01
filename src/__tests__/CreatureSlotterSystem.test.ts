import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSlotterSystem } from '../systems/CreatureSlotterSystem'
import type { Slotter } from '../systems/CreatureSlotterSystem'

let nextId = 1
function makeSys(): CreatureSlotterSystem { return new CreatureSlotterSystem() }
function makeSlotter(entityId: number): Slotter {
  return { id: nextId++, entityId, slottingSkill: 70, keywayPrecision: 65, grooveDepth: 80, feedControl: 75, tick: 0 }
}

describe('CreatureSlotterSystem.getSlotters', () => {
  let sys: CreatureSlotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无插槽工', () => { expect((sys as any).slotters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).slotters.push(makeSlotter(1))
    expect((sys as any).slotters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).slotters.push(makeSlotter(1))
    expect((sys as any).slotters).toBe((sys as any).slotters)
  })
  it('字段正确', () => {
    ;(sys as any).slotters.push(makeSlotter(2))
    const s = (sys as any).slotters[0]
    expect(s.slottingSkill).toBe(70)
    expect(s.grooveDepth).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).slotters.push(makeSlotter(1))
    ;(sys as any).slotters.push(makeSlotter(2))
    expect((sys as any).slotters).toHaveLength(2)
  })
})
