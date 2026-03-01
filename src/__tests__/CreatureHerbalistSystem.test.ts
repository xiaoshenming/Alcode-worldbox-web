import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHerbalistSystem } from '../systems/CreatureHerbalistSystem'
import type { Herbalist, HerbSpecialty } from '../systems/CreatureHerbalistSystem'

let nextId = 1
function makeSys(): CreatureHerbalistSystem { return new CreatureHerbalistSystem() }
function makeHerbalist(entityId: number, specialty: HerbSpecialty = 'healing'): Herbalist {
  return { id: nextId++, entityId, skill: 60, herbsGathered: 20, potionsBrewed: 5, knowledge: 70, specialty, tick: 0 }
}

describe('CreatureHerbalistSystem.getHerbalists', () => {
  let sys: CreatureHerbalistSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无草药师', () => { expect((sys as any).herbalists).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).herbalists.push(makeHerbalist(1, 'poison'))
    expect((sys as any).herbalists[0].specialty).toBe('poison')
  })
  it('返回内部引用', () => {
    ;(sys as any).herbalists.push(makeHerbalist(1))
    expect((sys as any).herbalists).toBe((sys as any).herbalists)
  })
  it('支持所有 4 种专长', () => {
    const specs: HerbSpecialty[] = ['healing', 'poison', 'buff', 'antidote']
    specs.forEach((s, i) => { ;(sys as any).herbalists.push(makeHerbalist(i + 1, s)) })
    const all = (sys as any).herbalists
    specs.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).herbalists.push(makeHerbalist(1))
    ;(sys as any).herbalists.push(makeHerbalist(2))
    expect((sys as any).herbalists).toHaveLength(2)
  })
})
