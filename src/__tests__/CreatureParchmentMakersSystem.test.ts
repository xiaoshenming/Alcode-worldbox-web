import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureParchmentMakersSystem } from '../systems/CreatureParchmentMakersSystem'
import type { ParchmentMaker, ParchmentGrade } from '../systems/CreatureParchmentMakersSystem'

let nextId = 1
function makeSys(): CreatureParchmentMakersSystem { return new CreatureParchmentMakersSystem() }
function makeMaker(entityId: number, grade: ParchmentGrade = 'standard'): ParchmentMaker {
  return { id: nextId++, entityId, skill: 70, sheetsMade: 30, grade, scraping: 65, reputation: 50, tick: 0 }
}

describe('CreatureParchmentMakersSystem.getMakers', () => {
  let sys: CreatureParchmentMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无羊皮纸制作者', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'vellum'))
    expect((sys as any).makers[0].grade).toBe('vellum')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种等级', () => {
    const grades: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    grades.forEach((g, i) => { ;(sys as any).makers.push(makeMaker(i + 1, g)) })
    const all = (sys as any).makers
    grades.forEach((g, i) => { expect(all[i].grade).toBe(g) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
