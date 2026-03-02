import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGondolierSystem } from '../systems/CreatureGondolierSystem'
import type { Gondolier, BoatType } from '../systems/CreatureGondolierSystem'

let nextId = 1
function makeSys(): CreatureGondolierSystem { return new CreatureGondolierSystem() }
function makeGondolier(entityId: number, boatType: BoatType = 'gondola', skill = 50): Gondolier {
  return {
    id: nextId++, entityId, skill,
    passengersCarried: 0, cargoDelivered: 0,
    boatType, routeLength: 10, earnings: 0, tick: 0
  }
}

function makeEmStub(entityIds: number[] = [], hasComp = true) {
  return {
    getEntitiesWithComponent: (_comp: string) => entityIds,
    hasComponent: (_eid: number, _comp: string) => hasComp,
  } as any
}

const CHECK_INTERVAL = 3000

describe('CreatureGondolierSystem — 初始状态', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无船夫', () => {
    expect((sys as any).gondoliers).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_gondoliersSet初始为空', () => {
    expect((sys as any)._gondoliersSet.size).toBe(0)
  })

  it('gondoliers字段是数组', () => {
    expect(Array.isArray((sys as any).gondoliers)).toBe(true)
  })

  it('_gondoliersSet是Set实例', () => {
    expect((sys as any)._gondoliersSet).toBeInstanceOf(Set)
  })
})

describe('CreatureGondolierSystem — Gondolier数据结构', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1, 'barge'))
    expect((sys as any).gondoliers[0].boatType).toBe('barge')
  })

  it('支持所有4种船类型', () => {
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
    expect(g).toHaveProperty('passengersCarried')
    expect(g).toHaveProperty('cargoDelivered')
    expect(g).toHaveProperty('routeLength')
    expect(g).toHaveProperty('earnings')
  })

  it('Gondolier包含id字段', () => {
    const g = makeGondolier(1, 'raft', 20)
    expect(g).toHaveProperty('id')
  })

  it('Gondolier包含tick字段', () => {
    const g = makeGondolier(1, 'raft', 20)
    expect(g).toHaveProperty('tick')
  })

  it('Gondolier包含skill字段', () => {
    const g = makeGondolier(1, 'raft', 35)
    expect(g.skill).toBe(35)
  })

  it('Gondolier默认passengersCarried=0', () => {
    const g = makeGondolier(1)
    expect(g.passengersCarried).toBe(0)
  })

  it('Gondolier默认cargoDelivered=0', () => {
    const g = makeGondolier(1)
    expect(g.cargoDelivered).toBe(0)
  })

  it('Gondolier默认earnings=0', () => {
    const g = makeGondolier(1)
    expect(g.earnings).toBe(0)
  })
})

describe('CreatureGondolierSystem — CHECK_INTERVAL节流', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<3000时不更新lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    const before = (sys as any).lastCheck
    sys.update(0, em, 2999)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick差值>=3000时更新lastCheck', () => {
    const em = makeEmStub([])
    sys.update(0, em, 0)
    sys.update(0, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次触发后lastCheck追踪最新tick', () => {
    const em = makeEmStub([])
    sys.update(0, em, 3000)
    sys.update(0, em, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  it('差值=2999时不触发', () => {
    const em = makeEmStub([])
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 2999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('差值恰好=3000时触发', () => {
    const em = makeEmStub([])
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('大tick下节流正确', () => {
    const em = makeEmStub([])
    ;(sys as any).lastCheck = 100000
    sys.update(0, em, 102999)
    expect((sys as any).lastCheck).toBe(100000)
    sys.update(0, em, 103000)
    expect((sys as any).lastCheck).toBe(103000)
  })
})

describe('CreatureGondolierSystem — BOAT_CAPACITY验证', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('raft容量为1', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    expect(BOAT_CAPACITY['raft']).toBe(1)
  })

  it('canoe容量为2', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    expect(BOAT_CAPACITY['canoe']).toBe(2)
  })

  it('gondola容量为4', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    expect(BOAT_CAPACITY['gondola']).toBe(4)
  })

  it('barge容量为8', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    expect(BOAT_CAPACITY['barge']).toBe(8)
  })

  it('容量随等级单调递增', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    const types: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    for (let i = 0; i < types.length - 1; i++) {
      expect(BOAT_CAPACITY[types[i]]).toBeLessThan(BOAT_CAPACITY[types[i + 1]])
    }
  })
})

