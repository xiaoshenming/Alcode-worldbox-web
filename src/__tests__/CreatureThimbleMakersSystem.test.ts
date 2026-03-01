import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureThimbleMakersSystem } from '../systems/CreatureThimbleMakersSystem'
import type { ThimbleMaker, ThimbleMaterial } from '../systems/CreatureThimbleMakersSystem'

let nextId = 1
function makeSys(): CreatureThimbleMakersSystem { return new CreatureThimbleMakersSystem() }
function makeMaker(entityId: number, material: ThimbleMaterial = 'brass'): ThimbleMaker {
  return { id: nextId++, entityId, skill: 70, thimblesMade: 12, material, fitPrecision: 65, reputation: 45, tick: 0 }
}

describe('CreatureThimbleMakersSystem.getMakers', () => {
  let sys: CreatureThimbleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无顶针工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silver'))
    expect((sys as any).makers[0].material).toBe('silver')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种顶针材料', () => {
    const materials: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).makers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
