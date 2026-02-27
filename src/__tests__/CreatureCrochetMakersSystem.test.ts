import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCrochetMakersSystem } from '../systems/CreatureCrochetMakersSystem'
import type { CrochetMaker, CrochetType } from '../systems/CreatureCrochetMakersSystem'

let nextId = 1
function makeSys(): CreatureCrochetMakersSystem { return new CreatureCrochetMakersSystem() }
function makeMaker(entityId: number, crochetType: CrochetType = 'amigurumi'): CrochetMaker {
  return { id: nextId++, entityId, skill: 30, piecesMade: 10, crochetType, loopTension: 60, reputation: 50, tick: 0 }
}

describe('CreatureCrochetMakersSystem.getMakers', () => {
  let sys: CreatureCrochetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钩针工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'irish'))
    expect(sys.getMakers()[0].crochetType).toBe('irish')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种钩针类型', () => {
    const types: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].crochetType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
