import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCombMakersSystem } from '../systems/CreatureCombMakersSystem'
import type { CombMaker, CombMaterial } from '../systems/CreatureCombMakersSystem'

let nextId = 1
function makeSys(): CreatureCombMakersSystem { return new CreatureCombMakersSystem() }
function makeMaker(entityId: number, material: CombMaterial = 'bone'): CombMaker {
  return { id: nextId++, entityId, skill: 30, combsMade: 10, material, teethFineness: 60, reputation: 50, tick: 0 }
}

describe('CreatureCombMakersSystem.getMakers', () => {
  let sys: CreatureCombMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梳子制作者', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'ivory'))
    expect(sys.getMakers()[0].material).toBe('ivory')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种材料', () => {
    const materials: CombMaterial[] = ['bone', 'horn', 'wood', 'ivory']
    materials.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = sys.getMakers()
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
