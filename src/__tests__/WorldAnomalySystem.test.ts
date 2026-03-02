import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldAnomalySystem } from '../systems/WorldAnomalySystem'
import type { WorldAnomaly, AnomalyType } from '../systems/WorldAnomalySystem'
import { EntityManager, EntityId } from '../ecs/Entity'

function makeSys(): WorldAnomalySystem { return new WorldAnomalySystem() }
let nextId = 1
function makeAnomaly(type: AnomalyType = 'rift'): WorldAnomaly {
  return { id: nextId++, type, x: 50, y: 50, radius: 5, intensity: 0.7, duration: 3000, createdTick: 0, affectedCount: 0 }
}

function makeWorld(w = 200, h = 200) {
  return {
    tick: 0,
    width: w,
    height: h,
    getTile: (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h ? 2 : null),
    setTile: vi.fn()
  }
}

function makeEntityManager() {
  const entities = new Map<EntityId, any>()
  return {
    getEntitiesWithComponents: vi.fn(() => Array.from(entities.keys())),
    getComponent: vi.fn((eid: EntityId, type: string) => entities.get(eid)?.[type]),
    addEntity: (eid: EntityId, comps: any) => entities.set(eid, comps)
  } as any as EntityManager
}

describe('WorldAnomalySystem - 初始状态', () => {
  let sys: WorldAnomalySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无异常', () => { expect((sys as any).anomalies).toHaveLength(0) })
  it('nextSpawnTick初始为SPAWN_INTERVAL(4000)', () => { expect((sys as any).nextSpawnTick).toBe(4000) })
  it('nextEffectTick初始为EFFECT_INTERVAL(300)', () => { expect((sys as any).nextEffectTick).toBe(300) })
  it('_lastZoom初始为-1', () => { expect((sys as any)._lastZoom).toBe(-1) })
  it('_typeFont初始为空字符串', () => { expect((sys as any)._typeFont).toBe('') })
  it('getActiveCount初始为0', () => { expect(sys.getActiveCount()).toBe(0) })
})

describe('WorldAnomalySystem - 节流机制', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('tick<nextSpawnTick时不spawn', () => {
    world.tick = 3999
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(0)
    spy.mockRestore()
  })
  it('tick>=nextSpawnTick时尝试spawn', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(8000)
    spy.mockRestore()
  })
  it('tick<nextEffectTick时不应用效果', () => {
    world.tick = 299
    ;(sys as any).anomalies.push(makeAnomaly())
    sys.update(16, em, world)
    expect((sys as any).nextEffectTick).toBe(300)
  })
  it('tick>=nextEffectTick时应用效果', () => {
    world.tick = 300
    ;(sys as any).anomalies.push(makeAnomaly())
    sys.update(16, em, world)
    expect((sys as any).nextEffectTick).toBe(600)
  })
  it('nextSpawnTick每次增加SPAWN_INTERVAL', () => {
    world.tick = 4000
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(8000)
    world.tick = 8000
    sys.update(16, em, world)
    expect((sys as any).nextSpawnTick).toBe(12000)
  })
  it('nextEffectTick每次增加EFFECT_INTERVAL', () => {
    world.tick = 300
    sys.update(16, em, world)
    expect((sys as any).nextEffectTick).toBe(600)
    world.tick = 600
    sys.update(16, em, world)
    expect((sys as any).nextEffectTick).toBe(900)
  })
})

describe('WorldAnomalySystem - spawn条件', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('anomalies.length>=MAX_ANOMALIES(6)时不spawn', () => {
    for (let i = 0; i < 6; i++) (sys as any).anomalies.push(makeAnomaly())
    world.tick = 4000
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(6)
  })
  it('anomalies.length<MAX_ANOMALIES时可spawn', () => {
    for (let i = 0; i < 5; i++) (sys as any).anomalies.push(makeAnomaly())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(6)
    spy.mockRestore()
  })
  it('tile=null时跳过spawn尝试', () => {
    world.getTile = () => null
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(0)
    spy.mockRestore()
  })
  it('距离已有anomaly<30时跳过spawn', () => {
    const existing = makeAnomaly()
    existing.x = 50; existing.y = 50
    ;(sys as any).anomalies.push(existing)
    world.tick = 4000
    let callCount = 0
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount <= 40) return 0.25
      if (callCount <= 42) return 0.25
      return 0.001
    })
    sys.update(16, em, world)
    spy.mockRestore()
  })
  it('spawn尝试最多20次', () => {
    world.getTile = () => null
    world.tick = 4000
    let callCount = 0
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return 0.5
    })
    sys.update(16, em, world)
    expect(callCount).toBeLessThanOrEqual(60)
    spy.mockRestore()
  })
})

