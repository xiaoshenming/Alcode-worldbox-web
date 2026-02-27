import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureScabbardMakerSystem } from '../systems/CreatureScabbardMakerSystem'
import type { ScabbardMaker } from '../systems/CreatureScabbardMakerSystem'

let nextId = 1
function makeSys(): CreatureScabbardMakerSystem { return new CreatureScabbardMakerSystem() }
function makeMaker(entityId: number): ScabbardMaker {
  return { id: nextId++, entityId, leatherWorking: 70, woodCarving: 65, fittingPrecision: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureScabbardMakerSystem.getMakers', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刀鞘工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = sys.getMakers()[0]
    expect(m.leatherWorking).toBe(70)
    expect(m.fittingPrecision).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
