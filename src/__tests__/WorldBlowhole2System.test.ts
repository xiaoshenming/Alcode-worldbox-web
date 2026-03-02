import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBlowhole2System } from '../systems/WorldBlowhole2System'
import type { Blowhole2 } from '../systems/WorldBlowhole2System'
import { TileType } from '../utils/Constants'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, MOUNTAIN=5, LAVA=7
// Blowhole2 spawn 条件: tile===SHALLOW_WATER || tile===MOUNTAIN
// CHECK_INTERVAL=2640, FORM_CHANCE=0.0012, MAX_BLOWHOLES=14

const SHALLOW_WATER = TileType.SHALLOW_WATER // 1
const MOUNTAIN = TileType.MOUNTAIN           // 5
const GRASS = TileType.GRASS                 // 3

/** 安全 world：所有 tile 返回 GRASS（不触发 spawn） */
const safeWorld = () => ({ width: 200, height: 200, getTile: () => GRASS }) as any

/** 触发 spawn 的 world：tile 返回 SHALLOW_WATER */
const shallowWorld = () => ({ width: 200, height: 200, getTile: () => SHALLOW_WATER }) as any

/** 触发 spawn 的 world：tile 返回 MOUNTAIN */
const mountainWorld = () => ({ width: 200, height: 200, getTile: () => MOUNTAIN }) as any

const em = {} as any

let bNextId = 1
function makeBlowhole(overrides: Partial<Blowhole2> = {}): Blowhole2 {
  return {
    id: bNextId++,
    x: 15,
    y: 25,
    shaftDepth: 10,
    openingDiameter: 3,
    sprayHeight: 8,
    waveForce: 40,
    erosionRate: 0.002,
    spectacle: 50,
    tick: 0,
    ...overrides,
  }
}

// ── 初始状态 ──────────────────────────────────────────────────────────────────

describe('WorldBlowhole2System 初始状态', () => {
  it('初始 blowholes 为空', () => {
    const sys = new WorldBlowhole2System()
    expect((sys as any).blowholes).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const sys = new WorldBlowhole2System()
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = new WorldBlowhole2System()
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────────

describe('WorldBlowhole2System update() CHECK_INTERVAL 节流', () => {
  it('tick < CHECK_INTERVAL(2640) 时跳过，lastCheck 不变', () => {
    const sys = new WorldBlowhole2System()
    sys.update(1, safeWorld(), em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时触发，lastCheck 更新为 tick', () => {
    const sys = new WorldBlowhole2System()
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).lastCheck).toBe(2640)
  })

  it('两次相差 CHECK_INTERVAL 均触发', () => {
    const sys = new WorldBlowhole2System()
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).lastCheck).toBe(2640)
    sys.update(1, safeWorld(), em, 5280)
    expect((sys as any).lastCheck).toBe(5280)
  })

  it('触发后再次 tick 不足时跳过', () => {
    const sys = new WorldBlowhole2System()
    sys.update(1, safeWorld(), em, 2640)
    sys.update(1, safeWorld(), em, 2640 + 100)
    expect((sys as any).lastCheck).toBe(2640)
  })
})

// ── spawn 条件：tile 不满足时不 spawn ─────────────────────────────────────────

describe('WorldBlowhole2System spawn 条件：tile 不满足', () => {
  it('tile 为 GRASS 时不 spawn（即使 random < FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowhole2System()
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('MAX_BLOWHOLES(14) 已满时不再 spawn', () => {
    const sys = new WorldBlowhole2System()
    for (let i = 0; i < 14; i++) {
      ;(sys as any).blowholes.push(makeBlowhole())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, shallowWorld(), em, 2640)
    expect((sys as any).blowholes).toHaveLength(14)
    vi.restoreAllMocks()
  })
})

// ── spawn 条件：tile 满足时 spawn ─────────────────────────────────────────────

describe('WorldBlowhole2System spawn 条件：tile 满足', () => {
  it('tile=SHALLOW_WATER 且 random < FORM_CHANCE 时 spawn', () => {
    const sys = new WorldBlowhole2System()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, shallowWorld(), em, 2640)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile=MOUNTAIN 且 random < FORM_CHANCE 时 spawn', () => {
    const sys = new WorldBlowhole2System()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, mountainWorld(), em, 2640)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('spawn 后 nextId 自增', () => {
    const sys = new WorldBlowhole2System()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, shallowWorld(), em, 2640)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })

  it('spawn 的 blowhole 包含 tick 字段', () => {
    const sys = new WorldBlowhole2System()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, shallowWorld(), em, 2640)
    expect((sys as any).blowholes[0].tick).toBe(2640)
    vi.restoreAllMocks()
  })

  it('spawn 的 blowhole id 从 1 开始', () => {
    const sys = new WorldBlowhole2System()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, shallowWorld(), em, 2640)
    expect((sys as any).blowholes[0].id).toBe(1)
    vi.restoreAllMocks()
  })
})