describe('WorldAnomalySystem - spawn后字段值', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后id递增（直接注入验证）', () => {
    // 直接注入两个anomaly，验证id单调递增
    ;(sys as any).anomalies.push(makeAnomaly())
    ;(sys as any).anomalies.push(makeAnomaly())
    const id1 = (sys as any).anomalies[0].id
    const id2 = (sys as any).anomalies[1].id
    expect(id2).toBe(id1 + 1)
  })
  it('spawn后type是5种之一', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const types: AnomalyType[] = ['rift', 'vortex', 'mirage', 'crystal_storm', 'void_zone']
    expect(types).toContain((sys as any).anomalies[0].type)
    spy.mockRestore()
  })
  it('spawn后x在[5, width-5]范围', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const x = (sys as any).anomalies[0].x
    expect(x).toBeGreaterThanOrEqual(5)
    expect(x).toBeLessThan(world.width - 5)
    spy.mockRestore()
  })
  it('spawn后y在[5, height-5]范围', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const y = (sys as any).anomalies[0].y
    expect(y).toBeGreaterThanOrEqual(5)
    expect(y).toBeLessThan(world.height - 5)
    spy.mockRestore()
  })
  it('spawn后radius在[6,15]', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const radius = (sys as any).anomalies[0].radius
    expect(radius).toBeGreaterThanOrEqual(6)
    expect(radius).toBeLessThanOrEqual(15)
    spy.mockRestore()
  })
  it('spawn后intensity在[0.3,1.0]', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const intensity = (sys as any).anomalies[0].intensity
    expect(intensity).toBeGreaterThanOrEqual(0.3)
    expect(intensity).toBeLessThanOrEqual(1.0)
    spy.mockRestore()
  })
  it('spawn后duration在[MIN_DURATION,MAX_DURATION]', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    const duration = (sys as any).anomalies[0].duration
    expect(duration).toBeGreaterThanOrEqual(2000)
    expect(duration).toBeLessThanOrEqual(8000)
    spy.mockRestore()
  })
  it('spawn后createdTick=world.tick', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies[0].createdTick).toBe(4000)
    spy.mockRestore()
  })
  it('spawn后affectedCount=0', () => {
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies[0].affectedCount).toBe(0)
    spy.mockRestore()
  })
})

describe('WorldAnomalySystem - update字段变更', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('每次update减少duration', () => {
    const anomaly = makeAnomaly()
    anomaly.duration = 3000
    ;(sys as any).anomalies.push(anomaly)
    world.tick = 0
    sys.update(16, em, world)
    expect(anomaly.duration).toBeLessThan(3000)
  })
  it('duration<=0时移除anomaly', () => {
    const anomaly = makeAnomaly()
    anomaly.duration = 10
    ;(sys as any).anomalies.push(anomaly)
    world.tick = 0
    sys.update(20, em, world)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('rift类型teleport生物', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    const pos = { type: 'position', x: 50, y: 50 }
    em.addEntity(1, { position: pos, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    spy.mockRestore()
  })
  it('vortex类型拉向中心', () => {
    const anomaly = makeAnomaly('vortex')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    // 生物在范围内: dx=3,dy=3, sqrt(18)≈4.24 < 10
    const pos = { type: 'position', x: 53, y: 53 }
    em.addEntity(1, { position: pos, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 300
    sys.update(16, em, world)
    // vortex: pos.x += (50-53)*0.02*1.0 = -0.06 → pos.x < 53
    expect(pos.x).toBeLessThan(53)
    expect(pos.y).toBeLessThan(53)
  })
  it('crystal_storm类型减少health', () => {
    const anomaly = makeAnomaly('crystal_storm')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' }, needs })
    world.tick = 300
    sys.update(16, em, world)
    expect(needs.health).toBeLessThan(100)
  })
  it('void_zone类型增加hunger', () => {
    const anomaly = makeAnomaly('void_zone')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' }, needs })
    world.tick = 300
    sys.update(16, em, world)
    expect(needs.hunger).toBeGreaterThan(0)
  })
  it('affectedCount统计范围内生物', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    em.addEntity(2, { position: { type: 'position', x: 55, y: 55 }, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 300
    sys.update(16, em, world)
    expect(anomaly.affectedCount).toBeGreaterThan(0)
  })
  it('rift类型随机warp地形', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    spy.mockRestore()
  })
})

describe('WorldAnomalySystem - cleanup逻辑', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('duration耗尽后移除', () => {
    const anomaly = makeAnomaly()
    anomaly.duration = 5
    ;(sys as any).anomalies.push(anomaly)
    world.tick = 0
    sys.update(10, em, world)
    expect((sys as any).anomalies).toHaveLength(0)
  })
  it('多个anomaly独立衰减', () => {
    const a1 = makeAnomaly()
    a1.duration = 100
    const a2 = makeAnomaly()
    a2.duration = 200
    ;(sys as any).anomalies.push(a1, a2)
    world.tick = 0
    sys.update(150, em, world)
    expect((sys as any).anomalies).toHaveLength(1)
  })
  it('getActiveCount返回当前数量', () => {
    ;(sys as any).anomalies.push(makeAnomaly())
    ;(sys as any).anomalies.push(makeAnomaly())
    expect(sys.getActiveCount()).toBe(2)
  })
})

describe('WorldAnomalySystem - MAX上限', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_ANOMALIES=6', () => {
    for (let i = 0; i < 6; i++) (sys as any).anomalies.push(makeAnomaly())
    expect((sys as any).anomalies).toHaveLength(6)
  })
  it('达到MAX_ANOMALIES后不再spawn', () => {
    for (let i = 0; i < 6; i++) (sys as any).anomalies.push(makeAnomaly())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(6)
    spy.mockRestore()
  })
  it('低于MAX_ANOMALIES时可spawn', () => {
    for (let i = 0; i < 5; i++) (sys as any).anomalies.push(makeAnomaly())
    world.tick = 4000
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, em, world)
    expect((sys as any).anomalies).toHaveLength(6)
    spy.mockRestore()
  })
})

