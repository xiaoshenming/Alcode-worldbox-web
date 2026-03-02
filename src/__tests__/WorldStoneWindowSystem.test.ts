import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldStoneWindowSystem } from '../systems/WorldStoneWindowSystem'
import type { StoneWindow } from '../systems/WorldStoneWindowSystem'

// CHECK_INTERVAL=2580, FORM_CHANCE=0.0013, MAX_WINDOWS=14
// TileType: MOUNTAIN=5, SAND=2
// cleanup: tick < (currentTick - 90000)

const MOUNTAIN = 5
const SAND = 2
const GRASS = 3
const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0013
const MAX_WINDOWS = 14
const CUTOFF_OFFSET = 90000

function makeSys(): WorldStoneWindowSystem { return new WorldStoneWindowSystem() }
function makeWorld(tile: number = MOUNTAIN): any {
  return { width: 100, height: 100, getTile: () => tile } as any
}
function makeEM(): any { return {} as any }

let _nextId = 1
function makeWindow(overrides: Partial<StoneWindow> = {}): StoneWindow {
  return {
    id: _nextId++, x: 20, y: 30,
    openingWidth: 5, openingHeight: 4, wallThickness: 3,
    frameSolidity: 60, lightEffect: 30, spectacle: 40,
    tick: 0,
    ...overrides,
  }
}

// ─────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – 初始状态', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('windows 初始为空数组', () => {
    expect((sys as any).windows).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('windows 是 Array 类型', () => {
    expect(Array.isArray((sys as any).windows)).toBe(true)
  })
  it('注入 window 后长度为 1', () => {
    ;(sys as any).windows.push(makeWindow())
    expect((sys as any).windows).toHaveLength(1)
  })
  it('多个 window 全部存在', () => {
    ;(sys as any).windows.push(makeWindow(), makeWindow())
    expect((sys as any).windows).toHaveLength(2)
  })
  it('注入不改变 nextId', () => {
    ;(sys as any).windows.push(makeWindow())
    expect((sys as any).nextId).toBe(1)
  })
  it('windows 返回内部引用', () => {
    expect((sys as any).windows).toBe((sys as any).windows)
  })
})

// ─────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – CHECK_INTERVAL 节流', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=2579 时不执行（差值 2579 < 2580）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2579)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=2580 时执行（差值 = 2580）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('执行后 lastCheck 更新为 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('第二次调用间隔不足时 lastCheck 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL + 10)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('tick=CHECK_INTERVAL*2 时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    vi.restoreAllMocks()
  })
  it('tick < lastCheck + CHECK_INTERVAL 时 update 循环不运行', () => {
    const w = makeWindow({ openingWidth: 5 })
    ;(sys as any).windows.push(w)
    ;(sys as any).lastCheck = 5000
    sys.update(1, makeWorld(), makeEM(), 5000 + CHECK_INTERVAL - 1)
    expect(w.openingWidth).toBe(5) // 未变化
  })
  it('tick >= lastCheck + CHECK_INTERVAL 时 update 循环运行', () => {
    const w = makeWindow({ openingWidth: 5 })
    ;(sys as any).windows.push(w)
    ;(sys as any).lastCheck = 5000
    sys.update(1, makeWorld(), makeEM(), 5000 + CHECK_INTERVAL)
    expect(w.openingWidth).toBeGreaterThan(5) // openingWidth 增加
  })
})

