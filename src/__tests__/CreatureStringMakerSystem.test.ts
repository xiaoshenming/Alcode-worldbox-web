import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureStringMakerSystem } from '../systems/CreatureStringMakerSystem'
import type { StringMaker } from '../systems/CreatureStringMakerSystem'

let nextId = 1
function makeSys(): CreatureStringMakerSystem { return new CreatureStringMakerSystem() }
function makeMaker(entityId: number): StringMaker {
  return { id: nextId++, entityId, fiberTwisting: 70, cordStrength: 65, lengthControl: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureStringMakerSystem.getStringMakers', () => {
  let sys: CreatureStringMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无弦线工', () => { expect(sys.getStringMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    expect(sys.getStringMakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    expect(sys.getStringMakers()).toBe((sys as any).stringMakers)
  })
  it('字段正确', () => {
    ;(sys as any).stringMakers.push(makeMaker(2))
    const m = sys.getStringMakers()[0]
    expect(m.fiberTwisting).toBe(70)
    expect(m.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).stringMakers.push(makeMaker(1))
    ;(sys as any).stringMakers.push(makeMaker(2))
    expect(sys.getStringMakers()).toHaveLength(2)
  })
})
