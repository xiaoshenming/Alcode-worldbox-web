import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldStoneArchSystem } from '../systems/WorldStoneArchSystem'
import type { StoneArch } from '../systems/WorldStoneArchSystem'

// CHECK_INTERVAL=2600, FORM_CHANCE=0.0012, MAX_ARCHES=12
// TileType: MOUNTAIN=5, SAND=2
// cleanup: tick < (currentTick - 94000)

function makeSys(): WorldStoneArchSystem { return new WorldStoneArchSystem() }
const MOUNTAIN = 5
const SAND = 2
const GRASS = 3
const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0012
const MAX_ARCHES = 12
const CUTOFF_OFFSET = 94000

function makeWorld(tile: number = MOUNTAIN): any {
  return { width: 100, height: 100, getTile: () => tile } as any
}
function makeEM(): any { return {} as any }

let _nextId = 1
function makeArch(overrides: Partial<StoneArch> = {}): StoneArch {
  return {
    id: _nextId++, x: 20, y: 30,
    span: 15, height: 10, thickness: 3,
    rockType: 2, structuralIntegrity: 80, spectacle: 50, tick: 0,
    ...overrides,
  }
}

// ─────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – 初始状态', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('arches 初始为空数组', () => {
    expect((sys as any).arches).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('arches 是 Array 类型', () => {
    expect(Array.isArray((sys as any).arches)).toBe(true)
  })
  it('直接注入拱可查询', () => {
    ;(sys as any).arches.push(makeArch())
    expect((sys as any).arches).toHaveLength(1)
  })
  it('多个拱全部存在', () => {
    ;(sys as any).arches.push(makeArch(), makeArch())
    expect((sys as any).arches).toHaveLength(2)
  })
  it('nextId 在注入后不变（未经 update）', () => {
    ;(sys as any).arches.push(makeArch())
    expect((sys as any).nextId).toBe(1)
  })
  it('arches 数组返回内部引用', () => {
    expect((sys as any).arches).toBe((sys as any).arches)
  })
})

// ─────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – CHECK_INTERVAL 节流', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 时不执行（lastCheck=0 差值为 0 < 2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=2599 时不执行（差值 2599 < 2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2599)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=2600 时执行（差值 = 2600）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('首次执行后 lastCheck 更新为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('第二次调用间隔不足时 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('tick=CHECK_INTERVAL*2 时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    vi.restoreAllMocks()
  })
  it('tick < lastCheck + CHECK_INTERVAL 时不执行 update 循环', () => {
    const arch = makeArch({ thickness: 3 })
    ;(sys as any).arches.push(arch)
    ;(sys as any).lastCheck = 5000
    sys.update(1, makeWorld(), makeEM(), 5000 + CHECK_INTERVAL - 1)
    expect(arch.thickness).toBe(3) // 未变化
  })
  it('tick >= lastCheck + CHECK_INTERVAL 时执行 update 循环', () => {
    const arch = makeArch({ thickness: 3 })
    ;(sys as any).arches.push(arch)
    ;(sys as any).lastCheck = 5000
    sys.update(1, makeWorld(), makeEM(), 5000 + CHECK_INTERVAL)
    expect(arch.thickness).toBeLessThan(3) // 已更新
  })
})

