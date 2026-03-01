import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureOmenBeliefSystem } from '../systems/CreatureOmenBeliefSystem'
import type { OmenBelief, OmenType } from '../systems/CreatureOmenBeliefSystem'

let nextId = 1
function makeSys(): CreatureOmenBeliefSystem { return new CreatureOmenBeliefSystem() }
function makeOmen(entityId: number, type: OmenType = 'good_harvest'): OmenBelief {
  return { id: nextId++, entityId, type, conviction: 60, moralEffect: 10, spreadCount: 2, tick: 0 }
}

describe('CreatureOmenBeliefSystem.getBeliefs', () => {
  let sys: CreatureOmenBeliefSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无信念', () => { expect(sys.getBeliefs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getBeliefs().push(makeOmen(1, 'dark_sky'))
    expect(sys.getBeliefs()[0].type).toBe('dark_sky')
  })
  it('返回内部引用', () => {
    ;sys.getBeliefs().push(makeOmen(1))
    expect(sys.getBeliefs()).toBe(sys.getBeliefs())
  })
  it('支持所有6种预兆类型', () => {
    const types: OmenType[] = ['good_harvest', 'dark_sky', 'animal_sign', 'water_omen', 'fire_portent', 'wind_whisper']
    types.forEach((t, i) => { ;sys.getBeliefs().push(makeOmen(i + 1, t)) })
    expect(sys.getBeliefs()).toHaveLength(6)
  })
  it('多个全部返回', () => {
    ;sys.getBeliefs().push(makeOmen(1))
    ;sys.getBeliefs().push(makeOmen(2))
    expect(sys.getBeliefs()).toHaveLength(2)
  })
})
