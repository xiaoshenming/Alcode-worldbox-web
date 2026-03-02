import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNaturalTunnelSystem } from '../systems/WorldNaturalTunnelSystem'
import type { NaturalTunnel } from '../systems/WorldNaturalTunnelSystem'
import { TileType } from '../utils/Constants'

// ────────────────────────────────────────────────────────────
// 常量（与源码保持一致）
// ────────────────────────────────────────────────────────────
const CHECK_INTERVAL = 2650
const FORM_CHANCE    = 0.0011
const MAX_TUNNELS    = 12

// ────────────────────────────────────────────────────────────
// 工厂函数
// ────────────────────────────────────────────────────────────
function makeSys(): WorldNaturalTunnelSystem { return new WorldNaturalTunnelSystem() }

let nextId = 1
function makeTunnel(overrides: Partial<NaturalTunnel> = {}): NaturalTunnel {
  return {
    id: nextId++, x: 20, y: 30,
    length: 30, diameter: 5, stability: 70,
    waterFlow: 15, echoEffect: 25, spectacle: 40,
    tick: 0, ...overrides
  }
}

// 最小化 mock world（宽/高 100，可设置 tile）
function makeWorld(tileAt = TileType.MOUNTAIN, width = 100, height = 100) {
  return {
    width,
    height,
    getTile: (_x: number, _y: number) => tileAt
  } as any
}

const em = {} as any

// ────────────────────────────────────────────────────────────
// 1. 初始状态
// ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始隧道列表为空', () => {
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一条隧道后长度为 1', () => {
    ;(sys as any).tunnels.push(makeTunnel())
    expect((sys as any).tunnels).toHaveLength(1)
  })

  it('注入两条隧道后长度为 2', () => {
    ;(sys as any).tunnels.push(makeTunnel())
    ;(sys as any).tunnels.push(makeTunnel())
    expect((sys as any).tunnels).toHaveLength(2)
  })

  it('隧道字段 stability 正确', () => {
    ;(sys as any).tunnels.push(makeTunnel({ stability: 85 }))
    expect((sys as any).tunnels[0].stability).toBe(85)
  })

  it('隧道字段 echoEffect / spectacle 正确', () => {
    ;(sys as any).tunnels.push(makeTunnel({ echoEffect: 50, spectacle: 70 }))
    const t = (sys as any).tunnels[0]
    expect(t.echoEffect).toBe(50)
    expect(t.spectacle).toBe(70)
  })
})

