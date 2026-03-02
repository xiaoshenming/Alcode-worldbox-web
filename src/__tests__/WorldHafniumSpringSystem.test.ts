import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldHafniumSpringSystem } from '../systems/WorldHafniumSpringSystem'
import type { HafniumSpringZone } from '../systems/WorldHafniumSpringSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
const CHECK_INTERVAL = 2860
const FORM_CHANCE = 0.003
const MAX_ZONES = 32

// hasAdjacentTile checks 8 neighbors via world.getTile.
// To allow spawn: at least one neighbor must be SHALLOW_WATER(1), DEEP_WATER(0), or MOUNTAIN(5).
// "always water" world: every getTile returns SHALLOW_WATER(1)
const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
// "always mountain" world: every getTile returns MOUNTAIN(5)
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// "always sand" world: no water/mountain neighbor → blocks spawn
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any

const em = {} as any

function makeSys(): WorldHafniumSpringSystem { return new WorldHafniumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<HafniumSpringZone> = {}): HafniumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    hafniumContent: 60, springFlow: 30,
    zirconLeaching: 50, mineralSeparation: 60,
    tick: 0,
    ...overrides
  }
}

describe('WorldHafniumSpringSystem', () => {
  let sys: WorldHafniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ─────────────────────────���────────────────────────
  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个zone全部保留', () => {
    ;(sys as any).zones.push(makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────
  it('tick < CHECK_INTERVAL 时跳过，lastCheck不变', () => {
    sys.update(1, sandWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 阻断spawn（> FORM_CHANCE）
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时更新 lastCheck 到当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const t = CHECK_INTERVAL + 999
    sys.update(1, sandWorld, em, t)
    expect((sys as any).lastCheck).toBe(t)
  })

  it('两次调用：第二次 tick 不足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const before = (sys as any).lastCheck
    sys.update(1, sandWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('两次调用：第二次 tick 满足间隔则执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const second = CHECK_INTERVAL * 2
    sys.update(1, sandWorld, em, second)
    expect((sys as any).lastCheck).toBe(second)
  })

  // ── spawn 阻断：无邻近水/山时不spawn ──────────────────────────
  it('sandWorld无水/山邻居时，random=0也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── spawn 阻断：random > FORM_CHANCE 时不spawn ─────────────────
  it('waterWorld中 random=0.9 > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('mountainWorld中 random=0.9 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── spawn 成功 ────────────────────────────────────────────────
  it('waterWorld中 random=0 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('mountainWorld中 random=0 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('每次update最多尝试3次（attempt循环）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    // 3次attempt全部成功：最多spawn 3个
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  // ── MAX 上限 ──────────────────────────────────────────────────
  it('zones满MAX_ZONES时不再spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones为MAX_ZONES-1时仍可spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES)
  })

  it('zones满MAX_ZONES后attempt循环立即break', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────────
  it('过期记录（tick < cutoff=tick-54000）被删除', () => {
    const currentTick = 60000
    ;(sys as any).zones.push(makeZone({ tick: 0 })) // cutoff=6000, 0 < 6000 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const currentTick = 60000
    const recentTick = currentTick - 30000 // 30000 < 54000 → 未过期
    ;(sys as any).zones.push(makeZone({ tick: recentTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合：过期删除、未过期保留', () => {
    const currentTick = 100000
    const expired = makeZone({ tick: 0 })        // 过期
    const fresh = makeZone({ tick: 60000 })      // 未过期（100000-60000=40000 < 54000）
    ;(sys as any).zones.push(expired, fresh)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].id).toBe(fresh.id)
  })

  it('恰好在 cutoff 边界不删除（tick === cutoff，<不成立）', () => {
    const currentTick = 54000
    ;(sys as any).zones.push(makeZone({ tick: 0 })) // cutoff=0, 0<0 false → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick比cutoff小1时被删除', () => {
    const currentTick = 54001
    ;(sys as any).zones.push(makeZone({ tick: 0 })) // cutoff=1, 0<1 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('多条过期记录全部被删除', () => {
    const currentTick = 200000
    ;(sys as any).zones.push(makeZone({ tick: 0 }), makeZone({ tick: 1 }), makeZone({ tick: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── 字段范围约束（spawn后验证） ────────────────────────────────
  it('spawn后 hafniumContent 在 [40, 100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.hafniumContent).toBeGreaterThanOrEqual(40)
    expect(z.hafniumContent).toBeLessThanOrEqual(100)
  })

  it('spawn后 springFlow 在 [10, 60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('spawn后 zirconLeaching 在 [20, 100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.zirconLeaching).toBeGreaterThanOrEqual(20)
    expect(z.zirconLeaching).toBeLessThanOrEqual(100)
  })

  it('spawn后 mineralSeparation 在 [15, 100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.mineralSeparation).toBeGreaterThanOrEqual(15)
    expect(z.mineralSeparation).toBeLessThanOrEqual(100)
  })

  it('spawn后记录的 tick 等于传入的当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn的zone有唯一自增id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    sys.update(1, waterWorld, em, CHECK_INTERVAL * 2)
    const ids = (sys as any).zones.map((z: HafniumSpringZone) => z.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('spawn后zone包含所有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('hafniumContent')
    expect(z).toHaveProperty('springFlow')
    expect(z).toHaveProperty('zirconLeaching')
    expect(z).toHaveProperty('mineralSeparation')
    expect(z).toHaveProperty('tick')
  })

  it('spawn后 x 在世界范围内 [0, width)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(waterWorld.width)
  })

  it('spawn后 y 在世界范围内 [0, height)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(waterWorld.height)
  })
})