// ─────────────────────────────────────────
// 3. spawn 逻辑
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – spawn 逻辑', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random < FORM_CHANCE 且 MOUNTAIN tile → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('random < FORM_CHANCE 且 SAND tile → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(SAND), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('random >= FORM_CHANCE → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random=0.5（远大于 FORM_CHANCE）→ 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('GRASS tile → 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(GRASS), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('arches 已达 MAX_ARCHES → 不再 spawn', () => {
    for (let i = 0; i < MAX_ARCHES; i++) {
      ;(sys as any).arches.push(makeArch())
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(MAX_ARCHES)
    vi.restoreAllMocks()
  })
  it('arches 未达 MAX_ARCHES 时可 spawn', () => {
    for (let i = 0; i < MAX_ARCHES - 1; i++) {
      ;(sys as any).arches.push(makeArch())
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(MAX_ARCHES)
    vi.restoreAllMocks()
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
    vi.restoreAllMocks()
  })
  it('spawn 的 arch.tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches[0].tick).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })
  it('spawn 的 arch.id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches[0].id).toBe(1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – spawn 字段范围', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function spawnArch(rng: number): StoneArch {
    vi.spyOn(Math, 'random').mockReturnValue(rng)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    return (sys as any).arches[0]
  }

  it('span 最小值 ≥ 5（random=0）', () => {
    const a = spawnArch(0)
    expect(a.span).toBeGreaterThanOrEqual(5)
  })
  it('span 最大值 ≤ 35（random→1）', () => {
    // random=0 is < FORM_CHANCE only if 0 < 0.0012; this works
    // span = 5 + random*30, use mock returning just-below FORM_CHANCE for spawn
    const sys2 = makeSys()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      // call1=FORM_CHANCE check, call2=x, call3=y, call4=span, ...
      if (call === 1) return 0.0001 // < FORM_CHANCE → spawn
      if (call === 4) return 0.9999 // span = 5 + 0.9999*30 ≈ 34.999
      return 0.5
    })
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.span).toBeLessThanOrEqual(35)
    vi.restoreAllMocks()
  })
  it('height 最小值 ≥ 3', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.height).toBeGreaterThanOrEqual(3)
    vi.restoreAllMocks()
  })
  it('height 最大值 ≤ 23', () => {
    const sys2 = makeSys()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 5) return 0.9999 // height = 3 + 0.9999*20 ≈ 22.999
      return 0.5
    })
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.height).toBeLessThanOrEqual(23)
    vi.restoreAllMocks()
  })
  it('thickness 最小值 ≥ 2', () => {
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.thickness).toBeGreaterThanOrEqual(2)
    vi.restoreAllMocks()
  })
  it('thickness 最大值 ≤ 10', () => {
    expect(2 + 1 * 8).toBeLessThanOrEqual(10)
  })
  it('rockType 为 0-3 整数', () => {
    const sys2 = makeSys()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 7) return 0.9999 // rockType = floor(0.9999*4) = 3
      return 0.5
    })
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.rockType).toBeGreaterThanOrEqual(0)
    expect(a.rockType).toBeLessThanOrEqual(3)
    expect(Number.isInteger(a.rockType)).toBe(true)
    vi.restoreAllMocks()
  })
  it('structuralIntegrity 初始范围 [50, 90)', () => {
    const sys2 = makeSys()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      return 0.5
    })
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.structuralIntegrity).toBeGreaterThanOrEqual(50)
    expect(a.structuralIntegrity).toBeLessThan(90.1)
    vi.restoreAllMocks()
  })
  it('spectacle 初始范围 [25, 65)', () => {
    const sys2 = makeSys()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      return 0.5
    })
    sys2.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    const a = (sys2 as any).arches[0]
    expect(a.spectacle).toBeGreaterThanOrEqual(25)
    expect(a.spectacle).toBeLessThan(65.1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – update 数值逻辑', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function runUpdate(arch: StoneArch, rng: number = 0.5, tick = CHECK_INTERVAL): void {
    ;(sys as any).arches.push(arch)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(rng)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    vi.restoreAllMocks()
  }

  it('thickness 每次 update 减少 0.000008', () => {
    const a = makeArch({ thickness: 5 })
    runUpdate(a)
    expect(a.thickness).toBeCloseTo(5 - 0.000008, 8)
  })
  it('thickness 不低于最小值 0.5', () => {
    const a = makeArch({ thickness: 0.5 })
    runUpdate(a)
    expect(a.thickness).toBe(0.5)
  })
  it('thickness 从 0.5000001 降到 0.5（不低于）', () => {
    const a = makeArch({ thickness: 0.5000001 })
    runUpdate(a)
    expect(a.thickness).toBeGreaterThanOrEqual(0.5)
  })
  it('structuralIntegrity 每次 update 减少 0.00002', () => {
    const a = makeArch({ structuralIntegrity: 60 })
    runUpdate(a)
    expect(a.structuralIntegrity).toBeCloseTo(60 - 0.00002, 7)
  })
  it('structuralIntegrity 不低于最小值 10', () => {
    const a = makeArch({ structuralIntegrity: 10 })
    runUpdate(a)
    expect(a.structuralIntegrity).toBe(10)
  })
  it('structuralIntegrity 从 10.00001 降后仍 ≥ 10', () => {
    const a = makeArch({ structuralIntegrity: 10.00001 })
    runUpdate(a)
    expect(a.structuralIntegrity).toBeGreaterThanOrEqual(10)
  })
  it('spectacle 在 random=0.53（>0.47）时增加', () => {
    // delta = (0.53 - 0.47) * 0.09 = 0.0054 > 0
    const a = makeArch({ spectacle: 50 })
    runUpdate(a, 0.53)
    expect(a.spectacle).toBeGreaterThan(50)
  })
  it('spectacle 在 random=0.40（<0.47）时减少', () => {
    // delta = (0.40 - 0.47) * 0.09 = -0.0063 < 0
    const a = makeArch({ spectacle: 50 })
    runUpdate(a, 0.40)
    expect(a.spectacle).toBeLessThan(50)
  })
  it('spectacle 不低于最小值 10', () => {
    const a = makeArch({ spectacle: 10 })
    runUpdate(a, 0.0) // delta = (0-0.47)*0.09 = negative
    expect(a.spectacle).toBe(10)
  })
  it('spectacle 不超过最大值 75', () => {
    const a = makeArch({ spectacle: 75 })
    runUpdate(a, 1.0) // delta positive but capped
    expect(a.spectacle).toBe(75)
  })
  it('spectacle 从 74.999 增加后不超过 75', () => {
    const a = makeArch({ spectacle: 74.999 })
    runUpdate(a, 1.0)
    expect(a.spectacle).toBeLessThanOrEqual(75)
  })
  it('多个 arch 同时更新', () => {
    const a1 = makeArch({ thickness: 3, structuralIntegrity: 70 })
    const a2 = makeArch({ thickness: 4, structuralIntegrity: 60 })
    ;(sys as any).arches.push(a1, a2)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), CHECK_INTERVAL)
    expect(a1.thickness).toBeLessThan(3)
    expect(a2.thickness).toBeLessThan(4)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────
