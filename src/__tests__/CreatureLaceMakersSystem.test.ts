import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLaceMakersSystem } from '../systems/CreatureLaceMakersSystem'
import type { LaceMaker, LaceStyle } from '../systems/CreatureLaceMakersSystem'

let nextId = 1
function makeSys(): CreatureLaceMakersSystem { return new CreatureLaceMakersSystem() }
function makeMaker(entityId: number, laceStyle: LaceStyle = 'bobbin'): LaceMaker {
  return { id: nextId++, entityId, skill: 60, piecesWoven: 15, laceStyle, threadFineness: 70, reputation: 50, tick: 0 }
}

describe('CreatureLaceMakersSystem.getMakers', () => {
  let sys: CreatureLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无花边师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle'))
    expect((sys as any).makers[0].laceStyle).toBe('needle')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种花边风格', () => {
    const styles: LaceStyle[] = ['bobbin', 'needle', 'tatting', 'crochet']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].laceStyle).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
