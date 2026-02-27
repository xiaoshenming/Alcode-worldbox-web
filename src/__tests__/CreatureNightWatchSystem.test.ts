import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNightWatchSystem } from '../systems/CreatureNightWatchSystem'
import type { NightWatch, WatchShift } from '../systems/CreatureNightWatchSystem'

let nextId = 1
function makeSys(): CreatureNightWatchSystem { return new CreatureNightWatchSystem() }
function makeWatch(sentryId: number, shift: WatchShift = 'midnight', threats = 2): NightWatch {
  return { id: nextId++, sentryId, shift, vigilance: 70, threatsSpotted: threats, tick: 0 }
}

describe('CreatureNightWatchSystem.getWatches', () => {
  let sys: CreatureNightWatchSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无夜哨', () => { expect(sys.getWatches()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).watches.push(makeWatch(1, 'dusk'))
    expect(sys.getWatches()[0].shift).toBe('dusk')
  })
  it('返回内部引用', () => {
    ;(sys as any).watches.push(makeWatch(1))
    expect(sys.getWatches()).toBe((sys as any).watches)
  })
  it('支持所有 3 种班次', () => {
    const shifts: WatchShift[] = ['dusk', 'midnight', 'dawn']
    shifts.forEach((s, i) => { ;(sys as any).watches.push(makeWatch(i + 1, s)) })
    const all = sys.getWatches()
    shifts.forEach((s, i) => { expect(all[i].shift).toBe(s) })
  })
})

describe('CreatureNightWatchSystem.getRecent / getTotalThreats', () => {
  let sys: CreatureNightWatchSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getRecent 返回最近 n 条', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).watches.push(makeWatch(i + 1)) }
    expect(sys.getRecent(2)).toHaveLength(2)
  })
  it('getTotalThreats 累加 threatsSpotted', () => {
    ;(sys as any).watches.push(makeWatch(1, 'dusk', 3))
    ;(sys as any).watches.push(makeWatch(2, 'dawn', 5))
    expect(sys.getTotalThreats()).toBe(8)
  })
})
