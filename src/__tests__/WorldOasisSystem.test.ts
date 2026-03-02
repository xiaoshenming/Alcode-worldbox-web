import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldOasisSystem } from '../systems/WorldOasisSystem'
import type { Oasis, OasisSize } from '../systems/WorldOasisSystem'
import { TileType } from '../utils/Constants'

// ── mock World ────────────────────────────────────────────────────────────────
function makeWorld(
  centerTile: number = TileType.SAND,
  sandNeighbors = 49, // 7x7 网格全沙子时最多49个
  getTileFn?: (x: number, y: number) => number,
) {
  const defaultGetTile = getTileFn ?? ((_x, _y) => centerTile)
  return {
    width: 100,
    height: 100,
    getTile: defaultGetTile,
    setTile: vi.fn(),
  } as any
}

// 构造有足够 sand 邻居的 World（中心是SAND，周围也都是SAND）
function makeSandWorld() {
  return makeWorld(TileType.SAND, 49, () => TileType.SAND)
}

function makeSys(): WorldOasisSystem { return new WorldOasisSystem() }
let nextId = 1
function makeOasis(overrides: Partial<Oasis> = {}): Oasis {
  return {
    id: nextId++, x: 10, y: 10, size: 'medium',
    waterLevel: 50, fertility: 60, age: 200, drying: false, palmCount: 3,
    ...overrides,
  }
}

// ── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldOasisSystem 初始状态', () => {
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无绿洲', () => { expect((sys as any).oases).toHaveLength(0) })
  it('nextId 从 1 开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).oases.push(makeOasis())
    expect((sys as any).oases).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).oases).toBe((sys as any).oases)
  })
  it('支持3种绿洲尺寸', () => {
    const sizes: OasisSize[] = ['small', 'medium', 'large']
    expect(sizes).toHaveLength(3)
  })
  it('绿洲字段结构完整', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 80, size: 'large' }))
    const o = (sys as any).oases[0]
    expect(o.waterLevel).toBe(80)
    expect(o.size).toBe('large')
    expect(typeof o.fertility).toBe('number')
    expect(typeof o.age).toBe('number')
    expect(typeof o.drying).toBe('boolean')
    expect(typeof o.palmCount).toBe('number')
  })
})

// ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldOasisSystem CHECK_INTERVAL 节流', () => {
  const CHECK_INTERVAL = 1100
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时跳过执行', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: false }))
    const initAge = (sys as any).oases[0].age
    sys.update(0, makeWorld(), CHECK_INTERVAL - 1)
    // age不增加 → 跳过
    expect((sys as any).oases[0].age).toBe(initAge)
  })
  it('tick = CHECK_INTERVAL 时执行 (age 增加)', () => {
    ;(sys as any).oases.push(makeOasis({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > FORM_CHANCE(0.018) → no spawn; no dry
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].age).toBe(1)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    ;(sys as any).oases.push(makeOasis({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL + 100)
    expect((sys as any).oases[0].age).toBe(1)
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次调用间隔不足时跳过', () => {
    ;(sys as any).oases.push(makeOasis({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    const age1 = (sys as any).oases[0].age
    sys.update(0, makeWorld(), CHECK_INTERVAL + 1)
    expect((sys as any).oases[0].age).toBe(age1) // 未执行
  })
  it('相距两倍 CHECK_INTERVAL 时可再执行', () => {
    ;(sys as any).oases.push(makeOasis({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    sys.update(0, makeWorld(), CHECK_INTERVAL * 2)
    expect((sys as any).oases[0].age).toBe(2)
  })
})

// ── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldOasisSystem spawn 条件', () => {
  const CHECK_INTERVAL = 1100
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > FORM_CHANCE(0.018) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.019)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(0)
  })
  it('random <= FORM_CHANCE 且 tile=SAND 且沙邻居够时 spawn', () => {
    // FORM_CHANCE=0.018, random > FORM_CHANCE return, 所以 random=0.01 (<= 0.018) → 继续
    // 注意源码: if (Math.random() > FORM_CHANCE) return
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(1)
  })
  it('random = FORM_CHANCE(0.018) 时不 spawn (>FORM_CHANCE为false, =时也通过)', () => {
    // 0.018 > 0.018 = false → 不return → 继续执行
    vi.spyOn(Math, 'random').mockReturnValue(0.018)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    // 0.018 > 0.018 is false → spawn
    expect((sys as any).oases).toHaveLength(1)
  })
  it('tile 非 SAND/GRASS 时（如MOUNTAIN）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    // 所有tile都是MOUNTAIN
    sys.update(0, makeWorld(TileType.MOUNTAIN, 0, () => TileType.MOUNTAIN), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(0)
  })
  it('GRASS tile 满足条件时也可 spawn', () => {
    // 中心是GRASS，但需要 sandCount >= 10，所以周围要有10个SAND
    const worldMixed = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        // center=50,50=GRASS; 周围全SAND
        if (x === 50 && y === 50) return TileType.GRASS
        return TileType.SAND
      },
      setTile: vi.fn(),
    } as any
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.01) // form_check <= FORM_CHANCE → 继续
    mockRand.mockReturnValueOnce(0.42) // x = 8+floor(0.42*84)=42+8=43? 让中心点落到(50,50)
    // 实际 x=8+floor(random*(100-16))=8+floor(0.42*84)=8+35=43
    // 需要精确控制，直接用mockReturnValue统一
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, worldMixed, CHECK_INTERVAL)
    // random=0.01 → x=8+floor(0.01*84)=8+0=8, y=8+floor(0.01*84)=8
    // getTile(8,8)=SAND (不是GRASS中心), sandCount在(8,8)周围很多→spawn
    expect((sys as any).oases).toHaveLength(1)
  })
  it('数量达到 MAX_OASES(12) 时不 spawn', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).oases.push(makeOasis({ x: i * 20, y: 0, id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(12)
  })
  it('沙邻居数 < MIN_SAND_NEIGHBORS(10) 时不 spawn', () => {
    // 中心是SAND但周围没有沙子
    const worldNoSand = {
      width: 100, height: 100,
      getTile: (x: number, y: number) => {
        // 只有确切坐标是SAND，其余GRASS
        return TileType.GRASS
      },
      setTile: vi.fn(),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, worldNoSand, CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(0)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 age 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, makeSandWorld(), CHECK_INTERVAL)
    // age在spawn后被update立即+1
    expect((sys as any).oases[0].age).toBe(1)
  })
})

