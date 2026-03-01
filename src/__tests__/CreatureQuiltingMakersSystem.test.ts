import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureQuiltingMakersSystem } from '../systems/CreatureQuiltingMakersSystem'
import type { QuiltingMaker, QuiltType } from '../systems/CreatureQuiltingMakersSystem'

let nextId = 1
function makeSys(): CreatureQuiltingMakersSystem { return new CreatureQuiltingMakersSystem() }
function makeMaker(entityId: number, type: QuiltType = 'patchwork'): QuiltingMaker {
  return { id: nextId++, entityId, skill: 70, quiltsMade: 15, quiltType: type, stitchDensity: 60, reputation: 45, tick: 0 }
}

describe('CreatureQuiltingMakersSystem.getMakers', () => {
  let sys: CreatureQuiltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缝被工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'trapunto'))
    expect((sys as any).makers[0].quiltType).toBe('trapunto')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种缝被类型', () => {
    const types: QuiltType[] = ['patchwork', 'applique_quilt', 'wholecloth', 'trapunto']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].quiltType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
