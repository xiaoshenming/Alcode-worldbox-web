import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGrommetMakersSystem } from '../systems/CreatureGrommetMakersSystem'
import type { GrommetMaker, GrommetType } from '../systems/CreatureGrommetMakersSystem'

let nextId = 1
function makeSys(): CreatureGrommetMakersSystem { return new CreatureGrommetMakersSystem() }
function makeMaker(entityId: number, grommetType: GrommetType = 'sail'): GrommetMaker {
  return { id: nextId++, entityId, skill: 40, grommetsMade: 25, grommetType, precision: 70, reputation: 60, tick: 0 }
}

describe('CreatureGrommetMakersSystem.getMakers', () => {
  let sys: CreatureGrommetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无索眼工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'banner'))
    expect(sys.getMakers()[0].grommetType).toBe('banner')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有 4 种索眼类型', () => {
    const types: GrommetType[] = ['sail', 'tent', 'leather', 'banner']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].grommetType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
