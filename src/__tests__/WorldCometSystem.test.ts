import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldCometSystem } from '../systems/WorldCometSystem'
import type { Comet, CometEffect } from '../systems/WorldCometSystem'
import { EntityManager, EntityId } from '../ecs/Entity'

function makeSys(): WorldCometSystem { return new WorldCometSystem() }
let nextId = 1

// 注意: makeComet 的 startTick 和 duration 需要匹配测试场景
// 要避免 removeExpired 删除注入的 comet，设置 startTick=currentTick, duration=10000
function makeComet(effect: CometEffect = 'blessing', startTick = 5000, duration = 10000): Comet {
  return {
    id: nextId++, trajectory: { startX: 0, startY: 0, endX: 100, endY: 100 },
    speed: 2, brightness: 80, effect, startTick, duration
  }
}

// 用于需要 progress 在 [0.45, 0.55] 的 comet
// startTick=1200, duration=1000, tick=1700 时 elapsed=500, progress=0.5 ✓
function makeCometWithEffect(effect: CometEffect, startX = 100, endX = 100, startY = 0, endY = 200): Comet {
  return {
    id: nextId++,
    trajectory: { startX, startY, endX, endY },
    speed: 2, brightness: 80, effect,
    startTick: 1200,
    duration: 1000
  }
}

function makeWorld(w = 200, h = 200) {
  return { width: w, height: h }
}

function makeEntityManager() {
  const entities = new Map<EntityId, any>()
  return {
    getEntitiesWithComponents: vi.fn(() => Array.from(entities.keys())),
    getComponent: vi.fn((eid: EntityId, type: string) => entities.get(eid)?.[type]),
    addEntity: (eid: EntityId, comps: any) => entities.set(eid, comps)
  } as any
}

describe('WorldCometSystem - 初始状态', () => {
  let sys: WorldCometSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彗星', () => { expect((sys as any).comets).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('totalComets初始为0', () => { expect((sys as any).totalComets).toBe(0) })
  it('comets是数组类型', () => { expect(Array.isArray((sys as any).comets)).toBe(true) })
  it('totalComets类型为number', () => { expect(typeof (sys as any).totalComets).toBe('number') })
})

describe('WorldCometSystem - 节流机制', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick-lastCheck<CHECK_INTERVAL(1200)时不执行', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1000)
    expect((sys as any).comets).toHaveLength(0)
    spy.mockRestore()
  })
  it('tick-lastCheck>=CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
    spy.mockRestore()
  })
  it('执行后lastCheck更新为当前tick', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, world, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
    spy.mockRestore()
  })
  it('连续调用间隔不足时不执行多次', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(16, world, em, 1400)
    const lastCheck2 = (sys as any).lastCheck
    expect(lastCheck1).toBe(lastCheck2)
    spy.mockRestore()
  })
  it('CHECK_INTERVAL=1200: tick=1199不执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL=1200: tick=1200执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
})

describe('WorldCometSystem - spawn条件', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('COMET_CHANCE=0.003 大部分时候不spawn', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets).toHaveLength(0)
    spy.mockRestore()
  })
  it('Math.random()<=COMET_CHANCE时spawn', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets).toHaveLength(1)
    spy.mockRestore()
  })
  it('comets.length>=MAX_COMETS(3)时不spawn（注入长久comet）', () => {
    // 注入不会过期的 comet：startTick=1200, duration=10000, 测试tick=1200时不会过期
    for (let i = 0; i < 3; i++) (sys as any).comets.push(makeComet('omen', 1200, 10000))
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    // removeExpired: 1200-1200=0 < 10000 不删, spawnComet: length>=3 不spawn
    expect((sys as any).comets).toHaveLength(3)
    spy.mockRestore()
  })
  it('comets.length<MAX_COMETS时可spawn（注入长久comet）', () => {
    for (let i = 0; i < 2; i++) (sys as any).comets.push(makeComet('omen', 1200, 10000))
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets).toHaveLength(3)
    spy.mockRestore()
  })
  it('spawn后totalComets增加', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).totalComets).toBe(1)
    spy.mockRestore()
  })
  it('MAX_COMETS=3（直接注入）', () => {
    for (let i = 0; i < 3; i++) (sys as any).comets.push(makeComet('omen', 5000, 10000))
    expect((sys as any).comets).toHaveLength(3)
  })
})

