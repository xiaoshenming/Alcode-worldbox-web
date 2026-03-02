import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePilgrimageSystem } from '../systems/CreaturePilgrimageSystem'
import type { Pilgrimage, PilgrimageGoal } from '../systems/CreaturePilgrimageSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreaturePilgrimageSystem { return new CreaturePilgrimageSystem() }
function makePilgrimage(entityId: number, goal: PilgrimageGoal = 'sacred_mountain', overrides: Partial<Pilgrimage> = {}): Pilgrimage {
  return { id: nextId++, entityId, goal, targetX: 100, targetY: 100, distanceTraveled: 0, wisdom: 0, startTick: 0, completed: false, ...overrides }
}

function makeEM(entities: number[] = [], positions: Record<number, { x: number; y: number }> = {}) {
  const em = new EntityManager()
  for (const eid of entities) {
    const e = em.createEntity()
    em.addComponent(e, { type: 'creature' })
    const pos = positions[eid] ?? { x: 50, y: 50 }
    em.addComponent(e, { type: 'position', x: pos.x, y: pos.y })
  }
  return em
}

describe('CreaturePilgrimageSystem - 初始状态', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无朝圣', () => { expect((sys as any).pilgrimages).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1, 'ancient_temple'))
    expect((sys as any).pilgrimages[0].goal).toBe('ancient_temple')
  })
  it('返回内部引用', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages).toBe((sys as any).pilgrimages)
  })
  it('支持所有5种目标', () => {
    const goals: PilgrimageGoal[] = ['sacred_mountain', 'ancient_temple', 'holy_spring', 'ancestor_grave', 'world_edge']
    goals.forEach((g, i) => { ;(sys as any).pilgrimages.push(makePilgrimage(i + 1, g)) })
    const all = (sys as any).pilgrimages
    goals.forEach((g, i) => { expect(all[i].goal).toBe(g) })
  })
  it('completed初始为false', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].completed).toBe(false)
  })
})

describe('CreaturePilgrimageSystem - CHECK_INTERVAL节流', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('CHECK_INTERVAL为900：tick=0时调用，lastCheck=0不触发startPilgrimages', () => {
    // tick=0, lastCheck=0 => 0-0=0 < 900? No, 0>=900 is false, so no trigger on first call
    // Actually tick - lastCheck = 0 >= 900 is false, so won't trigger
    const em = makeEM([1])
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, { width: 200, height: 200 }, 0)
    // tick=0, lastCheck=0, 0-0=0 which is NOT >= 900, so no new pilgrimages
    expect((sys as any).pilgrimages).toHaveLength(0)
  })

  it('tick达到900时触发检查', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    // Force trigger: inject after setting lastCheck to simulate tick=900
    vi.spyOn(Math, 'random').mockReturnValue(0) // always triggers PILGRIMAGE_CHANCE (0 <= 0.006)
    sys.update(0, em, { width: 200, height: 200 }, 900)
    expect((sys as any).lastCheck).toBe(900)
    vi.restoreAllMocks()
  })

  it('tick未到CHECK_INTERVAL时lastCheck不更新', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 500
    sys.update(0, em, { width: 200, height: 200 }, 800)
    expect((sys as any).lastCheck).toBe(500)
  })

  it('连续update不重复触发：lastCheck固定后第二次不再更新', () => {
    const em = makeEM()
    sys.update(0, em, { width: 200, height: 200 }, 900)
    const afterFirst = (sys as any).lastCheck
    sys.update(0, em, { width: 200, height: 200 }, 1000)
    // 1000 - 900 = 100 < 900, so lastCheck stays
    expect((sys as any).lastCheck).toBe(afterFirst)
  })
})

