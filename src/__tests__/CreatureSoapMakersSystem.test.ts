import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSoapMakersSystem } from '../systems/CreatureSoapMakersSystem'
import type { SoapMaker, SoapType } from '../systems/CreatureSoapMakersSystem'

let nextId = 1
function makeSys(): CreatureSoapMakersSystem { return new CreatureSoapMakersSystem() }
function makeMaker(entityId: number, type: SoapType = 'tallow'): SoapMaker {
  return { id: nextId++, entityId, skill: 70, batchesMade: 15, soapType: type, purity: 65, reputation: 45, tick: 0 }
}

describe('CreatureSoapMakersSystem.getMakers', () => {
  let sys: CreatureSoapMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无肥皂工匠', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'olive'))
    expect(sys.getMakers()[0].soapType).toBe('olive')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种Soap类型', () => {
    const types: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].soapType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
