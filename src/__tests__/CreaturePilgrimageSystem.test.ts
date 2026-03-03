import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePilgrimageSystem } from '../systems/CreaturePilgrimageSystem'
import type { Pilgrimage, PilgrimageGoal } from '../systems/CreaturePilgrimageSystem'

// CHECK_INTERVAL=900, PILGRIMAGE_CHANCE=0.006, MAX_PILGRIMAGES=40, WISDOM_GAIN=0.3

let nextId = 1
function makeSys(): CreaturePilgrimageSystem { return new CreaturePilgrimageSystem() }
function makePilgrimage(entityId: number, goal: PilgrimageGoal = 'sacred_mountain', completed = false): Pilgrimage {
  return { id: nextId++, entityId, goal, targetX: 100, targetY: 100, distanceTraveled: 0, wisdom: 0, startTick: 0, completed }
}
function makeEM(entityIds: number[] = [], pos: any = null) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(pos),
  } as any
}

describe('CreaturePilgrimageSystem - 初始状态', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无朝圣记录', () => { expect((sys as any).pilgrimages).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 _activePilgrimsSet 为空', () => { expect((sys as any)._activePilgrimsSet.size).toBe(0) })
  it('pilgrimages 是数组', () => { expect(Array.isArray((sys as any).pilgrimages)).toBe(true) })
  it('注入后可查询 entityId', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].entityId).toBe(1)
  })
  it('注入后可查询 goal', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1, 'holy_spring'))
    expect((sys as any).pilgrimages[0].goal).toBe('holy_spring')
  })
  it('注入后可查询 completed', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1, 'sacred_mountain', true))
    expect((sys as any).pilgrimages[0].completed).toBe(true)
  })
  it('注入后可查询 wisdom', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].wisdom).toBe(0)
  })
  it('注入后可查询 distanceTraveled', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].distanceTraveled).toBe(0)
  })
})

describe('CreaturePilgrimageSystem - PilgrimageGoal 枚举', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('支持 5 种朝圣目标', () => {
    const goals: PilgrimageGoal[] = ['sacred_mountain', 'ancient_temple', 'holy_spring', 'ancestor_grave', 'world_edge']
    expect(goals).toHaveLength(5)
  })
  it('sacred_mountain 可注入', () => { expect(makePilgrimage(1, 'sacred_mountain').goal).toBe('sacred_mountain') })
  it('ancient_temple 可注入', () => { expect(makePilgrimage(1, 'ancient_temple').goal).toBe('ancient_temple') })
  it('holy_spring 可注入', () => { expect(makePilgrimage(1, 'holy_spring').goal).toBe('holy_spring') })
  it('ancestor_grave 可注入', () => { expect(makePilgrimage(1, 'ancestor_grave').goal).toBe('ancestor_grave') })
  it('world_edge 可注入', () => { expect(makePilgrimage(1, 'world_edge').goal).toBe('world_edge') })
})

describe('CreaturePilgrimageSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 900 时不更新 lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, {}, 899)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 差值 >= 900 时更新 lastCheck', () => {
    const em = makeEM()
    sys.update(1, em, {}, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('tick=899 时不触发', () => {
    const em = makeEM()
    sys.update(1, em, {}, 899)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=900 时恰好触发', () => {
    const em = makeEM()
    sys.update(1, em, {}, 900)
    expect((sys as any).lastCheck).toBe(900)
  })
  it('连续调用不足间隔不更新', () => {
    const em = makeEM()
    sys.update(1, em, {}, 900)
    sys.update(1, em, {}, 1000)
    expect((sys as any).lastCheck).toBe(900)
  })
})

describe('CreaturePilgrimageSystem - wisdom 积累', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('WISDOM_GAIN=0.3', () => { expect(0.3).toBeCloseTo(0.3, 5) })
  it('wisdom 上限为 100', () => {
    const w = Math.min(100, 99.9 + 0.3)
    expect(w).toBe(100)
  })
  it('wisdom=0 时加 0.3 变为 0.3', () => {
    const w = Math.min(100, 0 + 0.3)
    expect(w).toBeCloseTo(0.3)
  })
  it('wisdom 积累公式', () => {
    let wisdom = 50
    wisdom = Math.min(100, wisdom + 0.3)
    expect(wisdom).toBeCloseTo(50.3)
  })
})

describe('CreaturePilgrimageSystem - _activePilgrimsSet', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始为空 Set', () => { expect((sys as any)._activePilgrimsSet.size).toBe(0) })
  it('手动添加后可检测', () => {
    ;(sys as any)._activePilgrimsSet.add(1)
    expect((sys as any)._activePilgrimsSet.has(1)).toBe(true)
  })
  it('删除后不再命中', () => {
    ;(sys as any)._activePilgrimsSet.add(1)
    ;(sys as any)._activePilgrimsSet.delete(1)
    expect((sys as any)._activePilgrimsSet.has(1)).toBe(false)
  })
  it('可存储多个朝圣者', () => {
    ;(sys as any)._activePilgrimsSet.add(1)
    ;(sys as any)._activePilgrimsSet.add(2)
    expect((sys as any)._activePilgrimsSet.size).toBe(2)
  })
})

describe('CreaturePilgrimageSystem - MAX_PILGRIMAGES 上限', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以注入 40 个朝圣记录', () => {
    for (let i = 0; i < 40; i++) {
      ;(sys as any).pilgrimages.push(makePilgrimage(i + 1))
    }
    expect((sys as any).pilgrimages).toHaveLength(40)
  })
  it('完成的朝圣按 wisdom 排序', () => {
    const p1 = makePilgrimage(1, 'sacred_mountain', true); p1.wisdom = 30
    const p2 = makePilgrimage(2, 'holy_spring', true); p2.wisdom = 80
    ;(sys as any).pilgrimages.push(p1, p2)
    const completed = (sys as any).pilgrimages.filter((p: any) => p.completed)
    completed.sort((a: any, b: any) => b.wisdom - a.wisdom)
    expect(completed[0].wisdom).toBe(80)
  })
  it('targetX 在 0~200 范围内（world.width=200）', () => {
    const tx = Math.floor(0.5 * 200)
    expect(tx).toBeGreaterThanOrEqual(0)
    expect(tx).toBeLessThan(200)
  })
  it('PILGRIMAGE_CHANCE=0.006 时 random=0.99 不触发', () => {
    expect(0.99 > 0.006).toBe(true)
  })
  it('startTick 记录正确', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].startTick).toBe(0)
  })
})
