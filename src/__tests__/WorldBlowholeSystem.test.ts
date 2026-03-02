import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBlowholeSystem } from '../systems/WorldBlowholeSystem'
import type { Blowhole } from '../systems/WorldBlowholeSystem'
import { TileType } from '../utils/Constants'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, MOUNTAIN=5, LAVA=7
// Blowhole spawn 条件: tile===SAND || tile===SHALLOW_WATER
// CHECK_INTERVAL=2600, FORM_CHANCE=0.0015, MAX_BLOWHOLES=15, cutoff=88000

const SHALLOW_WATER = TileType.SHALLOW_WATER // 1
const SAND = TileType.SAND                   // 2
const GRASS = TileType.GRASS                 // 3

/** 安全 world：所有 tile 返回 GRASS（不触发 spawn） */
const safeWorld = () => ({ width: 200, height: 200, getTile: () => GRASS }) as any

/** 触发 spawn 的 world：tile 返回 SAND */
const sandWorld = () => ({ width: 200, height: 200, getTile: () => SAND }) as any

/** 触发 spawn 的 world：tile 返回 SHALLOW_WATER */
const shallowWorld = () => ({ width: 200, height: 200, getTile: () => SHALLOW_WATER }) as any

const em = {} as any

let bhNextId = 1
function makeBlowhole(overrides: Partial<Blowhole> = {}): Blowhole {
  return {
    id: bhNextId++,
    x: 5,
    y: 10,
    caveDepth: 8,
    openingSize: 3,
    sprayHeight: 20,
    waveForce: 35,
    erosionRate: 5,
    spectacle: 40,
    tick: 0,
    ...overrides,
  }
}

// ── 初始状态 ──────────────────────────────────────────────────────────────────

describe('WorldBlowholeSystem 初始状态', () => {
  it('初始 blowholes 为空', () => {
    const sys = new WorldBlowholeSystem()
    expect((sys as any).blowholes).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const sys = new WorldBlowholeSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = new WorldBlowholeSystem()
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────────

describe('WorldBlowholeSystem update() CHECK_INTERVAL 节流', () => {
  it('tick < CHECK_INTERVAL(2600) 时跳过，lastCheck 不变', () => {
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL(2600) 时触发，lastCheck 更新为 tick', () => {
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('tick = 2599 时跳过', () => {
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 2599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('两次相差 CHECK_INTERVAL 均触发', () => {
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
    sys.update(1, safeWorld(), em, 5200)
    expect((sys as any).lastCheck).toBe(5200)
  })

  it('触发后 tick 不足时跳过', () => {
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 2600)
    sys.update(1, safeWorld(), em, 2600 + 50)
    expect((sys as any).lastCheck).toBe(2600)
  })
})

// ── spawn 条件：tile 不满足 ────────────────────────────────────────────────────

describe('WorldBlowholeSystem spawn 条件：tile 不满足', () => {
  it('tile=GRASS 时即使 random < FORM_CHANCE 也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random > FORM_CHANCE(0.0015) 时不 spawn（即使 tile 正确）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('MAX_BLOWHOLES(15) 已满时不再 spawn', () => {
    const sys = new WorldBlowholeSystem()
    for (let i = 0; i < 15; i++) {
      ;(sys as any).blowholes.push(makeBlowhole())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).blowholes).toHaveLength(15)
    vi.restoreAllMocks()
  })
})

// ── spawn 条件：tile 满足 ─────────────────────────────────────────────────────

describe('WorldBlowholeSystem spawn 条件：tile 满足', () => {
  it('tile=SAND 且 random < FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tile=SHALLOW_WATER 且 random < FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, shallowWorld(), em, 2600)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })

  it('spawn 的 blowhole tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).blowholes[0].tick).toBe(2600)
    vi.restoreAllMocks()
  })

  it('spawn 的 blowhole id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    expect((sys as any).blowholes[0].id).toBe(1)
    vi.restoreAllMocks()
  })

  it('spawn 的 blowhole 包含所有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = new WorldBlowholeSystem()
    sys.update(1, sandWorld(), em, 2600)
    const bh = (sys as any).blowholes[0]
    expect(bh).toHaveProperty('id')
    expect(bh).toHaveProperty('x')
    expect(bh).toHaveProperty('y')
    expect(bh).toHaveProperty('caveDepth')
    expect(bh).toHaveProperty('openingSize')
    expect(bh).toHaveProperty('sprayHeight')
    expect(bh).toHaveProperty('waveForce')
    expect(bh).toHaveProperty('erosionRate')
    expect(bh).toHaveProperty('spectacle')
    expect(bh).toHaveProperty('tick')
    vi.restoreAllMocks()
  })
})

// ── blowholes 数据字段验证 ────────────────────────────────────────────────────

describe('WorldBlowholeSystem blowholes 数据字段', () => {
  let sys: WorldBlowholeSystem
  beforeEach(() => { sys = new WorldBlowholeSystem(); bhNextId = 300 })

  it('注入 blowhole 后可读取', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    expect((sys as any).blowholes).toHaveLength(1)
  })

  it('caveDepth 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ caveDepth: 15 }))
    expect((sys as any).blowholes[0].caveDepth).toBe(15)
  })

  it('openingSize 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ openingSize: 2.5 }))
    expect((sys as any).blowholes[0].openingSize).toBe(2.5)
  })

  it('sprayHeight 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ sprayHeight: 25 }))
    expect((sys as any).blowholes[0].sprayHeight).toBe(25)
  })

  it('waveForce 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ waveForce: 45 }))
    expect((sys as any).blowholes[0].waveForce).toBe(45)
  })

  it('erosionRate 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ erosionRate: 3 }))
    expect((sys as any).blowholes[0].erosionRate).toBe(3)
  })

  it('spectacle 字段存在', () => {
    ;(sys as any).blowholes.push(makeBlowhole({ spectacle: 55 }))
    expect((sys as any).blowholes[0].spectacle).toBe(55)
  })

  it('多个 blowhole 全部保留', () => {
    ;(sys as any).blowholes.push(makeBlowhole())
    ;(sys as any).blowholes.push(makeBlowhole())
    expect((sys as any).blowholes).toHaveLength(2)
  })
})