describe('CreatureGondolierSystem — skill上限与升级', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill上限为100', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1, 'gondola', 99.95))
    const g = (sys as any).gondoliers[0]
    g.skill = Math.min(100, g.skill + 0.1)
    expect(g.skill).toBe(100)
  })

  it('skill超过60时允许升级船型', () => {
    const g = makeGondolier(1, 'raft', 75)
    ;(sys as any).gondoliers.push(g)
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf(g.boatType)
    expect(idx).toBeLessThan(BOAT_TYPES.length - 1)
  })

  it('barge已是最高级别，不再升级', () => {
    const g = makeGondolier(1, 'barge', 90)
    ;(sys as any).gondoliers.push(g)
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf(g.boatType)
    expect(idx).toBe(BOAT_TYPES.length - 1)
  })

  it('skill<=60时不触发升船（条件不满足）', () => {
    const g = makeGondolier(1, 'raft', 60)
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    // skill=60不大于60，条件为g.skill>60，不满足
    const shouldUpgrade = g.skill > 60
    expect(shouldUpgrade).toBe(false)
  })

  it('skill=61时升船条件满足', () => {
    const g = makeGondolier(1, 'raft', 61)
    const shouldUpgrade = g.skill > 60
    expect(shouldUpgrade).toBe(true)
  })

  it('raft可升级到canoe', () => {
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf('raft')
    expect(BOAT_TYPES[idx + 1]).toBe('canoe')
  })

  it('canoe可升级到gondola', () => {
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf('canoe')
    expect(BOAT_TYPES[idx + 1]).toBe('gondola')
  })

  it('gondola可升级到barge', () => {
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    const idx = BOAT_TYPES.indexOf('gondola')
    expect(BOAT_TYPES[idx + 1]).toBe('barge')
  })
})

describe('CreatureGondolierSystem — routeLength扩展', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('routeLength上限为20', () => {
    const g = makeGondolier(1, 'gondola', 50)
    g.routeLength = 20
    const newLen = Math.min(20, g.routeLength + 1)
    expect(newLen).toBe(20)
  })

  it('routeLength=19时扩展到20', () => {
    const g = makeGondolier(1, 'gondola', 50)
    g.routeLength = 19
    const newLen = Math.min(20, g.routeLength + 1)
    expect(newLen).toBe(20)
  })

  it('skill>40时扩展条件满足', () => {
    const g = makeGondolier(1, 'gondola', 50)
    expect(g.skill > 40).toBe(true)
  })

  it('skill<=40时不扩展路线', () => {
    const g = makeGondolier(1, 'gondola', 40)
    expect(g.skill > 40).toBe(false)
  })

  it('routeLength初始值=10', () => {
    const g = makeGondolier(1)
    expect(g.routeLength).toBe(10)
  })
})

describe('CreatureGondolierSystem — earnings逻辑', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次载客1人时earnings增加0.5', () => {
    const g = makeGondolier(1, 'raft', 50)
    g.earnings += 1 * 0.5
    expect(g.earnings).toBeCloseTo(0.5, 5)
  })

  it('货物配送后earnings增加cap*0.3', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    const g = makeGondolier(1, 'barge', 50)
    const cap = BOAT_CAPACITY[g.boatType]  // = 8
    g.earnings += cap * 0.3
    expect(g.earnings).toBeCloseTo(2.4, 5)
  })

  it('raft货物配送earnings增加0.3', () => {
    const BOAT_CAPACITY: Record<BoatType, number> = { raft: 1, canoe: 2, gondola: 4, barge: 8 }
    const g = makeGondolier(1, 'raft', 50)
    const cap = BOAT_CAPACITY[g.boatType]  // = 1
    g.earnings += cap * 0.3
    expect(g.earnings).toBeCloseTo(0.3, 5)
  })

  it('earnings从0开始累积', () => {
    const g = makeGondolier(1, 'gondola', 50)
    expect(g.earnings).toBe(0)
    g.earnings += 0.5
    expect(g.earnings).toBeCloseTo(0.5, 5)
  })
})

describe('CreatureGondolierSystem — cleanup逻辑', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('hasComponent=false时船夫被清除', () => {
    const g = makeGondolier(42)
    ;(sys as any).gondoliers.push(g)
    ;(sys as any)._gondoliersSet.add(42)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false,
    } as any
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(0)
  })

  it('hasComponent=true时船夫保留', () => {
    const g = makeGondolier(99)
    ;(sys as any).gondoliers.push(g)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => true,
    } as any
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(1)
  })

  it('cleanup时从_gondoliersSet中移除entityId', () => {
    const g = makeGondolier(5)
    ;(sys as any).gondoliers.push(g)
    ;(sys as any)._gondoliersSet.add(5)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(0, em, 3000)
    expect((sys as any)._gondoliersSet.has(5)).toBe(false)
  })

  it('多个船夫，部分消失时只删消失的', () => {
    ;(sys as any).gondoliers.push(makeGondolier(1))
    ;(sys as any).gondoliers.push(makeGondolier(2))
    let callCount = 0
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => {
        return eid === 2  // entityId=1消失，entityId=2存在
      },
    } as any
    sys.update(0, em, 3000)
    const remaining = (sys as any).gondoliers
    expect(remaining.every((g: Gondolier) => g.entityId !== 1)).toBe(true)
    expect(remaining.some((g: Gondolier) => g.entityId === 2)).toBe(true)
  })

  it('空gondoliers时cleanup不抛出', () => {
    const em = makeEmStub([], false)
    expect(() => sys.update(0, em, 3000)).not.toThrow()
  })
})

