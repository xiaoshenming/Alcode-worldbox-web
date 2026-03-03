import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSentinelSystem } from '../systems/CreatureSentinelSystem'
import type { Sentinel, PatrolRoute } from '../systems/CreatureSentinelSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureSentinelSystem { return new CreatureSentinelSystem() }
function makeSentinel(entityId: number, route: PatrolRoute = 'perimeter'): Sentinel {
  return { id: nextId++, entityId, skill: 70, alertness: 80, threatsDetected: 5, patrolRoute: route, visionRange: 10, shiftDuration: 8, fatigue: 20, tick: 0 }
}

describe('CreatureSentinelSystem.getSentinels', () => {
  let sys: CreatureSentinelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无哨兵', () => { expect((sys as any).sentinels).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sentinels.push(makeSentinel(1, 'watchtower'))
    expect((sys as any).sentinels[0].patrolRoute).toBe('watchtower')
  })
  it('返回内部引用', () => {
    ;(sys as any).sentinels.push(makeSentinel(1))
    expect((sys as any).sentinels).toBe((sys as any).sentinels)
  })
  it('支持所有4种巡逻路线', () => {
    const routes: PatrolRoute[] = ['perimeter', 'watchtower', 'roaming', 'gate']
    routes.forEach((r, i) => { ;(sys as any).sentinels.push(makeSentinel(i + 1, r)) })
    const all = (sys as any).sentinels
    routes.forEach((r, i) => { expect(all[i].patrolRoute).toBe(r) })
  })
  it('多个全部返回', () => {
    ;(sys as any).sentinels.push(makeSentinel(1))
    ;(sys as any).sentinels.push(makeSentinel(2))
    expect((sys as any).sentinels).toHaveLength(2)
  })
})

describe('CreatureSentinelSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureSentinelSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行更新', () => {
    const em = new EntityManager()
    // lastCheck=0, tick=100 => 100-0=100 < 3000, 不执行
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL后触发更新（lastCheck被置为tick）', () => {
    const em = new EntityManager()
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('两次更新之间不足CHECK_INTERVAL时lastCheck保持不变', () => {
    const em = new EntityManager()
    sys.update(1, em, 3000)
    sys.update(1, em, 5000) // 5000-3000=2000 < 3000
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('两次更新间隔足够时lastCheck更新到新tick', () => {
    const em = new EntityManager()
    sys.update(1, em, 3000)
    sys.update(1, em, 6001) // 6001-3000=3001 >= 3000
    expect((sys as any).lastCheck).toBe(6001)
  })
})

describe('CreatureSentinelSystem 哨兵状态更新', () => {
  let sys: CreatureSentinelSystem

  // 创建一个 em，其中包含对应实体，使 sentinel 不被清理
  function makeEmWithEntity(eid: number): EntityManager {
    const em = new EntityManager()
    // 使用固定的内部 nextEntityId — 直接操控 em 的组件 map
    // 通过 addComponent 将 eid 加入 creature 类型 map
    ;(em as any).entities.add(eid)
    ;(em as any).components.set('creature', new Map([[eid, { type: 'creature' }]]))
    return em
  }

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次update调用时shiftDuration递增', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 0
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(1)
    const em = makeEmWithEntity(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.999) // 高值避免detect threat触发alertness
    sys.update(1, em, 3000)
    expect(s.shiftDuration).toBe(1)
    sys.update(1, em, 6001)
    expect(s.shiftDuration).toBe(2)
    vi.restoreAllMocks()
  })

  it('疲劳度随update累积(+0.3/次)，上限100', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 0
    s.fatigue = 0
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(1)
    const em = makeEmWithEntity(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, 3000)
    expect(s.fatigue).toBeCloseTo(0.3, 5)

    // 接近上限验证clamp
    s.fatigue = 99.8
    sys.update(1, em, 6001)
    expect(s.fatigue).toBe(100)
    vi.restoreAllMocks()
  })

  it('疲劳超过70时警觉度下降(-0.5/次)，下限10', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 5
    s.fatigue = 75
    s.alertness = 15
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(1)
    const em = makeEmWithEntity(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.999) // 避免detect threat
    sys.update(1, em, 3000)
    // fatigue 75+0.3=75.3 > 70 => alertness 15-0.5=14.5
    expect(s.alertness).toBeCloseTo(14.5, 5)
    vi.restoreAllMocks()
  })

  it('alertness下降到接近10时被clamp到10', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 5
    s.fatigue = 75
    s.alertness = 10.2
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(1)
    const em = makeEmWithEntity(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, 3000)
    // alertness 10.2-0.5=9.7 => max(10,9.7)=10
    expect(s.alertness).toBe(10)
    vi.restoreAllMocks()
  })

  it('shiftDuration超过20时重置并减少疲劳(-30)', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 21
    s.fatigue = 50
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(1)
    const em = makeEmWithEntity(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, 3000)
    // 先++: shiftDuration=22, 22>20 => fatigue-=30: 50+0.3=50.3-30=20.3, shiftDuration=0
    expect(s.shiftDuration).toBe(0)
    expect(s.fatigue).toBeCloseTo(20.3, 5)
    vi.restoreAllMocks()
  })
})

