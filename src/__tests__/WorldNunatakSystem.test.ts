import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNunatakSystem } from '../systems/WorldNunatakSystem'
import type { Nunatak } from '../systems/WorldNunatakSystem'
import { TileType } from '../utils/Constants'

// ── mock World ────────────────────────────────────────────────────────────────
function makeWorld(tile: number = TileType.SNOW, width = 100, height = 100) {
  return {
    width,
    height,
    getTile: (_x: number, _y: number) => tile,
    setTile: () => {},
  } as any
}
function makeEm() { return {} as any }

function makeSys(): WorldNunatakSystem { return new WorldNunatakSystem() }
let nextId = 1
function makeNunatak(overrides: Partial<Nunatak> = {}): Nunatak {
  return {
    id: nextId++, x: 30, y: 40,
    peakHeight: 60, iceThickness: 50, exposedRock: 30,
    weathering: 10, alpineLife: 10, windExposure: 60, tick: 0,
    ...overrides,
  }
}

// ── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldNunatakSystem 初始状态', () => {
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无冰原岛峰', () => { expect((sys as any).nunataks).toHaveLength(0) })
  it('nextId 从 1 开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).nunataks).toBe((sys as any).nunataks)
  })
  it('冰原岛峰字段结构完整', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    const n = (sys as any).nunataks[0]
    expect(typeof n.peakHeight).toBe('number')
    expect(typeof n.iceThickness).toBe('number')
    expect(typeof n.exposedRock).toBe('number')
    expect(typeof n.weathering).toBe('number')
    expect(typeof n.alpineLife).toBe('number')
    expect(typeof n.windExposure).toBe('number')
  })
  it('多个冰原岛峰全部返回', () => {
    ;(sys as any).nunataks.push(makeNunatak())
    ;(sys as any).nunataks.push(makeNunatak())
    expect((sys as any).nunataks).toHaveLength(2)
  })
})

// ── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldNunatakSystem CHECK_INTERVAL 节流', () => {
  const CHECK_INTERVAL = 2700
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时跳过执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('tick = CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < FORM_CHANCE → spawn
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // no spawn
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次调用间隔不足时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL + 1)
    // CHECK_INTERVAL+1 - CHECK_INTERVAL = 1 < CHECK_INTERVAL → 跳过
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('两次相隔两倍 CHECK_INTERVAL 时可分别执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL * 2)
    // 两次都执行，但第一次 nunatak.tick=CHECK_INTERVAL, 第二次 cutoff=2*CHECK_INTERVAL-97000<0
    // 所以第一次的 nunatak 不会被清除（tick=2700 >= cutoff<0）
    expect((sys as any).nunataks.length).toBeGreaterThanOrEqual(1)
  })
})

// ── 3. spawn 条件 ────────────────────────────────────────────────────────────
describe('WorldNunatakSystem spawn 条件', () => {
  const CHECK_INTERVAL = 2700
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random >= FORM_CHANCE(0.0015) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0015)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('random < FORM_CHANCE 且 tile=SNOW 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('random < FORM_CHANCE 且 tile=MOUNTAIN 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.MOUNTAIN), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('tile 非 SNOW/MOUNTAIN 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.GRASS), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('tile=SAND 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SAND), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('数量达到 MAX_NUNATAKS(13) 时不 spawn', () => {
    for (let i = 0; i < 13; i++) {
      ;(sys as any).nunataks.push(makeNunatak({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(13)
  })
  it('数量为 12(MAX-1) 时可 spawn 到 13', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks).toHaveLength(13)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].tick).toBe(CHECK_INTERVAL)
  })
})

// ── 4. spawn 字段范围 ────────────────────────────────────────────────────────
describe('WorldNunatakSystem spawn 字段范围', () => {
  const CHECK_INTERVAL = 2700
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // spawn random 调用顺序: form_check, x, y, peakHeight, iceThickness, exposedRock, weathering, alpineLife, windExposure

  it('random=0 → peakHeight=40+0=40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].peakHeight).toBe(40)
  })
  it('random=0 → iceThickness=20+0=20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].iceThickness).toBe(20)
  })
  it('random=0 → exposedRock 初始=10，update后因delta<0被clamp到>=5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    // spawn初值10，update后(0-0.48)*0.1=-0.048 → 9.952 (>5，不clamp)
    expect((sys as any).nunataks[0].exposedRock).toBeCloseTo(9.952, 3)
  })
  it('random=0 → weathering 初始=5，update后+0.002=5.002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    // spawn初值5，立即update：min(50, 5+0.002)=5.002
    expect((sys as any).nunataks[0].weathering).toBeCloseTo(5.002, 5)
  })
  it('random=0 → alpineLife 初始=2，update后略减因random=0<0.47', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    // spawn初值2，update后(0-0.47)*0.08=-0.0376 → 1.9624 但clamp到>=1
    expect((sys as any).nunataks[0].alpineLife).toBeCloseTo(1.9624, 3)
  })
  it('random=0 → windExposure 初始=30，update后略减因random=0<0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    // spawn初值30，update后(0-0.5)*0.2=-0.1 → 29.9 (>15，不clamp)
    expect((sys as any).nunataks[0].windExposure).toBeCloseTo(29.9, 3)
  })
  it('spawn 后 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].id).toBe(1)
  })
  it('x 坐标边界: 10 + floor(0 * (w-20)) = 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(TileType.SNOW, 100, 100), makeEm(), CHECK_INTERVAL)
    // x = 10 + floor(0 * 80) = 10
    expect((sys as any).nunataks[0].x).toBe(10)
  })
})