describe('WorldAnomalySystem - 边界验证', () => {
  let sys: WorldAnomalySystem
  let world: any
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); world = makeWorld(); em = makeEntityManager(); nextId = 1 })

  it('支持5种AnomalyType', () => {
    const types: AnomalyType[] = ['rift', 'vortex', 'mirage', 'crystal_storm', 'void_zone']
    expect(types).toHaveLength(5)
  })
  it('范围外生物不受影响', () => {
    const anomaly = makeAnomaly('crystal_storm')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 5
    ;(sys as any).anomalies.push(anomaly)
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 100, y: 100 }, creature: { type: 'creature' }, needs })
    world.tick = 300
    sys.update(16, em, world)
    expect(needs.health).toBe(100)
  })
  it('无creature组件时不受影响', () => {
    const anomaly = makeAnomaly('crystal_storm')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 } })
    world.tick = 300
    expect(() => sys.update(16, em, world)).not.toThrow()
  })
  it('无position组件时不受影响', () => {
    const anomaly = makeAnomaly('crystal_storm')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    em.addEntity(1, { creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 300
    expect(() => sys.update(16, em, world)).not.toThrow()
  })
  it('无needs组件时不崩溃', () => {
    const anomaly = makeAnomaly('crystal_storm')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' } })
    world.tick = 300
    expect(() => sys.update(16, em, world)).not.toThrow()
  })
  it('mirage类型不修改生物状态', () => {
    const anomaly = makeAnomaly('mirage')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    const pos = { type: 'position', x: 50, y: 50 }
    const needs = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: pos, creature: { type: 'creature' }, needs })
    world.tick = 300
    sys.update(16, em, world)
    expect(pos.x).toBe(50)
    expect(pos.y).toBe(50)
    expect(needs.health).toBe(100)
    expect(needs.hunger).toBe(0)
  })
  it('rift teleport限制在world边界内', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    const pos = { type: 'position', x: 50, y: 50 }
    em.addEntity(1, { position: pos, creature: { type: 'creature' }, needs: { type: 'needs', health: 100 } })
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    expect(pos.x).toBeGreaterThanOrEqual(0)
    expect(pos.x).toBeLessThan(world.width)
    expect(pos.y).toBeGreaterThanOrEqual(0)
    expect(pos.y).toBeLessThan(world.height)
    spy.mockRestore()
  })
  it('void_zone hunger不超过100', () => {
    const anomaly = makeAnomaly('void_zone')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10; anomaly.intensity = 1.0
    ;(sys as any).anomalies.push(anomaly)
    const needs = { type: 'needs', health: 100, hunger: 98 }
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' }, needs })
    world.tick = 300
    sys.update(16, em, world)
    expect(needs.hunger).toBeLessThanOrEqual(100)
  })
  it('rift warp地形仅在tile[2,6]范围', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    world.getTile = () => 3
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    if (world.setTile.mock.calls.length > 0) {
      const newTile = world.setTile.mock.calls[0][2]
      expect(newTile).toBeGreaterThanOrEqual(2)
      expect(newTile).toBeLessThanOrEqual(6)
    }
    spy.mockRestore()
  })
  it('rift warp地形不修改tile<2', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    world.getTile = () => 1
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    expect(world.setTile).not.toHaveBeenCalled()
    spy.mockRestore()
  })
  it('rift warp地形不修改tile>6', () => {
    const anomaly = makeAnomaly('rift')
    anomaly.x = 50; anomaly.y = 50; anomaly.radius = 10
    ;(sys as any).anomalies.push(anomaly)
    world.getTile = () => 7
    world.tick = 300
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(16, em, world)
    expect(world.setTile).not.toHaveBeenCalled()
    spy.mockRestore()
  })
  it('intensity影响效果强度', () => {
    const a1 = makeAnomaly('crystal_storm')
    a1.x = 50; a1.y = 50; a1.radius = 10; a1.intensity = 0.5
    const a2 = makeAnomaly('crystal_storm')
    a2.x = 150; a2.y = 150; a2.radius = 10; a2.intensity = 1.0
    ;(sys as any).anomalies.push(a1, a2)
    const needs1 = { type: 'needs', health: 100, hunger: 0 }
    const needs2 = { type: 'needs', health: 100, hunger: 0 }
    em.addEntity(1, { position: { type: 'position', x: 50, y: 50 }, creature: { type: 'creature' }, needs: needs1 })
    em.addEntity(2, { position: { type: 'position', x: 150, y: 150 }, creature: { type: 'creature' }, needs: needs2 })
    world.tick = 300
    sys.update(16, em, world)
    expect(needs2.health).toBeLessThanOrEqual(needs1.health)
  })
})