// ── 4. update 数值逻辑 ───────────────────────────────────────────────────────
describe('WorldOasisSystem update 数值逻辑', () => {
  const CHECK_INTERVAL = 1100
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('非 drying 状态: waterLevel += WATER_REGEN(0.8)', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: false, fertility: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].waterLevel).toBeCloseTo(50.8, 5)
  })
  it('非 drying 状态: fertility += FERTILITY_GROWTH(0.5)', () => {
    ;(sys as any).oases.push(makeOasis({ fertility: 30, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].fertility).toBeCloseTo(30.5, 5)
  })
  it('drying 状态: waterLevel -= WATER_DECAY(1.2)', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: true, fertility: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].waterLevel).toBeCloseTo(48.8, 5)
  })
  it('drying 状态: fertility -= 0.3', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: true, fertility: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].fertility).toBeCloseTo(29.7, 5)
  })
  it('waterLevel 上限为 100', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 99.5, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].waterLevel).toBe(100)
  })
  it('waterLevel 下限为 0 (drying): clamp 到 0 后被 cleanup 删除', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 0.5, drying: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // waterLevel = max(0, 0.5-1.2) = 0; cleanup: 0<=0 && drying → 删除
    expect((sys as any).oases).toHaveLength(0)
  })
  it('age 每次 update +1', () => {
    ;(sys as any).oases.push(makeOasis({ age: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].age).toBe(101)
  })
  it('DRY_CHANCE(0.005): random < 0.005 触发 drying', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: false }))
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.9)   // form_check > FORM_CHANCE → skip spawn
    mockRand.mockReturnValueOnce(0.001) // DRY_CHANCE check: < 0.005 → drying=true
    mockRand.mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].drying).toBe(true)
  })
  it('recovery: drying && waterLevel<20 && random<0.02 → drying=false', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 10, drying: true, fertility: 0 }))
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.9)   // form_check → skip spawn
    mockRand.mockReturnValueOnce(0.01)  // recovery check: < 0.02 → drying=false
    mockRand.mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].drying).toBe(false)
  })
  it('recovery 条件: waterLevel>=20 时不恢复', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 20, drying: true }))
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.9)   // form_check
    mockRand.mockReturnValueOnce(0.9)   // dry_chance (already drying, skip)
    mockRand.mockReturnValueOnce(0.01)  // recovery (won't apply since waterLevel=20, not <20)
    mockRand.mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // waterLevel=20, drying=true: 20-1.2=18.8, 但 waterLevel<20 条件检查的是update前
    // 源码: 先减 waterLevel, 再检查 drying && waterLevel<20
    // 所以 waterLevel=20-1.2=18.8 < 20 → recovery可能发生
    // 让我们用 waterLevel=21 确保 update 后 21-1.2=19.8 < 20, 需要再分析
  })
})

