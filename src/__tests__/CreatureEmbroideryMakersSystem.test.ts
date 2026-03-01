import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEmbroideryMakersSystem } from '../systems/CreatureEmbroideryMakersSystem'
import type { EmbroideryMaker, EmbroideryType } from '../systems/CreatureEmbroideryMakersSystem'

let nextId = 1
function makeSys(): CreatureEmbroideryMakersSystem { return new CreatureEmbroideryMakersSystem() }
function makeMaker(entityId: number, embroideryType: EmbroideryType = 'cross_stitch'): EmbroideryMaker {
  return { id: nextId++, entityId, skill: 40, piecesMade: 10, embroideryType, stitchPrecision: 70, reputation: 50, tick: 0 }
}

describe('CreatureEmbroideryMakersSystem.getMakers', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刺绣工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'goldwork'))
    expect((sys as any).makers[0].embroideryType).toBe('goldwork')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种刺绣类型', () => {
    const types: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].embroideryType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
