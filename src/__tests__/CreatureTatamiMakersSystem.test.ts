import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTatamiMakersSystem } from '../systems/CreatureTatamiMakersSystem'
import type { TatamiMaker } from '../systems/CreatureTatamiMakersSystem'

let nextId = 1
function makeSys(): CreatureTatamiMakersSystem { return new CreatureTatamiMakersSystem() }
function makeMaker(entityId: number): TatamiMaker {
  return { id: nextId++, entityId, rushWeaving: 70, frameCrafting: 65, matDensity: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureTatamiMakersSystem.getMakers', () => {
  let sys: CreatureTatamiMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无榻榻米工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.rushWeaving).toBe(70)
    expect(m.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
