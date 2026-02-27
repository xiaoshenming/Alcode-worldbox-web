import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDyersSystem } from '../systems/CreatureDyersSystem'
import type { Dyer, DyeSource } from '../systems/CreatureDyersSystem'

let nextId = 1
function makeSys(): CreatureDyersSystem { return new CreatureDyersSystem() }
function makeMaker(entityId: number, dyeSource: DyeSource = 'plant'): Dyer {
  return { id: nextId++, entityId, skill: 30, batchesDyed: 10, dyeSource, colorFastness: 60, reputation: 50, tick: 0 }
}

describe('CreatureDyersSystem.getMakers', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'insect'))
    expect(sys.getMakers()[0].dyeSource).toBe('insect')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种染料来源', () => {
    const sources: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    sources.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = sys.getMakers()
    sources.forEach((s, i) => { expect(all[i].dyeSource).toBe(s) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