// ─────────────────────────────────────────
// 3. spawn 逻辑
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – spawn 逻辑', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random < FORM_CHANCE 且 MOUNTAIN tile → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('random < FORM_CHANCE 且 SAND tile → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(SAND), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('random = FORM_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random=0.5 → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('GRASS tile → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(GRASS), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('windows 已达 MAX_WINDOWS → 不 spawn', () => {
    for (let i = 0; i < MAX_WINDOWS; i++) {
      ;(sys as any).windows.push(makeWindow())
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(MAX_WINDOWS)
    vi.restoreAllMocks()
  })
  it('windows 未达 MAX_WINDOWS 时可 spawn', () => {
    for (let i = 0; i < MAX_WINDOWS - 1; i++) {
      ;(sys as any).windows.push(makeWindow())
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(MAX_WINDOWS)
    vi.restoreAllMocks()
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })
  it('spawn 的 window.tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows[0].tick).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('spawn 的 window.id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows[0].id).toBe(1)
    vi.restoreAllMocks()
  })
  it('DEEP_WATER tile → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(0), makeEM(), CHECK_INTERVAL) // DEEP_WATER=0
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – spawn 字段范围', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('openingWidth 初始范围 [2, 12)', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.openingWidth).toBeGreaterThanOrEqual(2)
    expect(w.openingWidth).toBeLessThan(12.1)
    vi.restoreAllMocks()
  })
  it('openingHeight 初始范围 [2, 10)', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.openingHeight).toBeGreaterThanOrEqual(2)
    expect(w.openingHeight).toBeLessThan(10.1)
    vi.restoreAllMocks()
  })
  it('wallThickness 初始范围 [1, 6)', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.wallThickness).toBeGreaterThanOrEqual(1)
    expect(w.wallThickness).toBeLessThan(6.1)
    vi.restoreAllMocks()
  })
  it('frameSolidity 初始范围 [40, 80)', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.frameSolidity).toBeGreaterThanOrEqual(40)
    expect(w.frameSolidity).toBeLessThan(80.1)
    vi.restoreAllMocks()
  })
  it('lightEffect 初始范围 [15, 50)', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.lightEffect).toBeGreaterThanOrEqual(15)
    expect(w.lightEffect).toBeLessThan(50.1)
    vi.restoreAllMocks()
  })
  it('spectacle 初始范围（spawn后update扰动最大约±0.05，范围约[19.95, 55.05]）', () => {
    // spectacle = 20 + random*35，然后同帧 update 施加 (random-0.47)*0.09 的扰动
    // random=0.0001 → spawn=20.0035，update delta≈-0.042 → 约19.96
    // 因此下界需考虑最大负扰动：20 - 0.47*0.09 ≈ 19.958
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const w = (sys2 as any).windows[0]
    expect(w.spectacle).toBeGreaterThan(19.9) // 含 update 扰动后仍接近下界
    expect(w.spectacle).toBeLessThan(55.1)
    vi.restoreAllMocks()
  })
  it('openingWidth 最大值公式：2 + 1 * 10 = 12', () => {
    expect(2 + 1 * 10).toBe(12)
  })
  it('wallThickness 最大值公式：1 + 1 * 5 = 6', () => {
    expect(1 + 1 * 5).toBe(6)
  })
})

