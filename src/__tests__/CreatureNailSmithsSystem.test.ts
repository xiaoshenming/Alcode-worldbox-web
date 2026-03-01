import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNailSmithsSystem } from '../systems/CreatureNailSmithsSystem'
import type { NailSmith, NailType } from '../systems/CreatureNailSmithsSystem'

let nextId = 1
function makeSys(): CreatureNailSmithsSystem { return new CreatureNailSmithsSystem() }
function makeMaker(entityId: number, nailType: NailType = 'wrought'): NailSmith {
  return { id: nextId++, entityId, skill: 60, nailsForged: 200, nailType, strengthRating: 70, reputation: 50, tick: 0 }
}

describe('CreatureNailSmithsSystem.getMakers', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉铁匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'horseshoe'))
    expect((sys as any).makers[0].nailType).toBe('horseshoe')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种钉子类型', () => {
    const types: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