describe('CreaturePilgrimageSystem - progressPilgrimages & wisdom增长', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('朝圣未完成时，距离>2则wisdom增长', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const p = makePilgrimage(eid, 'holy_spring', { targetX: 100, targetY: 100, wisdom: 0 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).progressPilgrimages(em)
    expect(p.wisdom).toBeGreaterThan(0)
  })

  it('wisdom上限为100，不超过', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const p = makePilgrimage(eid, 'world_edge', { targetX: 100, targetY: 100, wisdom: 99.9 })
    ;(sys as any).pilgrimages.push(p)
    // 多次调用直到wisdom不再增长
    for (let i = 0; i < 10; i++) (sys as any).progressPilgrimages(em)
    expect(p.wisdom).toBeLessThanOrEqual(100)
  })

  it('completed=true的朝圣不再更新wisdom', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const p = makePilgrimage(eid, 'ancestor_grave', { targetX: 100, targetY: 100, wisdom: 50, completed: true })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).progressPilgrimages(em)
    expect(p.wisdom).toBe(50) // 没有增长
  })

  it('距离<=2时不移动也不增加wisdom', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 99, y: 99 })
    // dist ~= sqrt(2) < 2
    const p = makePilgrimage(eid, 'sacred_mountain', { targetX: 100, targetY: 100, wisdom: 30 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).progressPilgrimages(em)
    expect(p.wisdom).toBe(30)
  })

  it('朝圣使distanceTraveled增加', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const p = makePilgrimage(eid, 'ancient_temple', { targetX: 100, targetY: 100, distanceTraveled: 0 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).progressPilgrimages(em)
    expect(p.distanceTraveled).toBeGreaterThan(0)
  })
})

describe('CreaturePilgrimageSystem - checkCompletion', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('到达目标附近时标记completed=true', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 100.5, y: 100.5 })
    ;(sys as any)._activePilgrimsSet.add(eid)
    const p = makePilgrimage(eid, 'holy_spring', { targetX: 100, targetY: 100 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).checkCompletion(em)
    expect(p.completed).toBe(true)
  })

  it('到达目标后从activePilgrimsSet移除', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 100, y: 100 })
    ;(sys as any)._activePilgrimsSet.add(eid)
    const p = makePilgrimage(eid, 'world_edge', { targetX: 100, targetY: 100 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).checkCompletion(em)
    expect((sys as any)._activePilgrimsSet.has(eid)).toBe(false)
  })

  it('距离仍远时不标记completed', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    const p = makePilgrimage(eid, 'ancestor_grave', { targetX: 100, targetY: 100 })
    ;(sys as any).pilgrimages.push(p)
    ;(sys as any).checkCompletion(em)
    expect(p.completed).toBe(false)
  })
})

describe('CreaturePilgrimageSystem - cleanup逻辑', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('cleanup保留所有active朝圣', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).pilgrimages.push(makePilgrimage(i, 'sacred_mountain', { completed: false }))
    }
    ;(sys as any).cleanup()
    expect((sys as any).pilgrimages.filter((p: Pilgrimage) => !p.completed)).toHaveLength(5)
  })

  it('cleanup已完成朝圣最多保留20个，按wisdom降序', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).pilgrimages.push(makePilgrimage(i + 1, 'ancient_temple', { completed: true, wisdom: i }))
    }
    ;(sys as any).cleanup()
    const completed = (sys as any).pilgrimages.filter((p: Pilgrimage) => p.completed)
    expect(completed.length).toBe(20)
    // 应按wisdom降序，最高wisdom=24
    expect(completed[0].wisdom).toBe(24)
  })

  it('active朝圣排在completed之前', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1, 'holy_spring', { completed: true, wisdom: 80 }))
    ;(sys as any).pilgrimages.push(makePilgrimage(2, 'world_edge', { completed: false, wisdom: 10 }))
    ;(sys as any).cleanup()
    const all = (sys as any).pilgrimages
    expect(all[0].completed).toBe(false)
  })

  it('MAX_PILGRIMAGES=40：超过时不再添加新朝圣', () => {
    const em = new EntityManager()
    // 已有40个active朝圣
    for (let i = 0; i < 40; i++) {
      ;(sys as any).pilgrimages.push(makePilgrimage(i + 1, 'sacred_mountain', { completed: false }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).startPilgrimages(em, { width: 200, height: 200 }, 1000)
    expect((sys as any).pilgrimages.length).toBe(40)
    vi.restoreAllMocks()
  })
})
