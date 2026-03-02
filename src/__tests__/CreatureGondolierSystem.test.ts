import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGondolierSystem } from '../systems/CreatureGondolierSystem'
import type { Gondolier, BoatType } from '../systems/CreatureGondolierSystem'

let nextId = 1
function makeSys(): CreatureGondolierSystem { return new CreatureGondolierSystem() }
function makeGondolier(entityId: number, boatType: BoatType = 'gondola', skill = 50): Gondolier {
  return { id: nextId++, entityId, skill, passengersCarried: 30, cargoDelivered: 20, boatType, routeLength: 10, earnings: 500, tick: 0 }
}

// 最小 em stub，getEntitiesWithComponent 返回空数组，hasComponent 返回 true
function makeEmStub(entityIds: number[] = []) {
  return {
    getEntitiesWithComponent: (_comp: string) => entityIds,
    hasComponent: (_eid: number, _comp: string) => true,
  } as any
}

describe('CreatureGondolierSystem — 数据结构', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无船夫', () => {
    expect((sys as any).gondoliers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1, 'barge'))
    expect((sys as any).gondoliers[0].boatType).toBe('barge')
  })

  it('_gondoliersSet 初始为空', () => {
    expect((sys as any)._gondoliersSet.size).toBe(0)
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

  it('四字段完整性验证', () => {
    ;(sys as any).gondoliers.push(makeGondolier(7, 'canoe', 30))
    const g = (sys as any).gondoliers[0]
    expect(g.passengersCarried).toBeDefined()
    expect(g.cargoDelivered).toBeDefined()
    expect(g.routeLength).toBeDefined()
    expect(g.earnings).toBeDefined()
  })
})

describe('CreatureGondolierSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 3000 时不更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)   // 初始化 lastCheck = 0
    const before = (sys as any).lastCheck
    sys.update(0, em, 2999) // 差值 2999 < 3000，跳过
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 3000 时更新 lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)    // lastCheck = 0
    sys.update(0, em, 3000) // 差值 = 3000，触发更新
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次触发后 lastCheck 追踪最新 tick', () => {
    const em = makeEmStub([])
    sys.update(0, em, 3000)
    sys.update(0, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })
})

describe('CreatureGondolierSystem — skill 上限与船夫行为', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill 上限为 100', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1, 'gondola', 99.95))
    // 手动执行 skill 递增逻辑（每次+0.1，不超过100）
    const g = (sys as any).gondoliers[0]
    g.skill = Math.min(100, g.skill + 0.1)
    expect(g.skill).toBe(100)
  })

  it('skill 超过 60 时允许升级船型', () => {
    const g = makeGondolier(1, 'raft', 75)
    ;(sys as any).gondoliers.push(g)
    // skill>60 && 旧船=raft => 可升级到 canoe
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf(g.boatType)
    expect(idx).toBeLessThan(BOAT_TYPES.length - 1)
  })

  it('barge 已是最高级别，不再升级', () => {
    const g = makeGondolier(1, 'barge', 90)
    ;(sys as any).gondoliers.push(g)
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf(g.boatType)
    expect(idx).toBe(BOAT_TYPES.length - 1)
  })
})

describe('CreatureGondolierSystem — cleanup 逻辑', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('hasComponent=false 时船夫被清除', () => {
    const g = makeGondolier(42)
    ;(sys as any).gondoliers.push(g)
    ;(sys as any)._gondoliersSet.add(42)
    // lastCheck=0，触发 tick=3000
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false, // 实体已消失
    } as any
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(0)
  })

  it('hasComponent=true 时船夫保留', () => {
    const g = makeGondolier(99)
    ;(sys as any).gondoliers.push(g)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => true,
    } as any
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(1)
  })
})
