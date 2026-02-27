import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTattingMakersSystem } from '../systems/CreatureTattingMakersSystem'
import type { TattingMaker, TattingStyle } from '../systems/CreatureTattingMakersSystem'

let nextId = 1
function makeSys(): CreatureTattingMakersSystem { return new CreatureTattingMakersSystem() }
function makeMaker(entityId: number, style: TattingStyle = 'needle'): TattingMaker {
  return { id: nextId++, entityId, skill: 70, piecesMade: 12, style, delicacy: 65, reputation: 45, tick: 0 }
}

describe('CreatureTattingMakersSystem.getMakers', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梭织工匠', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'shuttle'))
    expect(sys.getMakers()[0].style).toBe('shuttle')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种梭织风格', () => {
    const styles: TattingStyle[] = ['needle', 'shuttle', 'cro', 'frivolite']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = sys.getMakers()
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
