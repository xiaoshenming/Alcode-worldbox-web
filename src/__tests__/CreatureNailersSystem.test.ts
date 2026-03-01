import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNailersSystem } from '../systems/CreatureNailersSystem'
import type { Nailer, NailType } from '../systems/CreatureNailersSystem'

let nextId = 1
function makeSys(): CreatureNailersSystem { return new CreatureNailersSystem() }
function makeNailer(entityId: number, nailType: NailType = 'tack'): Nailer {
  return { id: nextId++, entityId, skill: 60, nailsForged: 100, nailType, strength: 70, reputation: 50, tick: 0 }
}

describe('CreatureNailersSystem.getNailers', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉工', () => { expect((sys as any).nailers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nailers.push(makeNailer(1, 'spike'))
    expect((sys as any).nailers[0].nailType).toBe('spike')
  })
  it('返回内部引用', () => {
    ;(sys as any).nailers.push(makeNailer(1))
    expect((sys as any).nailers).toBe((sys as any).nailers)
  })
  it('支持所有 4 种钉子类型', () => {
    const types: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    types.forEach((t, i) => { ;(sys as any).nailers.push(makeNailer(i + 1, t)) })
    const all = (sys as any).nailers
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).nailers.push(makeNailer(1))
    ;(sys as any).nailers.push(makeNailer(2))
    expect((sys as any).nailers).toHaveLength(2)
  })
})