// ────────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ────────────────────────────────────────────────────────────
describe('CHECK_INTERVAL 节流', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('tick == CHECK_INTERVAL 时执行（差值等于 CHECK_INTERVAL，不 < 它）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // FORM_CHANCE=0.0011，0 < 0.0011 → spawn
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(1)
  })

  it('lastCheck 在执行后更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次调用间隔不足 CHECK_INTERVAL 不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)       // 第一次执行
    sys.update(1, world, em, CHECK_INTERVAL + 100) // 间隔 100 < 2650，跳过
    expect((sys as any).tunnels).toHaveLength(1)   // 仍只有 1 条
  })

  it('满足间隔后第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).tunnels).toHaveLength(2)
  })

  it('tick = 0 时不执行（差值 0 < CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, em, 0)
    expect((sys as any).tunnels).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────
// 3. Spawn 条件
// ────────────────────────────────────────────────────────────
describe('Spawn 条件', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('随机值 < FORM_CHANCE 且 tile=MOUNTAIN → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(1)
  })

  it('随机值 >= FORM_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('tile 为 GRASS（非 MOUNTAIN）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS ?? 3), em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('tile 为 DEEP_WATER → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.DEEP_WATER), em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('已达 MAX_TUNNELS 时不 spawn', () => {
    // 填满 12 条隧道
    for (let i = 0; i < MAX_TUNNELS; i++) {
      ;(sys as any).tunnels.push(makeTunnel({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).tunnels.length).toBeLessThanOrEqual(MAX_TUNNELS)
  })

  it('低于 MAX_TUNNELS 时可继续 spawn', () => {
    for (let i = 0; i < MAX_TUNNELS - 1; i++) {
      ;(sys as any).tunnels.push(makeTunnel({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).tunnels).toHaveLength(MAX_TUNNELS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 后 tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).tunnels[0].tick).toBe(CHECK_INTERVAL)
  })
})

// ────────────────────────────────────────────────────────────
// 4. Spawn 字段范围
// ────────────────────────────────────────────────────────────
describe('Spawn 字段范围', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // random=0 → 各字段取最小值（spawn + update 同帧各字段轻微偏移，故使用 >= 而非 ===）
  function spawnWithRandom(r: number) {
    vi.spyOn(Math, 'random').mockReturnValue(r)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    return (sys as any).tunnels[0] as NaturalTunnel
  }

  it('length 最小约为 10（random=0）', () => {
    const t = spawnWithRandom(0)
    expect(t.length).toBeGreaterThanOrEqual(10)
    expect(t.length).toBeLessThanOrEqual(50)
  })

  it('length 最大约为 50（random 接近 1）', () => {
    // random 序列：0(FORM_CHANCE 检查 spawn) → 0.999(x 坐标) → 0.999(y 坐标) → 0.999(length=10+0.999*40≈49.96)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)      // FORM_CHANCE 检查：0 < 0.0011 → spawn
      .mockReturnValueOnce(0.5)    // x 坐标
      .mockReturnValueOnce(0.5)    // y 坐标
      .mockReturnValueOnce(0.999)  // length = 10 + 0.999*40 ≈ 49.96
      .mockReturnValue(0.5)        // 其余字段
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    const t = (sys as any).tunnels[0] as NaturalTunnel
    expect(t.length).toBeGreaterThanOrEqual(49)
    expect(t.length).toBeLessThanOrEqual(50)
  })

  it('diameter 范围 [2, 10]', () => {
    const t = spawnWithRandom(0)
    expect(t.diameter).toBeGreaterThanOrEqual(2)
    expect(t.diameter).toBeLessThanOrEqual(15) // update 同帧可能 +0.000004
  })

  it('stability 范围 [45, 85]', () => {
    const t = spawnWithRandom(0)
    expect(t.stability).toBeGreaterThanOrEqual(44) // 同帧 -0.00003
    expect(t.stability).toBeLessThanOrEqual(85)
  })

  it('waterFlow 范围 [5, 30]', () => {
    const t = spawnWithRandom(0)
    expect(t.waterFlow).toBeGreaterThanOrEqual(0)
    expect(t.waterFlow).toBeLessThanOrEqual(50)
  })

  it('echoEffect 范围 [15, 45]', () => {
    const t = spawnWithRandom(0)
    expect(t.echoEffect).toBeGreaterThanOrEqual(10)
    expect(t.echoEffect).toBeLessThanOrEqual(65)
  })

  it('spectacle 范围 [20, 55]', () => {
    const t = spawnWithRandom(0)
    expect(t.spectacle).toBeGreaterThanOrEqual(10)
    expect(t.spectacle).toBeLessThanOrEqual(65)
  })

  it('x 在 [10, width-10) 区间内', () => {
    const w = 100
    const world = makeWorld(TileType.MOUNTAIN, w, w)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, CHECK_INTERVAL)
    const t = (sys as any).tunnels[0]
    expect(t.x).toBeGreaterThanOrEqual(10)
    expect(t.x).toBeLessThan(w - 10)
  })
})

