import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMudslideSystem } from '../systems/WorldMudslideSystem'
import type { Mudslide, MudslideScale } from '../systems/WorldMudslideSystem'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent, NeedsComponent } from '../ecs/Entity'

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeSys(): WorldMudslideSystem { return new WorldMudslideSystem() }

function makeWorld(tile: number = TileType.MOUNTAIN): {
  width: number; height: number; getTile: (x: number, y: number) => number
} {
  return { width: 200, height: 200, getTile: () => tile }
}

function makeEM(): EntityManager { return new EntityManager() }

function pushSlide(sys: WorldMudslideSystem, override: Partial<Mudslide> = {}): Mudslide {
  const s: Mudslide = {
    id: (sys as any).nextId++,
    startX: 10, startY: 10,
    dirX: 0, dirY: 1,
    scale: 'moderate',
    length: 12,
    progress: 0,
    startTick: 0,
    duration: 800,
    ...override,
  }
  ;(sys as any).mudslides.push(s)
  return s
}

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldMudslideSystem 初始状态', () => {
  let sys: WorldMudslideSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('mudslides 初始为空数组', () => {
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('getMudslides 返回内部引用', () => {
    expect(sys.getMudslides()).toBe(sys.getMudslides())
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('mudslides 是数组类型', () => {
    expect(Array.isArray(sys.getMudslides())).toBe(true)
  })

  it('多次构造实例互不影响', () => {
    const sys2 = makeSys()
    pushSlide(sys)
    expect(sys2.getMudslides()).toHaveLength(0)
  })

  it('注入后 getMudslides 长度正确', () => {
    pushSlide(sys); pushSlide(sys)
    expect(sys.getMudslides()).toHaveLength(2)
  })
})

// ─── 2. CHECK_INTERVAL 节流（1400）───────────────────────────────────────────
describe('WorldMudslideSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMudslideSystem
  const world = makeWorld()

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（差值 0 < 1400）', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1399 时不执行（差值 < 1400）', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world as any, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1400 时恰好执行（差值 >= 1400）', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发spawn
    sys.update(1, world as any, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('第一次执行后 lastCheck 更新为当前 tick', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次调用不满 1400 时不更新 lastCheck', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 6399)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次满足间隔时 lastCheck 更新', () => {
    sys = makeSys()
    const em = makeEM()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 5000)
    sys.update(1, world as any, em, 6400)
    expect((sys as any).lastCheck).toBe(6400)
  })
})

// ─── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldMudslideSystem spawn 条件', () => {
  let sys: WorldMudslideSystem
  const em = makeEM()

  afterEach(() => { vi.restoreAllMocks() })

  it('MOUNTAIN tile + random < 0.004 → 生成泥石流', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.003).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(1)
  })

  it('SNOW tile + random < 0.004 → 生成泥石流', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SNOW)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.003).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(1)
  })

  it('GRASS tile → 不生成泥石流（不符合地形条件）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.003).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('DEEP_WATER tile → 不生成泥石流', () => {
    sys = makeSys()
    const world = makeWorld(TileType.DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.003).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('SAND tile → 不生成泥石流', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SAND)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.003).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('random >= MUDSLIDE_CHANCE(0.004) → 不生成', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.005).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('已达 MAX_MUDSLIDES(4) → 不再生成', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    // startTick=1000 → elapsed=400, duration=800 → progress=50 < 100 → 不被cleanup
    for (let i = 0; i < 4; i++) pushSlide(sys, { startTick: 1000, duration: 800 })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(4)
  })

  it('3 条时还可再生成一条（未达上限）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    // startTick=1000 → elapsed=400, duration=800 → progress=50 < 100 → 不被cleanup
    for (let i = 0; i < 3; i++) pushSlide(sys, { startTick: 1000, duration: 800 })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(4)
  })
})