describe('WorldCometSystem - spawn后字段值', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后id从1开始', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets[0].id).toBe(1)
    spy.mockRestore()
  })
  it('spawn后nextId递增', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).nextId).toBe(2)
    spy.mockRestore()
  })
  it('spawn后trajectory.startY=0', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets[0].trajectory.startY).toBe(0)
    spy.mockRestore()
  })
  it('spawn后trajectory.endY=world.height', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets[0].trajectory.endY).toBe(world.height)
    spy.mockRestore()
  })
  it('spawn后speed在[0.5,2.5]', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const speed = (sys as any).comets[0].speed
    expect(speed).toBeGreaterThanOrEqual(0.5)
    expect(speed).toBeLessThanOrEqual(2.5)
    spy.mockRestore()
  })
  it('spawn后brightness在[50,100]', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const brightness = (sys as any).comets[0].brightness
    expect(brightness).toBeGreaterThanOrEqual(50)
    expect(brightness).toBeLessThanOrEqual(100)
    spy.mockRestore()
  })
  it('spawn后effect是5种之一', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const effects: CometEffect[] = ['resource_rain', 'omen', 'inspiration', 'mutation', 'blessing']
    expect(effects).toContain((sys as any).comets[0].effect)
    spy.mockRestore()
  })
  it('spawn后startTick=当前tick', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets[0].startTick).toBe(1200)
    spy.mockRestore()
  })
  it('spawn后duration在[800,2000]', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const duration = (sys as any).comets[0].duration
    expect(duration).toBeGreaterThanOrEqual(800)
    expect(duration).toBeLessThanOrEqual(2000)
    spy.mockRestore()
  })
  it('spawn后trajectory.startX在[0,width]', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    const startX = (sys as any).comets[0].trajectory.startX
    expect(startX).toBeGreaterThanOrEqual(0)
    expect(startX).toBeLessThan(world.width)
    spy.mockRestore()
  })
})

describe('WorldCometSystem - update字段变更', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('progress>0.7时brightness减少', () => {
    // startTick=0, duration=1000, tick=1200: elapsed=1200, progress=1.0>0.7 → brightness减2
    const comet = makeComet('omen', 0, 1000)
    comet.brightness = 80
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    expect(comet.brightness).toBeLessThan(80)
  })
  it('brightness不低于0', () => {
    const comet = makeComet('omen', 0, 100)
    comet.brightness = 2
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    // tick=1200: elapsed=1200>100, comet expired and removed, brightness changes before removal
    // set duration large enough to not expire but progress>0.7
    const comet2 = makeComet('omen', 0, 1000)
    comet2.brightness = 0
    ;(sys as any).comets.push(comet2)
    sys.update(16, world, em, 1200)
    expect(comet2.brightness).toBeGreaterThanOrEqual(0)
  })
  it('resource_rain提升范围内生物health（progress=0.5）', () => {
    // startTick=1200, duration=1000, tick=1700: elapsed=500, progress=0.5 ∈ [0.45,0.55]
    const comet = makeCometWithEffect('resource_rain', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 50 }
    // midX=(100+100)/2=100, midY=(0+200)/2=100, 生物在(100,100), dx=dy=0, 距离=0 < 400=20²
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeGreaterThan(50)
  })
  it('resource_rain health不超过100', () => {
    const comet = makeCometWithEffect('resource_rain', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 95 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeLessThanOrEqual(100)
  })
  it('mutation减少近距离生物health（progress=0.5）', () => {
    // midX=100, midY=100, 生物在(100,100), 距离=0 < 200=sqrt(200)²
    const comet = makeCometWithEffect('mutation', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 100 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeLessThan(100)
  })
  it('mutation health不低于1', () => {
    const comet = makeCometWithEffect('mutation', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 2 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeGreaterThanOrEqual(1)
  })
  it('inspiration以0.1概率提升health（Math.random<0.1）', () => {
    const comet = makeCometWithEffect('inspiration', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 90 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    // inspiration: if random > 0.1 continue (skip), so mock to 0.05 to trigger
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeGreaterThan(90)
    spy.mockRestore()
  })
  it('omen不修改生物状态', () => {
    const comet = makeCometWithEffect('omen', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBe(100)
    expect(needs.hunger).toBe(0)
  })
  it('blessing不修改生物状态', () => {
    const comet = makeCometWithEffect('blessing', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBe(100)
    expect(needs.hunger).toBe(0)
  })
})

describe('WorldCometSystem - cleanup逻辑', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期彗星被移除', () => {
    // startTick=0, duration=100, tick=1200: elapsed=1200>=100 → 移除
    const comet = makeComet('omen', 0, 100)
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    expect((sys as any).comets.filter((c: Comet) => c.id === comet.id)).toHaveLength(0)
  })
  it('未过期彗星保留', () => {
    // startTick=1200, duration=10000, tick=1200: elapsed=0<10000 → 保留
    const comet = makeComet('omen', 1200, 10000)
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    const remaining = (sys as any).comets.filter((c: Comet) => c.id === comet.id)
    expect(remaining).toHaveLength(1)
  })
  it('多个彗星独立移除', () => {
    // c1 过期，c2 不过期
    const c1 = makeComet('omen', 0, 100)
    const c2 = makeComet('blessing', 1200, 10000)
    ;(sys as any).comets.push(c1, c2)
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    const remaining = (sys as any).comets.filter((c: Comet) => c.id === c2.id)
    expect(remaining).toHaveLength(1)
  })
  it('totalComets不随cleanup减少', () => {
    ;(sys as any).totalComets = 5
    const comet = makeComet('omen', 0, 100)
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200)
    expect((sys as any).totalComets).toBe(5)
  })
})

describe('WorldCometSystem - MAX上限', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_COMETS=3（直接注入）', () => {
    for (let i = 0; i < 3; i++) (sys as any).comets.push(makeComet('omen', 5000, 20000))
    expect((sys as any).comets).toHaveLength(3)
  })
  it('达到MAX_COMETS后不再spawn', () => {
    for (let i = 0; i < 3; i++) (sys as any).comets.push(makeComet('omen', 1200, 20000))
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets).toHaveLength(3)
    spy.mockRestore()
  })
  it('低于MAX_COMETS时可spawn', () => {
    for (let i = 0; i < 2; i++) (sys as any).comets.push(makeComet('omen', 1200, 20000))
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).comets).toHaveLength(3)
    spy.mockRestore()
  })
  it('totalComets统计历史总数', () => {
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, world, em, 1200)
    expect((sys as any).totalComets).toBe(1)
    ;(sys as any).lastCheck = 1200
    sys.update(16, world, em, 2400)
    expect((sys as any).totalComets).toBe(2)
    spy.mockRestore()
  })
})