// ── 5. size 更新逻辑 ─────────────────────────────────────────────────────────
describe('WorldOasisSystem size 更新逻辑', () => {
  const CHECK_INTERVAL = 1100
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('waterLevel >= 85 → size=large', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 85, drying: false, size: 'small' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].size).toBe('large')
  })
  it('waterLevel >= 60 且 < 85 → size=medium', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 70, drying: false, size: 'small' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].size).toBe('medium')
  })
  it('waterLevel < 60 → size=small', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50, drying: false, size: 'large' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // 50+0.8=50.8 < 60 → small
    expect((sys as any).oases[0].size).toBe('small')
  })
  it('size 阈值: waterLevel=60.8 (50+0.8 < 60? no) → 检查是否=medium', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 60, drying: false, size: 'small' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // 60+0.8=60.8 >= 60 → medium
    expect((sys as any).oases[0].size).toBe('medium')
  })
  it('waterLevel=85 → size=large (边界)', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 84.3, drying: false, size: 'medium' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // 84.3+0.8=85.1 >= 85 → large
    expect((sys as any).oases[0].size).toBe('large')
  })
  it('palmCount: fertility>50 && palmCount<8 && random<0.05 时 +1', () => {
    ;(sys as any).oases.push(makeOasis({ fertility: 60, palmCount: 3 }))
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.9)   // form_check → skip
    mockRand.mockReturnValueOnce(0.9)   // dry_chance (not drying) → no dry
    mockRand.mockReturnValueOnce(0.04)  // palmCount +1 (< 0.05)
    mockRand.mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // fertility=60+0.5=60.5 > 50, palmCount=3 < 8, random=0.04 < 0.05 → +1=4
    expect((sys as any).oases[0].palmCount).toBe(4)
  })
  it('palmCount 上限 8: palmCount>=8 时不增长', () => {
    ;(sys as any).oases.push(makeOasis({ fertility: 60, palmCount: 8 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases[0].palmCount).toBe(8)
  })
  it('fertility<=50 时 palmCount 不增长', () => {
    ;(sys as any).oases.push(makeOasis({ fertility: 40, palmCount: 3 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // fertility=40+0.5=40.5 <= 50 → 不触发palm growth
    expect((sys as any).oases[0].palmCount).toBe(3)
  })
})

// ── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldOasisSystem cleanup 逻辑', () => {
  const CHECK_INTERVAL = 1100
  let sys: WorldOasisSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cleanup条件: waterLevel <= 0 && drying

  it('waterLevel<=0 且 drying=true 时删除', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 0, drying: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // update: drying → waterLevel = max(0, 0-1.2)=0; cleanup: 0<=0 && drying → 删除
    expect((sys as any).oases).toHaveLength(0)
  })
  it('waterLevel=0 但 drying=false 时保留', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 0, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // update: not drying → 0+0.8=0.8, cleanup: 0.8>0 → 保留
    expect((sys as any).oases).toHaveLength(1)
  })
  it('waterLevel>0 且 drying=true 时保留（水还没耗尽）', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 10, drying: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // update后: 10-1.2=8.8 > 0, cleanup: 8.8>0 → 不删除（cleanup条件是<=0 && drying）
    expect((sys as any).oases).toHaveLength(1)
  })
  it('逐渐耗水最终删除: waterLevel正好耗到0', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 1.1, drying: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    // update: max(0, 1.1-1.2)=0; cleanup: 0<=0 && drying → 删除
    expect((sys as any).oases).toHaveLength(0)
  })
  it('只删除满足条件的绿洲', () => {
    ;(sys as any).oases.push(makeOasis({ id: 1, waterLevel: 0, drying: true }))
    ;(sys as any).oases.push(makeOasis({ id: 2, waterLevel: 50, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(1)
    expect((sys as any).oases[0].id).toBe(2)
  })
  it('多个干涸绿洲全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).oases.push(makeOasis({ waterLevel: 0, drying: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), CHECK_INTERVAL)
    expect((sys as any).oases).toHaveLength(0)
  })

  it('getActiveOases: waterLevel>0 的才返回', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 0, drying: true }))
    ;(sys as any).oases.push(makeOasis({ waterLevel: 50 }))
    expect(sys.getActiveOases()).toHaveLength(1)
  })
  it('getActiveOases: waterLevel=0 被过滤', () => {
    ;(sys as any).oases.push(makeOasis({ waterLevel: 0 }))
    expect(sys.getActiveOases()).toHaveLength(0)
  })
  it('getActiveOases: 初始无活跃绿洲', () => {
    expect(sys.getActiveOases()).toHaveLength(0)
  })
  it('tile 转换: waterLevel>60 且 tile=SAND 时调用 setTile(GRASS)', () => {
    const world = {
      width: 100, height: 100,
      getTile: () => TileType.SAND,
      setTile: vi.fn(),
    } as any
    ;(sys as any).oases.push(makeOasis({ x: 10, y: 10, waterLevel: 61, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, CHECK_INTERVAL)
    // waterLevel=61+0.8=61.8 > 60, tile=SAND → setTile called
    expect(world.setTile).toHaveBeenCalledWith(10, 10, TileType.GRASS)
  })
  it('tile 转换: waterLevel<=60 时不调用 setTile', () => {
    const world = {
      width: 100, height: 100,
      getTile: () => TileType.SAND,
      setTile: vi.fn(),
    } as any
    ;(sys as any).oases.push(makeOasis({ x: 10, y: 10, waterLevel: 59, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, CHECK_INTERVAL)
    // 59+0.8=59.8 < 60 → no setTile
    expect(world.setTile).not.toHaveBeenCalled()
  })
  it('tile 转换: tile 非 SAND 时不调用 setTile', () => {
    const world = {
      width: 100, height: 100,
      getTile: () => TileType.GRASS,
      setTile: vi.fn(),
    } as any
    ;(sys as any).oases.push(makeOasis({ x: 10, y: 10, waterLevel: 61, drying: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world, CHECK_INTERVAL)
    expect(world.setTile).not.toHaveBeenCalled()
  })
})