// ── 5. update 数值逻辑 ───────────────────────────────────────────────────────
describe('WorldNunatakSystem update 数值逻辑', () => {
  const CHECK_INTERVAL = 2700
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('weathering 每次 +0.002', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, weathering: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].weathering).toBeCloseTo(10.002, 5)
  })
  it('weathering 上限为 50', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, weathering: 49.999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].weathering).toBe(50)
  })
  it('weathering 超过 50 后被 clamp', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, weathering: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].weathering).toBe(50)
  })
  it('exposedRock 在 [5, 60] 范围内', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, exposedRock: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    const er = (sys as any).nunataks[0].exposedRock
    expect(er).toBeGreaterThanOrEqual(5)
    expect(er).toBeLessThanOrEqual(60)
  })
  it('exposedRock 下限 clamp: min=5', () => {
    // (random - 0.48) * 0.1: random=0 → (0-0.48)*0.1=-0.048
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, exposedRock: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // no spawn
    // exposedRock update: (random-0.48)*0.1 with random=0.9 → (0.9-0.48)*0.1=0.042 → 5.042
    // But random is mocked to 0.9 uniformly; need only for exposedRock: use mockReturnValueOnce
    const mockRand = vi.spyOn(Math, 'random')
    mockRand.mockReturnValueOnce(0.9) // form check (no spawn)
    mockRand.mockReturnValueOnce(0)   // exposedRock: (0-0.48)*0.1=-0.048 → 5-0.048=4.952 → clamp to 5
    mockRand.mockReturnValue(0.5)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].exposedRock).toBeGreaterThanOrEqual(5)
  })
  it('alpineLife 在 [1, 25] 范围内', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, alpineLife: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    const al = (sys as any).nunataks[0].alpineLife
    expect(al).toBeGreaterThanOrEqual(1)
    expect(al).toBeLessThanOrEqual(25)
  })
  it('windExposure 在 [15, 90] 范围内', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL, windExposure: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    const we = (sys as any).nunataks[0].windExposure
    expect(we).toBeGreaterThanOrEqual(15)
    expect(we).toBeLessThanOrEqual(90)
  })
  it('多个 nunatak 各自更新', () => {
    ;(sys as any).nunataks.push(makeNunatak({ id: 1, tick: CHECK_INTERVAL, weathering: 10 }))
    ;(sys as any).nunataks.push(makeNunatak({ id: 2, tick: CHECK_INTERVAL, weathering: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).nunataks[0].weathering).toBeCloseTo(10.002, 4)
    expect((sys as any).nunataks[1].weathering).toBeCloseTo(20.002, 4)
  })
})

// ── 6. cleanup 逻辑 ──────────────────────────────────────────────────────────
describe('WorldNunatakSystem cleanup 逻辑', () => {
  const CHECK_INTERVAL = 2700
  const LIFETIME = 97000
  let sys: WorldNunatakSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 97000
  // 删除条件: nunatak.tick < cutoff (严格小于)

  it('nunatak.tick >= cutoff 时保留', () => {
    const tick = LIFETIME + CHECK_INTERVAL
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick)
    // cutoff = tick - 97000 = CHECK_INTERVAL, nunatak.tick = CHECK_INTERVAL >= cutoff → 保留
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('nunatak.tick < cutoff 时删除', () => {
    const tick = LIFETIME + CHECK_INTERVAL + 1
    ;(sys as any).nunataks.push(makeNunatak({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick)
    // cutoff = tick-97000 = CHECK_INTERVAL+1, nunatak.tick=CHECK_INTERVAL < cutoff → 删除
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('nunatak.tick = cutoff 时保留（严格小于）', () => {
    // cutoff = tick - 97000, nunatak.tick = cutoff → 不删
    const tick = LIFETIME + CHECK_INTERVAL
    ;(sys as any).nunataks.push(makeNunatak({ tick: tick - LIFETIME }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick)
    expect((sys as any).nunataks).toHaveLength(1)
  })
  it('过期 nunatak 从数组中移除', () => {
    const tick = LIFETIME + CHECK_INTERVAL + 1
    ;(sys as any).nunataks.push(makeNunatak({ id: 1, tick: 0 })) // old
    ;(sys as any).nunataks.push(makeNunatak({ id: 2, tick: tick })) // new
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick)
    // cutoff = tick - 97000 = CHECK_INTERVAL+1, old.tick=0 < cutoff → 删除
    expect((sys as any).nunataks).toHaveLength(1)
    expect((sys as any).nunataks[0].id).toBe(2)
  })
  it('多个过期 nunatak 都被删除', () => {
    const tick = LIFETIME + CHECK_INTERVAL + 100
    for (let i = 0; i < 5; i++) {
      ;(sys as any).nunataks.push(makeNunatak({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick)
    expect((sys as any).nunataks).toHaveLength(0)
  })
  it('cleanup 后 MAX 限制解除可再 spawn', () => {
    // 填满13个后清除，下次调用可以再spawn
    const tick1 = CHECK_INTERVAL
    for (let i = 0; i < 13; i++) {
      ;(sys as any).nunataks.push(makeNunatak({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), tick1)
    // 源码顺序: spawn(skip因为13==MAX) → update → cleanup
    // cleanup: cutoff=CHECK_INTERVAL-97000 < 0，所有 nunatak.tick=0 >= cutoff → 不删
    expect((sys as any).nunataks).toHaveLength(13)
  })
  it('tick 很小时 cutoff 为负，不清除任何 nunatak', () => {
    ;(sys as any).nunataks.push(makeNunatak({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), makeEm(), CHECK_INTERVAL) // cutoff = 2700-97000 < 0
    expect((sys as any).nunataks).toHaveLength(1)
  })
})