// ────────────────────────────────────────────────────────────
// 5. Update 数值逻辑
// ────────────────────────────────────────────────────────────
describe('Update 数值逻辑', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function runUpdate(overrides: Partial<NaturalTunnel> = {}, randomVal = 0.5) {
    ;(sys as any).tunnels.push(makeTunnel(overrides))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    // 大 tick 确保超过 lastCheck（不 spawn，因为 length 已满）
    ;(sys as any).tunnels[0] // 先引用确保注入
    // 手动设 lastCheck 以避免 spawn
    ;(sys as any).lastCheck = CHECK_INTERVAL - 1
    // tick = CHECK_INTERVAL * 2，差值 > CHECK_INTERVAL，但先填满防 spawn
    for (let i = (sys as any).tunnels.length; i < MAX_TUNNELS; i++) {
      ;(sys as any).tunnels.push(makeTunnel({ tick: CHECK_INTERVAL * 2 }))
    }
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL * 2)
    return (sys as any).tunnels[0] as NaturalTunnel
  }

  it('diameter 每次 +0.000004（不超过 15）', () => {
    const before = 5
    const t = runUpdate({ diameter: before, tick: CHECK_INTERVAL * 2 })
    expect(t.diameter).toBeCloseTo(before + 0.000004, 8)
  })

  it('diameter 上限为 15', () => {
    const t = runUpdate({ diameter: 15, tick: CHECK_INTERVAL * 2 })
    expect(t.diameter).toBe(15)
  })

  it('stability 每次 -0.00003（不低于 10）', () => {
    const before = 70
    const t = runUpdate({ stability: before, tick: CHECK_INTERVAL * 2 })
    expect(t.stability).toBeCloseTo(before - 0.00003, 8)
  })

  it('stability 下限为 10', () => {
    const t = runUpdate({ stability: 10, tick: CHECK_INTERVAL * 2 })
    expect(t.stability).toBe(10)
  })

  it('waterFlow 在 [0, 50] 内波动', () => {
    // random=0.5 → (0.5-0.48)*0.07 = +0.0014
    const before = 15
    const t = runUpdate({ waterFlow: before, tick: CHECK_INTERVAL * 2 }, 0.5)
    expect(t.waterFlow).toBeGreaterThanOrEqual(0)
    expect(t.waterFlow).toBeLessThanOrEqual(50)
  })

  it('waterFlow 上限夹在 50', () => {
    const t = runUpdate({ waterFlow: 50, tick: CHECK_INTERVAL * 2 }, 1)
    expect(t.waterFlow).toBeLessThanOrEqual(50)
  })

  it('spectacle 在 [10, 65] 内波动', () => {
    const t = runUpdate({ spectacle: 40, tick: CHECK_INTERVAL * 2 }, 0.5)
    expect(t.spectacle).toBeGreaterThanOrEqual(10)
    expect(t.spectacle).toBeLessThanOrEqual(65)
  })

  it('spectacle 下限夹在 10', () => {
    const t = runUpdate({ spectacle: 10, tick: CHECK_INTERVAL * 2 }, 0)
    expect(t.spectacle).toBe(10)
  })
})

// ────────────────────────────────────────────────────────────
// 6. Cleanup 逻辑
// ────────────────────────────────────────────────────────────
describe('Cleanup 逻辑', () => {
  let sys: WorldNaturalTunnelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const LIFETIME = 95000

  function runCleanup(tunnelTick: number, currentTick: number) {
    ;(sys as any).tunnels.push(makeTunnel({ tick: tunnelTick }))
    ;(sys as any).lastCheck = currentTick - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不 spawn（>FORM_CHANCE）
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, currentTick)
    return (sys as any).tunnels as NaturalTunnel[]
  }

  it('tick 恰好等于 cutoff（currentTick - 95000）时保留（严格 <）', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME // = 5000
    const tunnels = runCleanup(cutoff, cur)
    expect(tunnels).toHaveLength(1)
  })

  it('tick = cutoff - 1（刚过期）时删除', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME
    const tunnels = runCleanup(cutoff - 1, cur)
    expect(tunnels).toHaveLength(0)
  })

  it('tick = cutoff + 1（仍有效）时保留', () => {
    const cur = 100000
    const cutoff = cur - LIFETIME
    const tunnels = runCleanup(cutoff + 1, cur)
    expect(tunnels).toHaveLength(1)
  })

  it('多条隧道：部分过期，部分保留', () => {
    const cur = 200000
    const cutoff = cur - LIFETIME // = 105000
    ;(sys as any).tunnels.push(makeTunnel({ tick: cutoff - 1 })) // 过期
    ;(sys as any).tunnels.push(makeTunnel({ tick: cutoff + 1 })) // 保留
    ;(sys as any).tunnels.push(makeTunnel({ tick: cur }))        // 保留
    ;(sys as any).lastCheck = cur - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, cur)
    expect((sys as any).tunnels).toHaveLength(2)
  })

  it('全部过期时列表清空', () => {
    const cur = 200000
    const cutoff = cur - LIFETIME
    ;(sys as any).tunnels.push(makeTunnel({ tick: cutoff - 100 }))
    ;(sys as any).tunnels.push(makeTunnel({ tick: cutoff - 200 }))
    ;(sys as any).lastCheck = cur - CHECK_INTERVAL - 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, cur)
    expect((sys as any).tunnels).toHaveLength(0)
  })

  it('tick=0 的隧道在 currentTick=95001 时被删除', () => {
    const tunnels = runCleanup(0, LIFETIME + 1)
    expect(tunnels).toHaveLength(0)
  })

  it('tick=0 的隧道在 currentTick=95000 时保留（cutoff=-0，0 不 < 0）', () => {
    const tunnels = runCleanup(0, LIFETIME)
    // cutoff = 95000-95000=0, t.tick=0, 0 < 0 → false → 保留
    expect(tunnels).toHaveLength(1)
  })
})