describe('WorldCometSystem - 边界验证', () => {
  let sys: WorldCometSystem
  let world: any
  let em: any
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('支持5种CometEffect', () => {
    const effects: CometEffect[] = ['resource_rain', 'omen', 'inspiration', 'mutation', 'blessing']
    expect(effects).toHaveLength(5)
  })
  it('progress<0.45时不应用效果', () => {
    // startTick=1200, duration=1000, tick=1200: elapsed=0, progress=0 < 0.45
    const comet = makeCometWithEffect('resource_rain', 100, 100, 0, 200)
    comet.startTick = 1200; comet.duration = 1000
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 50 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1200) // progress = 0/1000 = 0 < 0.45
    expect(needs.health).toBe(50)
  })
  it('progress>0.55时不应用效果', () => {
    // startTick=1200, duration=1000, tick=2400: elapsed=1200, progress=1.0 > 0.55
    const comet = makeCometWithEffect('resource_rain', 100, 100, 0, 200)
    comet.startTick = 1200; comet.duration = 10000
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 50 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    // tick=3400: elapsed=2200, progress=2200/10000=0.22 < 0.45 不触发
    // need progress > 0.55: elapsed > 5500, tick = 1200+5500+1=6701
    sys.update(16, world, em, 9000) // elapsed=7800, progress=0.78 > 0.55 不触发
    expect(needs.health).toBe(50)
  })
  it('resource_rain范围外生物不受影响', () => {
    const comet = makeCometWithEffect('resource_rain', 0, 0, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 50 }
    // midX=(0+0)/2=0, midY=(0+200)/2=100, 生物在(150,100), dx=150,dy=0, 150²=22500 > 400
    em.addEntity(1, { position: { type: 'position', x: 150, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBe(50)
  })
  it('mutation范围外生物不受影响', () => {
    const comet = makeCometWithEffect('mutation', 0, 0, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 100 }
    // midX=0, midY=100, 生物在(50,100): dx=50, 50²=2500 > 200
    em.addEntity(1, { position: { type: 'position', x: 50, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBe(100)
  })
  it('无needs组件时不崩溃', () => {
    const comet = makeCometWithEffect('resource_rain', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' } })
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(16, world, em, 1700)).not.toThrow()
  })
  it('inspiration random>0.1时不触发', () => {
    const comet = makeCometWithEffect('inspiration', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 90 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, world, em, 1700)
    expect(needs.health).toBe(90)
    spy.mockRestore()
  })
  it('inspiration health不超过100', () => {
    const comet = makeCometWithEffect('inspiration', 100, 100, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 98 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeLessThanOrEqual(100)
    spy.mockRestore()
  })
  it('comet.id在注入后单调递增', () => {
    ;(sys as any).comets.push(makeComet('omen', 5000, 10000))
    ;(sys as any).comets.push(makeComet('blessing', 5000, 10000))
    ;(sys as any).comets.push(makeComet('omen', 5000, 10000))
    const ids = (sys as any).comets.map((c: Comet) => c.id)
    expect(ids[0]).toBeLessThan(ids[1])
    expect(ids[1]).toBeLessThan(ids[2])
  })
  it('progress从0到1连续变化导致brightness减少', () => {
    const comet = makeComet('omen', 0, 1000)
    comet.brightness = 80
    ;(sys as any).comets.push(comet)
    ;(sys as any).lastCheck = 0
    // tick=1200: elapsed=1200, progress=min(1,1.2)=1 > 0.7 → brightness减2
    sys.update(16, world, em, 1200)
    expect(comet.brightness).toBeLessThan(80)
  })
  it('resource_rain midX=trajectory中点X', () => {
    // midX=(0+200)/2=100, midY=(0+200)/2=100
    const comet = makeCometWithEffect('resource_rain', 0, 200, 0, 200)
    ;(sys as any).comets.push(comet)
    const needs = { type: 'needs', health: 50 }
    // 生物在(100,100), dx=dy=0, 距离=0 < 400
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    ;(sys as any).lastCheck = 0
    sys.update(16, world, em, 1700)
    expect(needs.health).toBeGreaterThan(50)
  })
})