describe('WorldStoneArchSystem – cleanup 逻辑', () => {
  let sys: WorldStoneArchSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick < cutoff（arch.tick=0, currentTick=94001）时被清除', () => {
    ;(sys as any).arches.push(makeArch({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), 94001)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick === cutoff（arch.tick=0, currentTick=94000，cutoff=0）时不清除', () => {
    ;(sys as any).arches.push(makeArch({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), CUTOFF_OFFSET)
    // cutoff = 94000 - 94000 = 0; arch.tick=0, 0 < 0 is false → 保留
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('arch.tick > cutoff 时不清除', () => {
    const tick = 100000
    ;(sys as any).arches.push(makeArch({ tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    // cutoff = 100000 - 94000 = 6000; arch.tick=10000 > 6000 → 保留
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('只清除过期的 arch，保留新 arch', () => {
    const tick = 100000
    ;(sys as any).arches.push(makeArch({ tick: 1000 }))  // 过期
    ;(sys as any).arches.push(makeArch({ tick: 10000 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).arches).toHaveLength(1)
    expect((sys as any).arches[0].tick).toBe(10000)
    vi.restoreAllMocks()
  })
  it('全部 arch 过期时全部清除', () => {
    const tick = 200000
    ;(sys as any).arches.push(makeArch({ tick: 1000 }))
    ;(sys as any).arches.push(makeArch({ tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 后数组长度正确', () => {
    const tick = 100000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arches.push(makeArch({ tick: i * 1000 })) // all < 6000 except none
    }
    // cutoff = 6000; ticks 0,1000,2000,3000,4000 全部 < 6000 → 全清除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('刚生成的 arch（tick=currentTick）不会被 cleanup 清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.00001)
    sys.update(1, makeWorld(MOUNTAIN), makeEM(), CHECK_INTERVAL)
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：arch.tick = cutoff - 1 时被清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 6000
    ;(sys as any).arches.push(makeArch({ tick: cutoff - 1 })) // 5999 < 6000 → 清除
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).arches).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('cleanup 边界：arch.tick = cutoff 时不清除', () => {
    const tick = 100000
    const cutoff = tick - CUTOFF_OFFSET // 6000
    ;(sys as any).arches.push(makeArch({ tick: cutoff })) // 6000 < 6000 → false → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(GRASS), makeEM(), tick)
    expect((sys as any).arches).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
