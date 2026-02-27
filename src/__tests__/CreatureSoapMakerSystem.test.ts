import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSoapMakerSystem } from '../systems/CreatureSoapMakerSystem'
import type { SoapMaker, SoapRecipe } from '../systems/CreatureSoapMakerSystem'

let nextId = 1
function makeSys(): CreatureSoapMakerSystem { return new CreatureSoapMakerSystem() }
function makeMaker(entityId: number, recipe: SoapRecipe = 'tallow'): SoapMaker {
  return { id: nextId++, entityId, skill: 70, soapsMade: 15, currentBatch: 5, quality: 65, recipe, tick: 0 }
}

describe('CreatureSoapMakerSystem.getMakers', () => {
  let sys: CreatureSoapMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无肥皂工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'herbal'))
    expect(sys.getMakers()[0].recipe).toBe('herbal')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种配方', () => {
    const recipes: SoapRecipe[] = ['tallow', 'olive', 'lye', 'herbal']
    recipes.forEach((r, i) => { ;(sys as any).makers.push(makeMaker(i + 1, r)) })
    const all = sys.getMakers()
    recipes.forEach((r, i) => { expect(all[i].recipe).toBe(r) })
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = sys.getMakers()[0]
    expect(m.soapsMade).toBe(15)
    expect(m.quality).toBe(65)
  })
})