// ── blowholes 数据字段 ────────────────────────────────────────────────────────

describe('WorldBlowhole2System blowholes 数据字段', () => {
  let sys: WorldBlowhole2System
  beforeEach(() => { sys = new WorldBlowhole2System(); bNextId = 200 })

  it('注入 blowhole 后可读取', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    expect((sys as any).blowholes).toHaveLength(1)
  })

  it('shaftDepth 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ shaftDepth: 12 }))
    expect((sys as any).blowholes[0].shaftDepth).toBe(12)
  })

  it('openingDiameter 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ openingDiameter: 2.5 }))
    expect((sys as any).blowholes[0].openingDiameter).toBe(2.5)
  })

  it('sprayHeight 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ sprayHeight: 9 }))
    expect((sys as any).blowholes[0].sprayHeight).toBe(9)
  })

  it('waveForce 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ waveForce: 55 }))
    expect((sys as any).blowholes[0].waveForce).toBe(55)
  })

  it('erosionRate 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ erosionRate: 0.003 }))
    expect((sys as any).blowholes[0].erosionRate).toBeCloseTo(0.003)
  })

  it('spectacle 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ spectacle: 60 }))
    expect((sys as any).blowholes[0].spectacle).toBe(60)
  })

  it('多个 blowhole 全部保留', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    ;(sys as any).blowholes.push(makeBlowhole())
    ;(sys as any).blowholes.push(makeBlowhole())
    expect((sys as any).blowholes).toHaveLength(3)
  })
})

// ── 动态属性更新（每次 update 调整） ─────────────────────────────────────────

describe('WorldBlowhole2System 动态属性更新', () => {
  it('openingDiameter 随 erosionRate 缓慢增大（上限 8）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ openingDiameter: 1.0, erosionRate: 0.001 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    // openingDiameter 增加了 erosionRate * 0.01 = 0.00001，仍 <= 8
    expect((sys as any).blowholes[0].openingDiameter).toBeGreaterThan(1.0)
    expect((sys as any).blowholes[0].openingDiameter).toBeLessThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('openingDiameter 不超过上限 8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ openingDiameter: 8.0, erosionRate: 10 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].openingDiameter).toBeLessThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('sprayHeight 不低于下限 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ sprayHeight: 1.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].sprayHeight).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('sprayHeight 不超过上限 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ sprayHeight: 20.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].sprayHeight).toBeLessThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('waveForce 不低于下限 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ waveForce: 10.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].waveForce).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('waveForce 不超过上限 70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ waveForce: 70.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].waveForce).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })

  it('spectacle 不低于下限 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ spectacle: 10.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].spectacle).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('spectacle 不超过上限 65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowhole2System()
    const bh = makeBlowhole({ spectacle: 65.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2640)
    expect((sys as any).blowholes[0].spectacle).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})

// ── cleanup（过期清理） ────────────────────────────────────────────────────────

describe('WorldBlowhole2System cleanup', () => {
  it('tick - blowhole.tick >= 91000 时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 0 }))
    // tick=93640, cutoff=93640-91000=2640, zone.tick=0 < 2640 → 删除
    sys.update(1, safeWorld(), em, 93640)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick - blowhole.tick < 91000 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 50000 }))
    // tick=93640, cutoff=2640, blowhole.tick=50000 > 2640 → 保留
    sys.update(1, safeWorld(), em, 93640)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('旧 blowhole 删除，新 blowhole 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 0 }))       // 旧
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 90000 }))   // 新
    // tick=93640, cutoff=2640: blowhole[0].tick=0<2640 删, blowhole[1].tick=90000>2640 保
    sys.update(1, safeWorld(), em, 93640)
    expect((sys as any).blowholes).toHaveLength(1)
    expect((sys as any).blowholes[0].tick).toBe(90000)
    vi.restoreAllMocks()
  })

  it('cleanup cutoff 精确边界：tick===cutoff+1 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowhole2System()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 0 }))
    // tick=91001，cutoff=1，blowhole.tick=0 < 1 → 删除
    sys.update(1, safeWorld(), em, 91001)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