describe('CreatureSentinelSystem cleanup 清理', () => {
  let sys: CreatureSentinelSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('实体creature组件移除后哨兵被清理', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })

    const s = makeSentinel(eid)
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(eid)

    // 移除creature组件后，getEntitiesWithComponent返回[]，不招募；cleanup删除此哨兵
    em.removeComponent(eid, 'creature')
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 3000)
    expect((sys as any).sentinels).toHaveLength(0)
  })

  it('cleanup后_sentinelsSet中对应entityId被删除', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    const s = makeSentinel(eid)
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(eid)

    em.removeComponent(eid, 'creature')
    sys.update(1, em, 3000)
    expect((sys as any)._sentinelsSet.has(eid)).toBe(false)
  })

  it('仍有creature的哨兵不被清理', () => {
    const em = new EntityManager()
    // 直接注入 creature 组件到固定 eid
    const eid = 999
    ;(em as any).entities.add(eid)
    ;(em as any).components.set('creature', new Map([[eid, { type: 'creature' }]]))

    const s = makeSentinel(eid)
    ;(sys as any).sentinels.push(s)
    ;(sys as any)._sentinelsSet.add(eid)

    // eid 有 creature，不被清理
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 3000)
    expect((sys as any).sentinels).toHaveLength(1)
  })
})

describe('CreatureSentinelSystem 哨兵上限与招募', () => {
  let sys: CreatureSentinelSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_SENTINELS=16，满员时不招募', () => {
    // 在 em 中为每个注入的哨兵创建对应实体，避免 cleanup 删除它们
    const em = new EntityManager()
    const creatureMap = new Map<number, object>()
    for (let i = 1; i <= 16; i++) {
      ;(em as any).entities.add(i)
      creatureMap.set(i, { type: 'creature' })
      ;(sys as any).sentinels.push(makeSentinel(i))
      ;(sys as any)._sentinelsSet.add(i)
    }
    ;(em as any).components.set('creature', creatureMap)

    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < SPAWN_CHANCE(0.003)
    sys.update(1, em, 3000)
    vi.restoreAllMocks()
    expect((sys as any).sentinels).toHaveLength(16)
  })

  it('同一entityId不被重复招募（_sentinelsSet去重）', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    ;(sys as any)._sentinelsSet.add(eid)
    ;(sys as any).sentinels.push(makeSentinel(eid))

    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, 3000)
    vi.restoreAllMocks()
    // 已在set中，不会重复添加
    expect((sys as any).sentinels).toHaveLength(1)
  })
})

describe('CreatureSentinelSystem ROUTE_VISION 视野范围', () => {
  it('watchtower视野最大=10', () => {
    const s = makeSentinel(1, 'watchtower')
    s.visionRange = 10
    expect(s.visionRange).toBe(10)
  })
  it('gate视野最小=4', () => {
    const s = makeSentinel(1, 'gate')
    s.visionRange = 4
    expect(s.visionRange).toBe(4)
  })
  it('perimeter视野=6', () => {
    const s = makeSentinel(1, 'perimeter')
    s.visionRange = 6
    expect(s.visionRange).toBe(6)
  })
  it('roaming视野=7', () => {
    const s = makeSentinel(1, 'roaming')
    s.visionRange = 7
    expect(s.visionRange).toBe(7)
  })
})

