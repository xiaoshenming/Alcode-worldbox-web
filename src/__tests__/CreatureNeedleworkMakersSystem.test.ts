import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNeedleworkMakersSystem } from '../systems/CreatureNeedleworkMakersSystem'
import type { NeedleworkMaker } from '../systems/CreatureNeedleworkMakersSystem'

let nextId = 1
function makeSys(): CreatureNeedleworkMakersSystem { return new CreatureNeedleworkMakersSystem() }
function makeMaker(entityId: number): NeedleworkMaker {
  return { id: nextId++, entityId, stitchPrecision: 70, threadSelection: 65, designComplexity: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureNeedleworkMakersSystem.getMakers', () => {
  let sys: CreatureNeedleworkMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刺绣师', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(3))
    const m = sys.getMakers()[0]
    expect(m.stitchPrecision).toBe(70)
    expect(m.designComplexity).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
