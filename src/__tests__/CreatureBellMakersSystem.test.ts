import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellMakersSystem } from '../systems/CreatureBellMakersSystem'
import type { BellMaker, BellType } from '../systems/CreatureBellMakersSystem'

let nextId = 1
function makeSys(): CreatureBellMakersSystem { return new CreatureBellMakersSystem() }
function makeMaker(entityId: number, bellType: BellType = 'hand'): BellMaker {
  return { id: nextId++, entityId, skill: 30, bellsCast: 5, bellType, toneQuality: 40, reputation: 35, tick: 0 }
}

describe('CreatureBellMakersSystem.getMakers', () => {
  let sys: CreatureBellMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸钟师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'church'))
    expect(sys.getMakers()[0].bellType).toBe('church')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种铃铛类型', () => {
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].bellType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'carillon')
    m.skill = 80; m.bellsCast = 20; m.toneQuality = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.skill).toBe(80)
    expect(r.bellsCast).toBe(20)
    expect(r.toneQuality).toBe(90)
    expect(r.reputation).toBe(85)
  })
})