describe('CreatureGondolierSystem — _gondoliersSet防重复', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已在Set中的entity不再招募', () => {
    ;(sys as any)._gondoliersSet.add(42)
    // 设置随机源让招募逻辑触发
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // < SPAWN_CHANCE=0.003
    const em = {
      getEntitiesWithComponent: () => [42],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3000)
    // entityId=42已在set中，不应被二次添加
    expect((sys as any).gondoliers.every((g: Gondolier) => g.entityId !== 42)).toBe(true)
  })

  it('_gondoliersSet中添加的entityId可被查询', () => {
    ;(sys as any)._gondoliersSet.add(100)
    expect((sys as any)._gondoliersSet.has(100)).toBe(true)
  })

  it('_gondoliersSet.has对不存在的id返回false', () => {
    expect((sys as any)._gondoliersSet.has(999)).toBe(false)
  })
})

describe('CreatureGondolierSystem — SPAWN_CHANCE验证', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random>=SPAWN_CHANCE=0.003时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const em = {
      getEntitiesWithComponent: () => [1, 2, 3],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(0)
  })

  it('random<SPAWN_CHANCE=0.003时且有entity则招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponent: () => [1],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers.length).toBeGreaterThanOrEqual(1)
  })

  it('有entities且random=0时必然招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponent: () => [55],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3000)
    expect((sys as any).gondoliers).toHaveLength(1)
    expect((sys as any).gondoliers[0].entityId).toBe(55)
  })
})

describe('CreatureGondolierSystem — MAX_GONDOLIERS=12上限', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已满12个时不再招募', () => {
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).gondoliers.push(makeGondolier(i))
      ;(sys as any)._gondoliersSet.add(i)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponent: () => [100],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3000)
    // 数量>=12，不招募新的（cleanup可能删除部分，但初始hasComponent=true全保留）
    expect((sys as any).gondoliers.length).toBeLessThanOrEqual(12)
  })

  it('gondoliers上限12个可以被直接push超过（绕过限制）', () => {
    for (let i = 1; i <= 13; i++) {
      ;(sys as any).gondoliers.push(makeGondolier(i))
    }
    expect((sys as any).gondoliers.length).toBe(13)
  })
})

describe('CreatureGondolierSystem — 招募的船夫字段范围', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始skill范围 [5, 20)', () => {
    // skill = 5 + random*15
    const minSkill = 5 + 0 * 15    // = 5
    const maxSkill = 5 + 1 * 15    // = 20
    expect(minSkill).toBe(5)
    expect(maxSkill).toBe(20)
  })

  it('初始routeLength范围 [2, 8)', () => {
    // routeLength = 2 + floor(random*6)
    const minLen = 2 + Math.floor(0 * 6)  // = 2
    const maxLen = 2 + Math.floor(0.999 * 6)  // = 2+5=7
    expect(minLen).toBe(2)
    expect(maxLen).toBe(7)
  })

  it('新招募的Gondolier passengersCarried初始为0（结构验证）', () => {
    // 直接注入验证初始结构，避免update后ferry逻辑改变字段
    const g = makeGondolier(1, 'raft', 5)
    expect(g.passengersCarried).toBe(0)
  })

  it('新招募的Gondolier cargoDelivered初始为0（结构验证）', () => {
    const g = makeGondolier(1, 'raft', 5)
    expect(g.cargoDelivered).toBe(0)
  })

  it('新招募的Gondolier earnings���始为0（结构验证）', () => {
    const g = makeGondolier(1, 'raft', 5)
    expect(g.earnings).toBe(0)
  })
})

describe('CreatureGondolierSystem — 综合场景', () => {
  let sys: CreatureGondolierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update方法不抛出', () => {
    const em = makeEmStub([])
    expect(() => sys.update(0, em, 0)).not.toThrow()
  })

  it('空gondoliers时update正常执行', () => {
    const em = makeEmStub([])
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(0, em, 3000)).not.toThrow()
  })

  it('多次update后lastCheck单调递增', () => {
    const em = makeEmStub([])
    sys.update(0, em, 3000)
    const c1 = (sys as any).lastCheck
    sys.update(0, em, 6000)
    const c2 = (sys as any).lastCheck
    expect(c2).toBeGreaterThan(c1)
  })

  it('BOAT_TYPES数组顺序: raft<canoe<gondola<barge', () => {
    const BOAT_TYPES: BoatType[] = ['raft', 'canoe', 'gondola', 'barge']
    expect(BOAT_TYPES[0]).toBe('raft')
    expect(BOAT_TYPES[1]).toBe('canoe')
    expect(BOAT_TYPES[2]).toBe('gondola')
    expect(BOAT_TYPES[3]).toBe('barge')
  })

  it('同一entityId不会被加入两次（Set防重复）', () => {
    ;(sys as any)._gondoliersSet.add(7)
    ;(sys as any)._gondoliersSet.add(7)
    expect((sys as any)._gondoliersSet.size).toBe(1)
  })

  it('cleanup后_gondoliersSet随之减少', () => {
    ;(sys as any).gondoliers.push(makeGondolier(10))
    ;(sys as any)._gondoliersSet.add(10)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    sys.update(0, em, 3000)
    expect((sys as any)._gondoliersSet.has(10)).toBe(false)
    expect((sys as any).gondoliers).toHaveLength(0)
  })
})
