import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureUpholsterersSystem } from '../systems/CreatureUpholsterersSystem'
import type { Upholsterer, UpholsteryMaterial } from '../systems/CreatureUpholsterersSystem'

let nextId = 1
function makeSys(): CreatureUpholsterersSystem { return new CreatureUpholsterersSystem() }
function makeMaker(entityId: number, material: UpholsteryMaterial = 'leather'): Upholsterer {
  return { id: nextId++, entityId, skill: 70, piecesUpholstered: 12, material, comfortRating: 65, reputation: 45, tick: 0 }
}

describe('CreatureUpholsterersSystem.getMakers', () => {
  let sys: CreatureUpholsterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无室内装潢工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'velvet'))
    expect((sys as any).makers[0].material).toBe('velvet')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种装潢材料', () => {
    const materials: UpholsteryMaterial[] = ['leather', 'velvet', 'silk', 'tapestry']
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