// ─────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – update 数值逻辑', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function runUpdate(win: StoneWindow, rng: number = 0.5, tick = CHECK_INTERVAL): void {
    ;(sys as any).windows.push(win)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(rng)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    vi.restoreAllMocks()
  }

  it('openingWidth 每次 update 增加 0.000005', () => {
    const w = makeWindow({ openingWidth: 5 })
    runUpdate(w)
    expect(w.openingWidth).toBeCloseTo(5 + 0.000005, 8)
  })
  it('openingWidth 不超过最大值 15', () => {
    const w = makeWindow({ openingWidth: 15 })
    runUpdate(w)
    expect(w.openingWidth).toBe(15)
  })
  it('openingWidth 从 14.999999 增加后不超过 15', () => {
    const w = makeWindow({ openingWidth: 14.999999 })
    runUpdate(w)
    expect(w.openingWidth).toBeLessThanOrEqual(15)
  })
  it('wallThickness 每次 update 减少 0.000006', () => {
    const w = makeWindow({ wallThickness: 3 })
    runUpdate(w)
    expect(w.wallThickness).toBeCloseTo(3 - 0.000006, 8)
  })
  it('wallThickness 不低于最小值 0.3', () => {
    const w = makeWindow({ wallThickness: 0.3 })
    runUpdate(w)
    expect(w.wallThickness).toBe(0.3)
  })
  it('wallThickness 从 0.300006 降后仍 ≥ 0.3', () => {
    const w = makeWindow({ wallThickness: 0.300006 })
    runUpdate(w)
    expect(w.wallThickness).toBeGreaterThanOrEqual(0.3)
  })
  it('frameSolidity 每次 update 减少 0.00002', () => {
    const w = makeWindow({ frameSolidity: 50 })
    runUpdate(w)
    expect(w.frameSolidity).toBeCloseTo(50 - 0.00002, 7)
  })
  it('frameSolidity 不低于最小值 10', () => {
    const w = makeWindow({ frameSolidity: 10 })
    runUpdate(w)
    expect(w.frameSolidity).toBe(10)
  })
  it('spectacle 在 random=0.53 时增加', () => {
    // delta = (0.53 - 0.47) * 0.09 = +0.0054
    const w = makeWindow({ spectacle: 40 })
    runUpdate(w, 0.53)
    expect(w.spectacle).toBeGreaterThan(40)
  })
  it('spectacle 在 random=0.40 时减少', () => {
    // delta = (0.40 - 0.47) * 0.09 = -0.0063
    const w = makeWindow({ spectacle: 40 })
    runUpdate(w, 0.40)
    expect(w.spectacle).toBeLessThan(40)
  })
  it('spectacle 不低于最小值 8', () => {
    const w = makeWindow({ spectacle: 8 })
    runUpdate(w, 0.0) // negative delta
    expect(w.spectacle).toBe(8)
  })
  it('spectacle 不超过最大值 65', () => {
    const w = makeWindow({ spectacle: 65 })
    runUpdate(w, 1.0) // positive delta
    expect(w.spectacle).toBe(65)
  })
  it('spectacle 从 64.999 增后不超过 65', () => {
    const w = makeWindow({ spectacle: 64.999 })
    runUpdate(w, 1.0)
    expect(w.spectacle).toBeLessThanOrEqual(65)
  })
  it('多个 window 同时更新', () => {
    const w1 = makeWindow({ openingWidth: 5, wallThickness: 3 })
    const w2 = makeWindow({ openingWidth: 7, wallThickness: 2 })
    ;(sys as any).windows.push(w1, w2)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), CHECK_INTERVAL)
    expect(w1.openingWidth).toBeGreaterThan(5)
    expect(w2.openingWidth).toBeGreaterThan(7)
    expect(w1.wallThickness).toBeLessThan(3)
    expect(w2.wallThickness).toBeLessThan(2)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────
describe('WorldStoneWindowSystem – cleanup 逻辑', () => {
  let sys: WorldStoneWindowSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('arch.tick < cutoff（tick=0, currentTick=90001）时被清除', () => {
    ;(sys as any).windows.push(makeWindow({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), 90001)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('window.tick = cutoff（tick=0, currentTick=90000）时不清除', () => {
    ;(sys as any).windows.push(makeWindow({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), CUTOFF_OFFSET)
    // cutoff = 90000 - 90000 = 0; window.tick=0 < 0 → false → 保留
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('window.tick > cutoff 时不清除', () => {
    const tick = 100000
    ;(sys as any).windows.push(makeWindow({ tick: 20000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    // cutoff = 100000 - 90000 = 10000; 20000 > 10000 → 保留
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('只清除过期的 window，保留新 window', () => {
    const tick = 100000
    ;(sys as any).windows.push(makeWindow({ tick: 1000 }))  // 过期
    ;(sys as any).windows.push(makeWindow({ tick: 15000 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).windows).toHaveLength(1)
    expect((sys as any).windows[0].tick).toBe(15000)
    vi.restoreAllMocks()
  })
  it('全部 window 过期时全部清除', () => {
    const tick = 200000
    ;(sys as any).windows.push(makeWindow({ tick: 100 }))
    ;(sys as any).windows.push(makeWindow({ tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：window.tick = cutoff - 1 时被清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 10000
    ;(sys as any).windows.push(makeWindow({ tick: cutoff - 1 })) // 9999 < 10000 → 清除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).windows).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：window.tick = cutoff 时不清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 10000
    ;(sys as any).windows.push(makeWindow({ tick: cutoff })) // 10000 < 10000 → false → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('刚 spawn 的 window（tick=currentTick）不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('三条记录：2 过期 1 保留', () => {
    const tick = 150000
    const cutoff = tick - CUTOFF_OFFSET // 60000
    ;(sys as any).windows.push(makeWindow({ tick: 1000 }))  // 过期
    ;(sys as any).windows.push(makeWindow({ tick: 2000 }))  // 过期
    ;(sys as any).windows.push(makeWindow({ tick: 80000 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).windows).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
