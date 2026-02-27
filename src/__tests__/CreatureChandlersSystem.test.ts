import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChandlersSystem } from '../systems/CreatureChandlersSystem'
import type { Chandler, WaxType } from '../systems/CreatureChandlersSystem'

let nextId = 1
function makeSys(): CreatureChandlersSystem { return new CreatureChandlersSystem() }
function makeMaker(entityId: number, waxType: WaxType = 'tallow'): Chandler {
  return { id: nextId++, entityId, skill: 30, candlesMade: 10, waxType, burnQuality: 60, reputation: 50, tick: 0 }
}

describe('CreatureChandlersSystem.getMakers', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蜡烛师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'beeswax'))
    expect(sys.getMakers()[0].waxType).toBe('beeswax')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种蜡类型', () => {
    const types: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].waxType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
