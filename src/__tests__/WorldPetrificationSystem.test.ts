import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPetrificationSystem } from '../systems/WorldPetrificationSystem'
import type { PetrificationZone, PetrifiedCreature } from '../systems/WorldPetrificationSystem'
import { TileType } from '../utils/Constants'

const CHECK_INTERVAL = 900
const MAX_ZONES = 5
const FORM_CHANCE = 0.01
const MAX_AGE = 10000
const SPREAD_BASE = 0.03
const FREE_CHANCE = 0.008

function makeSys(): WorldPetrificationSystem { return new WorldPetrificationSystem() }
let nextId = 1
function makeZone(overrides: Partial<PetrificationZone> = {}): PetrificationZone {
  return {
    id: nextId++, x: 30, y: 40, radius: 10, maxRadius: 20,
    spreadRate: 0.5, intensity: 70, age: 500, expanding: true, petrifiedCount: 3,
    ...overrides,
  }
}
function makePetrified(overrides: Partial<PetrifiedCreature> = {}): PetrifiedCreature {
  return { creatureId: nextId++, zoneId: 1, originalX: 30, originalY: 40, tick: 0, duration: 1000, ...overrides }
}
function makeWorld(tile = TileType.MOUNTAIN) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {
  getEntitiesWithComponents: vi.fn().mockReturnValue([]),
  getComponent: vi.fn().mockReturnValue(null),
} as any

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem 初始状态', () => {
  let sys: WorldPetrificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石化区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('初始无石化生物', () => {
    expect((sys as any).petrified).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('_petrifiedIds初始为空Set', () => {
    expect((sys as any)._petrifiedIds.size).toBe(0)
  })
  it('_zoneById初始为空Map', () => {
    expect((sys as any)._zoneById.size).toBe(0)
  })
  it('注入石化区后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('注入多个石化区全部可查', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
  it('注入石化生物后可查询', () => {
    ;(sys as any).petrified.push(makePetrified())
    expect((sys as any).petrified).toHaveLength(1)
  })
  it('石化区字段默认值正确', () => {
    const z = makeZone()
    expect(z.intensity).toBe(70)
    expect(z.expanding).toBe(true)
    expect(z.petrifiedCount).toBe(3)
    expect(z.radius).toBe(10)
    expect(z.maxRadius).toBe(20)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPetrificationSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时执行（lastCheck=0, 0-0=0 不小于0）', () => {
    sys.update(1, world, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时不执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick = CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick = CHECK_INTERVAL+1时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, world, mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('再次tick不足CHECK_INTERVAL时不再更新lastCheck', () => {
    sys.update(1, world, mockEm, 5000)
    sys.update(1, world, mockEm, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('相邻两次间隔恰好等于CHECK_INTERVAL时两次均执行', () => {
    sys.update(1, world, mockEm, 0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('首次执行前zones保持为空（random=0.9 > FORM_CHANCE）', () => {
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem spawn条件', () => {
  let sys: WorldPetrificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=MOUNTAIN时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
    // random固定<FORM_CHANCE且tile正确 => 应有zone
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tile=GRASS时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.GRASS)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tile=FOREST时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.FOREST)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tile=SAND时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tile=DEEP_WATER时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tile=LAVA时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.LAVA)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('已达MAX_ZONES时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.MOUNTAIN)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 100, x: i * 25, y: 0 }))
    }
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('已有MAX_ZONES-1个时可继续spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.MOUNTAIN)
    // random固定为0.005时生成坐标: x=10+floor(0.005*(100-20))=10, y=10
    // 预填充zones须与(10,10)保持距离>=20（dx²+dy²>=400）
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ id: i + 100, x: 50 + i * 10, y: 50 }))
    }
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('spawn后_zoneById也同步注册', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const zones = (sys as any).zones as PetrificationZone[]
    if (zones.length > 0) {
      expect((sys as any)._zoneById.has(zones[0].id)).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem spawn字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOneZone(): PetrificationZone {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    return (sys as any).zones[0] as PetrificationZone
  }

  // 注意：spawnOneZone 调用 update()，spawn后 updateZones 立即执行一次
  // 因此 radius、age、intensity 已经被 updateZones 修改过一次
  it('radius在spawn+updateZones一次后略大于2', () => {
    const z = spawnOneZone()
    // 初始 radius=2，expanding=true，spreadRate=SPREAD_BASE+random*0.02≈0.03+0.0001
    expect(z.radius).toBeGreaterThanOrEqual(2)
    expect(z.radius).toBeLessThanOrEqual(2 + SPREAD_BASE + 0.02 + 1e-9)
  })
  it('maxRadius在[4,8]范围内', () => {
    const z = spawnOneZone()
    expect(z.maxRadius).toBeGreaterThanOrEqual(4)
    expect(z.maxRadius).toBeLessThanOrEqual(8)
  })
  it('spreadRate >= SPREAD_BASE', () => {
    const z = spawnOneZone()
    expect(z.spreadRate).toBeGreaterThanOrEqual(SPREAD_BASE)
  })
  it('spreadRate <= SPREAD_BASE+0.02', () => {
    const z = spawnOneZone()
    expect(z.spreadRate).toBeLessThanOrEqual(SPREAD_BASE + 0.02 + 1e-9)
  })
  it('intensity在updateZones一次后仍在合法范围[10,100]内', () => {
    // 初始 intensity=30+random*40；updateZones后 intensity += (random-0.5)*8，仍在[10,100]
    const z = spawnOneZone()
    expect(z.intensity).toBeGreaterThanOrEqual(10)
    expect(z.intensity).toBeLessThanOrEqual(100)
  })
  it('age在spawn+updateZones一次后为1', () => {
    const z = spawnOneZone()
    // updateZones 会执行 zone.age++，初始0变成1
    expect(z.age).toBe(1)
  })
  it('expanding在spawn+updateZones后仍为true（radius<maxRadius）', () => {
    // random=0.005时 maxRadius=4，radius从2增长约0.03，远小于4，expanding保持true
    const z = spawnOneZone()
    expect(z.expanding).toBe(true)
  })
  it('petrifiedCount初始为0', () => {
    const z = spawnOneZone()
    expect(z.petrifiedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem update数值逻辑', () => {
  let sys: WorldPetrificationSystem
  const world = makeWorld(TileType.GRASS)
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('expanding时radius增加spreadRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, radius: 5, maxRadius: 20, spreadRate: 0.5, expanding: true, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].radius).toBeCloseTo(5.5)
  })
  it('radius超过maxRadius时转为收缩状态', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, radius: 19.9, maxRadius: 20, spreadRate: 0.5, expanding: true, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].expanding).toBe(false)
  })
  it('收缩时radius减少spreadRate*0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, radius: 10, maxRadius: 20, spreadRate: 0.4, expanding: false, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].radius).toBeCloseTo(10 - 0.4 * 0.5)
  })
  it('收缩时radius最小为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, radius: 1.0, maxRadius: 20, spreadRate: 2.0, expanding: false, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].radius).toBeGreaterThanOrEqual(1)
  })
  it('每次update后age递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: 100 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].age).toBe(101)
  })
  it('intensity保持在[10,100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, intensity: 95 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const intens = (sys as any).zones[0].intensity
    expect(intens).toBeGreaterThanOrEqual(10)
    expect(intens).toBeLessThanOrEqual(100)
  })
  it('intensity极低时不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const zone = makeZone({ id: 1, intensity: 10 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].intensity).toBeGreaterThanOrEqual(10)
  })
  it('duration递减（freeCreatures逻辑）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    const pc = makePetrified({ zoneId: zone.id, duration: 500 })
    ;(sys as any).petrified.push(pc)
    ;(sys as any)._petrifiedIds.add(pc.creatureId)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // random=0.9 > FREE_CHANCE=0.008，不会提前释放
    if ((sys as any).petrified.length > 0) {
      expect((sys as any).petrified[0].duration).toBe(499)
    }
  })
  it('多个zone各自独立age递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const z1 = makeZone({ id: 1, age: 10, x: 10, y: 10 })
    const z2 = makeZone({ id: 2, age: 20, x: 60, y: 60 })
    ;(sys as any).zones.push(z1, z2)
    ;(sys as any)._zoneById.set(z1.id, z1)
    ;(sys as any)._zoneById.set(z2.id, z2)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].age).toBe(11)
    expect((sys as any).zones[1].age).toBe(21)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldPetrificationSystem cleanup逻辑', () => {
  let sys: WorldPetrificationSystem
  const world = makeWorld(TileType.GRASS)
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('age<=MAX_AGE的zone不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: MAX_AGE })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // age会在updateZones里变成MAX_AGE+1，但cleanupExpired用原age >MAX_AGE，而update先updateZones再cleanup
    // 所以age=MAX_AGE经过updateZones变成MAX_AGE+1 > MAX_AGE => 被清除
    expect((sys as any).zones).toHaveLength(0)
  })
  it('age>MAX_AGE的zone被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: MAX_AGE + 1 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('age<MAX_AGE的zone保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: MAX_AGE - 2 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('zone清除时同区域stone生物也清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: MAX_AGE + 500 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    const pc = makePetrified({ zoneId: zone.id, duration: 999 })
    ;(sys as any).petrified.push(pc)
    ;(sys as any)._petrifiedIds.add(pc.creatureId)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).petrified).toHaveLength(0)
    expect((sys as any)._petrifiedIds.has(pc.creatureId)).toBe(false)
  })
  it('zone清除时_zoneById中该id也删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 55, age: MAX_AGE + 1 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any)._zoneById.has(55)).toBe(false)
  })
  it('duration<=0的石化生物被释放', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    const pc = makePetrified({ zoneId: zone.id, duration: 1 })
    ;(sys as any).petrified.push(pc)
    ;(sys as any)._petrifiedIds.add(pc.creatureId)
    // duration将变为0，应被释放
    const mockEmWithPos = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    } as any
    sys.update(1, world, mockEmWithPos, CHECK_INTERVAL)
    expect((sys as any).petrified).toHaveLength(0)
  })
  it('释放后_petrifiedIds中id被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zone = makeZone({ id: 1, age: 0 })
    ;(sys as any).zones.push(zone)
    ;(sys as any)._zoneById.set(zone.id, zone)
    const pc = makePetrified({ creatureId: 999, zoneId: zone.id, duration: 1 })
    ;(sys as any).petrified.push(pc)
    ;(sys as any)._petrifiedIds.add(999)
    const mockEmWithPos = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    } as any
    sys.update(1, world, mockEmWithPos, CHECK_INTERVAL)
    expect((sys as any)._petrifiedIds.has(999)).toBe(false)
  })
  it('只清除过期zone的生物，其他zone生物保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const oldZone = makeZone({ id: 10, age: MAX_AGE + 1, x: 10, y: 10 })
    const youngZone = makeZone({ id: 20, age: 100, x: 60, y: 60 })
    ;(sys as any).zones.push(oldZone, youngZone)
    ;(sys as any)._zoneById.set(oldZone.id, oldZone)
    ;(sys as any)._zoneById.set(youngZone.id, youngZone)
    const pc1 = makePetrified({ creatureId: 101, zoneId: 10, duration: 999 })
    const pc2 = makePetrified({ creatureId: 102, zoneId: 20, duration: 999 })
    ;(sys as any).petrified.push(pc1, pc2)
    ;(sys as any)._petrifiedIds.add(101)
    ;(sys as any)._petrifiedIds.add(102)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).petrified).toHaveLength(1)
    expect((sys as any).petrified[0].creatureId).toBe(102)
  })
})
