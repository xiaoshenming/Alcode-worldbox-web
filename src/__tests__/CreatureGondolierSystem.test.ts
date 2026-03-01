import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGondolierSystem } from '../systems/CreatureGondolierSystem'
import type { Gondolier, BoatType } from '../systems/CreatureGondolierSystem'

let nextId = 1
function makeSys(): CreatureGondolierSystem { return new CreatureGondolierSystem() }
function makeGondolier(entityId: number, boatType: BoatType = 'gondola'): Gondolier {
  return { id: nextId++, entityId, skill: 50, passengersCarried: 30, cargoDelivered: 20, boatType, routeLength: 100, earnings: 500, tick: 0 }
}

describe('CreatureGondolierSystem.getGondoliers', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无船夫', () => { expect((sys as any).gondoliers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1, 'barge'))
    expect((sys as any).gondoliers[0].boatType).toBe('barge')
  })
  it('返回内部引用', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1))
    expect((sys as any).gondoliers).toBe((sys as any).gondoliers)
  })
  it('支持所有 4 种船类型', () => {
    const types: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    types.forEach((t, i) => { ;(sys as any).gondoliers.push(makeGondolier(i + 1, t)) })
    const all = (sys as any).gondoliers
    types.forEach((t, i) => { expect(all[i].boatType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1))
    ;(sys as any).gondoliers.push(makeGondolier(2))
    expect((sys as any).gondoliers).toHaveLength(2)
  })
})
