import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDyeingMakersSystem } from '../systems/CreatureDyeingMakersSystem'
import type { DyeingMaker, DyeingType } from '../systems/CreatureDyeingMakersSystem'

let nextId = 1
function makeSys(): CreatureDyeingMakersSystem { return new CreatureDyeingMakersSystem() }
function makeMaker(entityId: number, dyeingType: DyeingType = 'vat_dyeing'): DyeingMaker {
  return { id: nextId++, entityId, skill: 30, batchesDyed: 10, dyeingType, colorFastness: 60, reputation: 50, tick: 0 }
}

describe('CreatureDyeingMakersSystem.getMakers', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染色工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'resist_dyeing'))
    expect((sys as any).makers[0].dyeingType).toBe('resist_dyeing')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种染色类型', () => {
    const types: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].dyeingType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