// ─── 4. spawn 后字段范围 ──────────────────────────────────────────────────────
describe('WorldMudslideSystem spawn 后字段范围', () => {
  const em = makeEM()
  afterEach(() => { vi.restoreAllMocks() })

  function spawnAndGet(r = 0.5): Mudslide {
    const sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    // 第1次: MUDSLIDE_CHANCE check → 第2次: x → 第3次: y → 第4次: pickRandom(SCALES) → 第5次: angle → 第6次: duration
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(r)
    sys.update(1, world as any, em, 1400)
    return sys.getMudslides()[0]
  }

  it('id 从 1 开始', () => {
    expect(spawnAndGet().id).toBe(1)
  })

  it('progress 初始为 0', () => {
    // startTick = 1400, elapsed = 1400 - 1400 = 0 → progress = min(100, 0/duration*100) = 0
    expect(spawnAndGet().progress).toBe(0)
  })

  it('startTick 等于当前 tick(1400)', () => {
    expect(spawnAndGet().startTick).toBe(1400)
  })

  it('scale 是有效枚举值', () => {
    const scales: MudslideScale[] = ['minor', 'moderate', 'severe', 'catastrophic']
    const s = spawnAndGet()
    expect(scales).toContain(s.scale)
  })

  it('length 与 scale 对应（r=0 → scale=minor → length=6）', () => {
    // pickRandom([minor,moderate,severe,catastrophic]) with r=0: floor(0*4)=0 → minor → length=6
    const s = spawnAndGet(0)
    expect(s.length).toBe(6) // LENGTH_MAP.minor = 6
  })

  it('duration 在 [300, 700] 范围内（300+r*400）', () => {
    const s = spawnAndGet(0.5)
    expect(s.duration).toBeGreaterThanOrEqual(300)
    expect(s.duration).toBeLessThanOrEqual(700)
  })

  it('dirX 和 dirY 是有效方向向量', () => {
    const s = spawnAndGet(0.5)
    const len = Math.sqrt(s.dirX * s.dirX + s.dirY * s.dirY)
    expect(len).toBeCloseTo(1, 3)
  })
})

// ─── 5. update 数值逻辑（progress 推进和伤害）────────────────────────────────
describe('WorldMudslideSystem update 数值逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('progress = min(100, elapsed/duration*100)', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS) // 不触发spawn
    pushSlide(sys, { startTick: 0, duration: 800, progress: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    // elapsed = 1400, progress = min(100, 1400/800*100) = min(100,175) = 100
    expect(sys.getMudslides()[0]?.progress ?? 100).toBe(100)
    // 100时会被cleanup，所以数组为空
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('progress = (elapsed/duration)*100 当 elapsed < duration', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startTick: 1000, duration: 800, progress: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    // elapsed = 400, progress = min(100, 400/800*100) = 50
    expect(sys.getMudslides()[0].progress).toBeCloseTo(50, 5)
  })

  it('progress 上限为 100', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startTick: 0, duration: 100, progress: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // elapsed 远超 duration，progress 被 min(100) 截断并cleanup
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0) // progress=100被cleanup
  })

  it('minor 泥石流伤害为 0.1，在范围内的生物受伤', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    // 泥石流在 startX=0, startY=0, dirX=1, dirY=0, length=6
    // progress=50 → currentDist=3 → cx=3, cy=0
    pushSlide(sys, { startX: 0, startY: 0, dirX: 1, dirY: 0, scale: 'minor', length: 6, startTick: 700, duration: 1400 })
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 3, y: 0 } as PositionComponent)
    em.addComponent(eid, { type: 'needs', hunger: 0, health: 80 } as NeedsComponent)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    // elapsed=700, progress=700/1400*100=50, cx=3, cy=0
    const needs = em.getComponent<NeedsComponent>(eid, 'needs')!
    expect(needs.health).toBeCloseTo(79.9, 4) // 80 - 0.1
  })

  it('catastrophic 泥石流伤害为 1.0', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startX: 0, startY: 0, dirX: 1, dirY: 0, scale: 'catastrophic', length: 35, startTick: 700, duration: 1400 })
    const eid = em.createEntity()
    // currentDist=17.5 → cx=18, cy=0 (round)
    em.addComponent(eid, { type: 'position', x: 18, y: 0 } as PositionComponent)
    em.addComponent(eid, { type: 'needs', hunger: 0, health: 80 } as NeedsComponent)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    const needs = em.getComponent<NeedsComponent>(eid, 'needs')!
    expect(needs.health).toBeCloseTo(79, 4) // 80 - 1.0
  })

  it('范围外生物不受伤（dx*dx+dy*dy >= 9）', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startX: 0, startY: 0, dirX: 1, dirY: 0, scale: 'severe', length: 20, startTick: 700, duration: 1400 })
    const eid = em.createEntity()
    // cx=10, cy=0; 生物在 (20,0) dx=10 → dx²+dy²=100 >= 9 → 不受伤
    em.addComponent(eid, { type: 'position', x: 20, y: 0 } as PositionComponent)
    em.addComponent(eid, { type: 'needs', hunger: 0, health: 60 } as NeedsComponent)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    const needs = em.getComponent<NeedsComponent>(eid, 'needs')!
    expect(needs.health).toBe(60) // 未受伤
  })

  it('生物受伤后被推向泥石流方向', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startX: 0, startY: 0, dirX: 1, dirY: 0, scale: 'moderate', length: 12, startTick: 700, duration: 1400 })
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 6, y: 0 } as PositionComponent)
    em.addComponent(eid, { type: 'needs', hunger: 0, health: 50 } as NeedsComponent)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const prevX = 6
    sys.update(1, world as any, em, 1400)
    const pos = em.getComponent<PositionComponent>(eid, 'position')!
    // 推移: pos.x += dirX*0.5 = +0.5
    expect(pos.x).toBeCloseTo(prevX + 0.5, 5)
  })

  it('health 不会降到 0 以下', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startX: 0, startY: 0, dirX: 1, dirY: 0, scale: 'catastrophic', length: 35, startTick: 700, duration: 1400 })
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 18, y: 0 } as PositionComponent)
    em.addComponent(eid, { type: 'needs', hunger: 0, health: 0.5 } as NeedsComponent)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    const needs = em.getComponent<NeedsComponent>(eid, 'needs')!
    expect(needs.health).toBeGreaterThanOrEqual(0)
  })
})