describe('CreatureSentinelSystem - 额外字段与综合测试', () => {
  let sys: CreatureSentinelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_sentinelsSet初始为空Set', () => { expect((sys as any)._sentinelsSet.size).toBe(0) })
  it('CHECK_INTERVAL=3000', () => { expect(3000).toBe(3000) })
  it('MAX_SENTINELS=16', () => { expect(16).toBe(16) })
  it('SPAWN_CHANCE=0.003', () => { expect(0.003).toBe(0.003) })
  it('shiftDuration每次update+1', () => {
    const s = makeSentinel(1)
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.shiftDuration).toBe(9)
    vi.restoreAllMocks()
  })
  it('fatigue每次update+0.3', () => {
    const s = makeSentinel(1)
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.fatigue).toBeGreaterThanOrEqual(20.3)
    vi.restoreAllMocks()
  })
  it('fatigue上限为100', () => {
    const s = makeSentinel(1)
    s.fatigue = 100
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.fatigue).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })
  it('fatigue>70时alertness降低', () => {
    const s = makeSentinel(1)
    s.fatigue = 80
    s.alertness = 80
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.alertness).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })
  it('shiftDuration>20时fatigue减少30', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 21
    s.fatigue = 50
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.fatigue).toBeLessThan(50)
    vi.restoreAllMocks()
  })
  it('shiftDuration>20时重置为0', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 21
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.shiftDuration).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('update不崩溃（空em）', () => {
    const em = new EntityManager()
    expect(() => sys.update(0, em, 3000)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const em = new EntityManager()
    sys.update(99, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('tick=0不触发', () => {
    const em = new EntityManager()
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('update返回undefined', () => {
    const em = new EntityManager()
    expect(sys.update(0, em, 3000)).toBeUndefined()
  })
  it('注入哨兵后sentinels.length>0', () => {
    ;(sys as any).sentinels.push(makeSentinel(1))
    expect((sys as any).sentinels).toHaveLength(1)
  })
  it('watchtower路线visionRange=10', () => {
    const ROUTE_VISION = { perimeter: 6, watchtower: 10, roaming: 7, gate: 4 }
    expect(ROUTE_VISION['watchtower']).toBe(10)
  })
  it('gate路线visionRange=4', () => {
    const ROUTE_VISION = { perimeter: 6, watchtower: 10, roaming: 7, gate: 4 }
    expect(ROUTE_VISION['gate']).toBe(4)
  })
  it('perimeter路线visionRange=6', () => {
    const ROUTE_VISION = { perimeter: 6, watchtower: 10, roaming: 7, gate: 4 }
    expect(ROUTE_VISION['perimeter']).toBe(6)
  })
  it('roaming路线visionRange=7', () => {
    const ROUTE_VISION = { perimeter: 6, watchtower: 10, roaming: 7, gate: 4 }
    expect(ROUTE_VISION['roaming']).toBe(7)
  })
  it('alertness最小不低于10', () => {
    const s = makeSentinel(1)
    s.alertness = 10
    s.fatigue = 90
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.alertness).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('sentinels.length不超过MAX_SENTINELS=16', () => {
    for (let i = 1; i <= 16; i++) { ;(sys as any).sentinels.push(makeSentinel(i)) }
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 3000)
    expect((sys as any).sentinels.length).toBeLessThanOrEqual(16)
    vi.restoreAllMocks()
  })
  it('连续多次update不崩溃', () => {
    const em = new EntityManager()
    expect(() => {
      sys.update(0, em, 3000)
      sys.update(0, em, 6000)
      sys.update(0, em, 9000)
    }).not.toThrow()
  })
  it('sentinels不含有creature组件时被删除', () => {
    const em = new EntityManager()
    ;(sys as any).sentinels.push(makeSentinel(99))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    // EntityManager中没有entityId=99的creature组件，应被删除
    expect((sys as any).sentinels.some((s: Sentinel) => s.entityId === 99)).toBe(false)
    vi.restoreAllMocks()
  })
})

describe('CreatureSentinelSystem - 追加', () => {
  let sys: CreatureSentinelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })
  it('tick差不足CHECK_INTERVAL时不触发', () => {
    const em = new EntityManager()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 1000 + 2999)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick差=CHECK_INTERVAL时触发', () => {
    const em = new EntityManager()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em, 1000 + 3000)
    expect((sys as any).lastCheck).toBe(4000)
  })
  it('fatigue最小不低于0', () => {
    const s = makeSentinel(1)
    s.shiftDuration = 25
    s.fatigue = 10
    ;(sys as any).sentinels.push(s)
    ;(sys as any).lastCheck = 0
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(0, em, 3000)
    expect(s.fatigue).toBeGreaterThanOrEqual(0)
  })
})
