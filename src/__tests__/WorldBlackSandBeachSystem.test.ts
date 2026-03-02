import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBlackSandBeachSystem } from '../systems/WorldBlackSandBeachSystem'
import type { BlackSandBeachZone } from '../systems/WorldBlackSandBeachSystem'
import { TileType } from '../utils/Constants'

// TileType 参考：DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, MOUNTAIN=5, LAVA=7
// spawn 条件：tile===SAND||SHALLOW_WATER，且周边2格内有LAVA或MOUNTAIN

const SAND = TileType.SAND         // 2
const SHALLOW_WATER = TileType.SHALLOW_WATER // 1
const MOUNTAIN = TileType.MOUNTAIN // 5
const LAVA = TileType.LAVA         // 7
const GRASS = TileType.GRASS       // 3

/** world mock：中心返回 centerTile，其他均为 neighborTile */
function makeWorld(centerTile = GRASS, neighborTile = GRASS) {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      // 在200x200范围内，(100,100)为中心，周边5x5内返回neighborTile
      if (x === 100 && y === 100) return centerTile
      return neighborTile
    },
  } as any
}

/** 安全 world：所有 tile 均为 GRASS（不触发 spawn） */
const safeWorld = () => ({ width: 200, height: 200, getTile: () => GRASS }) as any

const em = {} as any
let nextId = 1
function makeZone(overrides: Partial<BlackSandBeachZone> = {}): BlackSandBeachZone {
  return {
    id: nextId++,
    x: 10,
    y: 20,
    magnetiteContent: 75,
    waveEnergy: 60,
    sandDepth: 30,
    volcanism: 80,
    tick: 0,
    ...overrides,
  }
}

// ── 初始状态 ──────────────────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem 初始状态', () => {
  it('初始 zones 为空数组', () => {
    const sys = new WorldBlackSandBeachSystem()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const sys = new WorldBlackSandBeachSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = new WorldBlackSandBeachSystem()
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem update() CHECK_INTERVAL 节流', () => {
  it('tick < CHECK_INTERVAL(2500) 时跳过，lastCheck 不更新', () => {
    const sys = new WorldBlackSandBeachSystem()
    sys.update(1, safeWorld(), em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时触发，lastCheck 更新', () => {
    const sys = new WorldBlackSandBeachSystem()
    sys.update(1, safeWorld(), em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('首次触发后，tick 未达下一个 CHECK_INTERVAL 时跳过', () => {
    const sys = new WorldBlackSandBeachSystem()
    sys.update(1, safeWorld(), em, 2500)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, safeWorld(), em, 2500 + 100)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  it('两次相差 CHECK_INTERVAL 时均触发', () => {
    const sys = new WorldBlackSandBeachSystem()
    sys.update(1, safeWorld(), em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
    sys.update(1, safeWorld(), em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
})

// ── 不满足 spawn 条件 ─────────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem spawn 条件检查', () => {
  it('tile 为 GRASS 时不 spawn（不满足SAND/SHALLOW_WATER条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    sys.update(1, safeWorld(), em, 2500)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('MAX_ZONES(36)已满时不再 spawn', () => {
    const sys = new WorldBlackSandBeachSystem()
    for (let i = 0; i < 36; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    // random < FORM_CHANCE 会尝试 spawn，但 zones 已满
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld(), em, 2500)
    expect((sys as any).zones).toHaveLength(36)
    vi.restoreAllMocks()
  })
})

// ── zones 注入与字段验证 ──────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem zones 数据字段', () => {
  let sys: WorldBlackSandBeachSystem
  beforeEach(() => { sys = new WorldBlackSandBeachSystem(); nextId = 100 })

  it('注入 zone 后可读取', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone 包含 magnetiteContent 字段', () => {
    ;(sys as any).zones.push(makeZone({ magnetiteContent: 55 }))
    expect((sys as any).zones[0].magnetiteContent).toBe(55)
  })

  it('zone 包含 waveEnergy 字段', () => {
    ;(sys as any).zones.push(makeZone({ waveEnergy: 42 }))
    expect((sys as any).zones[0].waveEnergy).toBe(42)
  })

  it('zone 包含 sandDepth 字段', () => {
    ;(sys as any).zones.push(makeZone({ sandDepth: 25 }))
    expect((sys as any).zones[0].sandDepth).toBe(25)
  })

  it('zone 包含 volcanism 字段', () => {
    ;(sys as any).zones.push(makeZone({ volcanism: 70 }))
    expect((sys as any).zones[0].volcanism).toBe(70)
  })

  it('zone 包含 tick 字段', () => {
    ;(sys as any).zones.push(makeZone({ tick: 9999 }))
    expect((sys as any).zones[0].tick).toBe(9999)
  })

  it('zone 包含坐标字段 x 和 y', () => {
    ;(sys as any).zones.push(makeZone({ x: 77, y: 88 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(77)
    expect(z.y).toBe(88)
  })

  it('多 zone 全部存在', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
})

// ── cleanup（过期清理） ────────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem cleanup', () => {
  it('tick - zone.tick >= 53000 时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // tick=55500，cutoff=55500-53000=2500，zone.tick=0 < 2500 → 删除
    sys.update(1, safeWorld(), em, 55500)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick - zone.tick < 53000 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    // tick=60000，cutoff=60000-53000=7000，zone.tick=10000 > 7000 → 保留
    sys.update(1, safeWorld(), em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('旧 zone 被清理，新 zone 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))       // 旧
    ;(sys as any).zones.push(makeZone({ tick: 60000 }))   // 新
    // tick=60000，cutoff=7000，zone[0].tick=0 < 7000 → 删, zone[1].tick=60000 保留
    sys.update(1, safeWorld(), em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(60000)
    vi.restoreAllMocks()
  })

  it('cleanup 精确边界：tick === cutoff 时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // cutoff = 53000 - 53000 = 0，zone.tick = 0 < 0 是 false → 保留
    // 但实际：cutoff = tick - 53000；当 tick=53001，cutoff=1，zone.tick=0 < 1 → 删除
    sys.update(1, safeWorld(), em, 53001)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick 恰好等于 cutoff 边界时 zone 保留（tick=53000, zone.tick=0, cutoff=0, 0 < 0 false）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    // cutoff = 53000 - 53000 = 0，zone.tick = 0 → 0 < 0 是 false → 不删除
    sys.update(1, safeWorld(), em, 53000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

// ── nextId 自增 ───────────────────────────────────────────────────────────────

describe('WorldBlackSandBeachSystem nextId 自增', () => {
  it('手动注入多个 zone，nextId 不会自动改变（nextId 由 spawn 控制）', () => {
    const sys = new WorldBlackSandBeachSystem()
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    // nextId 未变，仍为 1（未调用 update spawn 路径）
    expect((sys as any).nextId).toBe(1)
  })
})