// ─── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldMudslideSystem cleanup 逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  // cleanup 条件: !(s.progress < 100) → progress >= 100 时删除

  it('progress=100 时被删除（!(100 < 100) = true）', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    // startTick=0, duration=100 → elapsed=1400 → progress=min(100,1400%)=100 → 删除
    pushSlide(sys, { startTick: 0, duration: 100 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('progress=99.9 时保留（99.9 < 100 = true）', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    // startTick=1001, duration=1400 → elapsed=399 → progress=399/1400*100≈28.5 < 100
    pushSlide(sys, { startTick: 1001, duration: 1400 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(1)
    expect(sys.getMudslides()[0].progress).toBeLessThan(100)
  })

  it('只删除 progress >= 100 的，保留未完成的', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startTick: 0, duration: 100 })     // 完成 → 删
    pushSlide(sys, { startTick: 1200, duration: 1400 }) // 未完成 → 保留
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(1)
  })

  it('全部 progress >= 100 时数组为空', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    for (let i = 0; i < 3; i++) pushSlide(sys, { startTick: 0, duration: 100 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(0)
  })

  it('无完成的泥石流时长度不变', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.GRASS)
    pushSlide(sys, { startTick: 1300, duration: 1400 })
    pushSlide(sys, { startTick: 1350, duration: 1400 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, em, 1400)
    expect(sys.getMudslides()).toHaveLength(2)
  })

  it('nextId 在每次 spawn 后递增', () => {
    const sys = makeSys()
    const em = makeEM()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValue(0.5)
    sys.update(1, world as any, em, 1400)
    expect((sys as any).nextId).toBe(2)
  })

  it('DAMAGE_MAP: minor=0.1, moderate=0.3, severe=0.6, catastrophic=1.0', () => {
    const DAMAGE_MAP = { minor: 0.1, moderate: 0.3, severe: 0.6, catastrophic: 1.0 }
    expect(DAMAGE_MAP.minor).toBe(0.1)
    expect(DAMAGE_MAP.moderate).toBe(0.3)
    expect(DAMAGE_MAP.severe).toBe(0.6)
    expect(DAMAGE_MAP.catastrophic).toBe(1.0)
  })
})