// ── 动态属性更新（每次 update 调整） ─────────────────────────────────────────

describe('WorldBlowholeSystem 动态属性更新', () => {
  it('openingSize 随 erosionRate 缓慢增大（上限 8）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ openingSize: 1.0, erosionRate: 5 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    // openingSize += erosionRate * 0.00005 = 5 * 0.00005 = 0.00025
    expect((sys as any).blowholes[0].openingSize).toBeGreaterThan(1.0)
    expect((sys as any).blowholes[0].openingSize).toBeLessThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('openingSize 不超过上限 8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ openingSize: 8.0, erosionRate: 1000 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].openingSize).toBeLessThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('waveForce 不低于下限 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ waveForce: 5.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].waveForce).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('waveForce 不超过上限 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ waveForce: 80.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].waveForce).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('sprayHeight 不低于下限 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ sprayHeight: 5.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].sprayHeight).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('sprayHeight 不超过上限 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ sprayHeight: 50.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].sprayHeight).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('spectacle 不低于下限 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ spectacle: 5.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].spectacle).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('spectacle 不超过上限 70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const sys = new WorldBlowholeSystem()
    const bh = makeBlowhole({ spectacle: 70.0 })
    ;(sys as any).blowholes.push(bh)
    sys.update(1, safeWorld(), em, 2600)
    expect((sys as any).blowholes[0].spectacle).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })
})

// ── cleanup（过期清理） ────────────────────────────────────────────────────────

describe('WorldBlowholeSystem cleanup', () => {
  it('tick - blowhole.tick >= 88000 时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 0 }))
    // tick=90600, cutoff=90600-88000=2600, blowhole.tick=0 < 2600 → 删除
    sys.update(1, safeWorld(), em, 90600)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick - blowhole.tick < 88000 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 80000 }))
    // tick=90600, cutoff=2600, blowhole.tick=80000 > 2600 → 保留
    sys.update(1, safeWorld(), em, 90600)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('旧 blowhole 删除，新 blowhole 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 0 }))       // 旧
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 88000 }))   // 新
    // tick=90600, cutoff=2600: bh[0].tick=0<2600 删, bh[1].tick=88000>2600 保
    sys.update(1, safeWorld(), em, 90600)
    expect((sys as any).blowholes).toHaveLength(1)
    expect((sys as any).blowholes[0].tick).toBe(88000)
    vi.restoreAllMocks()
  })

  it('cleanup 精确边界：cutoff=tick-88000，blowhole.tick恰好等于cutoff不删', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    // tick=90600, cutoff=2600, blowhole.tick=2600 → 2600 < 2600 false → 保留
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 2600 }))
    sys.update(1, safeWorld(), em, 90600)
    expect((sys as any).blowholes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('cleanup 精确边界：blowhole.tick = cutoff - 1 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sys = new WorldBlowholeSystem()
    // tick=90600, cutoff=2600, blowhole.tick=2599 → 2599 < 2600 → 删除
    ;(sys as any).blowholes.push(makeBlowhole({ tick: 2599 }))
    sys.update(1, safeWorld(), em, 90600)
    expect((sys as any).blowholes).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
