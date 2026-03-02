import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLavaTubeSystem } from '../systems/WorldLavaTubeSystem'
import type { LavaTube } from '../systems/WorldLavaTubeSystem'

// ---- 常量（与源码保持一致） ----
const CHECK_INTERVAL = 2680
const MAX_TUBES = 12

// ---- Mock 工厂 ----
function makeSys(): WorldLavaTubeSystem { return new WorldLavaTubeSystem() }

let _nextId = 1
function makeTube(overrides: Partial<LavaTube> = {}): LavaTube {
  return {
    id: _nextId++,
    x: 15, y: 25,
    length: 50,
    diameter: 5,
    crustThickness: 3,
    internalTemp: 500,
    collapseRisk: 20,
    spectacle: 40,
    tick: 0,
    ...overrides
  }
}

/** 阻断 spawn：tile = SAND(2)，不满足 MOUNTAIN(5) 或 LAVA(7) */
function makeBlockWorld() {
  return { width: 100, height: 100, getTile: () => 2 } as any
}

/** 允许 spawn：tile = MOUNTAIN(5) */
function makeMountainWorld() {
  return { width: 100, height: 100, getTile: () => 5 } as any
}

/** 允许 spawn：tile = LAVA(7) */
function makeLavaWorld() {
  return { width: 100, height: 100, getTile: () => 7 } as any
}

function makeEm() { return {} as any }

// ====================================================================
// 1. 初始状态
// ====================================================================
describe('WorldLavaTubeSystem — 初始状态', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tubes 数组初始为空', () => {
    expect((sys as any).tubes).toHaveLength(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tubes 是 Array 实例', () => {
    expect(Array.isArray((sys as any).tubes)).toBe(true)
  })

  it('注入一个 tube 后 length 为 1', () => {
    ;(sys as any).tubes.push(makeTube())
    expect((sys as any).tubes).toHaveLength(1)
  })

  it('tubes 引用稳定（同一对象）', () => {
    const ref = (sys as any).tubes
    expect(ref).toBe((sys as any).tubes)
  })
})

// ====================================================================
// 2. CHECK_INTERVAL 节流
// ====================================================================
describe('WorldLavaTubeSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it(`tick < CHECK_INTERVAL 时不执行（lastCheck 保持 0）`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it(`tick === CHECK_INTERVAL 时执行（差值恰好不满足严格小于）`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it(`tick > CHECK_INTERVAL 时更新 lastCheck`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it(`第一次 check 后，相隔不足 CHECK_INTERVAL 再调用不会再次更新 lastCheck`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it(`连续两次满足 interval 时，lastCheck 更新两次`, () => {
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it(`tick=0 时不执行（lastCheck=0，0-0=0 不满足 < CHECK_INTERVAL 的触发条件……等于0跳过）`, () => {
    // tick=0, lastCheck=0: 0-0=0 < 2680 → return early
    sys.update(1, makeBlockWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ====================================================================
// 3. spawn 条件
// ====================================================================
describe('WorldLavaTubeSystem — spawn 条件', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('SAND tile(2) 不满足 MOUNTAIN/LAVA 条件，不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes).toHaveLength(0)
  })

  it('MOUNTAIN tile + random=0 时 spawn（FORM_CHANCE=0.0011，0 < 0.0011）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes).toHaveLength(1)
  })

  it('LAVA tile + random=0 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeLavaWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes).toHaveLength(1)
  })

  it('random >= FORM_CHANCE(0.0011) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes).toHaveLength(0)
  })

  it('spawn 后 nextId 递增为 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 记录的 tick 等于传入 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    const tube: LavaTube = (sys as any).tubes[0]
    expect(tube.tick).toBe(CHECK_INTERVAL)
  })
})

// ====================================================================
// 4. spawn 后字段范围验证
// ====================================================================
describe('WorldLavaTubeSystem — spawn 字段范围', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  function spawnOne(): LavaTube {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    return (sys as any).tubes[0]
  }

  it('length 在 [15, 65] 范围内', () => {
    const t = spawnOne()
    expect(t.length).toBeGreaterThanOrEqual(15)
    expect(t.length).toBeLessThanOrEqual(65)
  })

  it('diameter 在 [2, 10] 范围内', () => {
    const t = spawnOne()
    expect(t.diameter).toBeGreaterThanOrEqual(2)
    expect(t.diameter).toBeLessThanOrEqual(10)
  })

  it('crustThickness 在 [1, 6] 范围内（spawn 后立即 update +0.000003，接近原始值）', () => {
    const t = spawnOne()
    // 源码 spawn 后立即执行 update: crustThickness = min(10, crustThickness + 0.000003)
    expect(t.crustThickness).toBeGreaterThanOrEqual(1)
    expect(t.crustThickness).toBeLessThanOrEqual(10)
  })

  it('internalTemp 在 [15, 1000] 范围内（spawn 后立即执行 -0.002）', () => {
    const t = spawnOne()
    // 源码 spawn: 200+0*800=200, 立即 update: max(15, 200-0.002) ≈ 199.998
    expect(t.internalTemp).toBeGreaterThanOrEqual(15)
    expect(t.internalTemp).toBeLessThanOrEqual(1000)
  })

  it('collapseRisk 在 [5, 60] 范围内', () => {
    const t = spawnOne()
    expect(t.collapseRisk).toBeGreaterThanOrEqual(5)
    expect(t.collapseRisk).toBeLessThanOrEqual(60)
  })

  it('spectacle 在 [10, 70] 范围内', () => {
    const t = spawnOne()
    expect(t.spectacle).toBeGreaterThanOrEqual(10)
    expect(t.spectacle).toBeLessThanOrEqual(70)
  })

  it('id 从 1 开始', () => {
    const t = spawnOne()
    expect(t.id).toBe(1)
  })
})

// ====================================================================
// 5. 动态 update 逻辑
// ====================================================================
describe('WorldLavaTubeSystem — 动态 update 逻辑', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('每次 update 后 internalTemp 减少（下限 15）', () => {
    const tube = makeTube({ internalTemp: 500, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    // 触发第二次 update（lastCheck 设为 0，tick 设为 CHECK_INTERVAL）
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].internalTemp).toBeLessThan(500)
  })

  it('internalTemp 不低于 15', () => {
    const tube = makeTube({ internalTemp: 15, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].internalTemp).toBeGreaterThanOrEqual(15)
  })

  it('每次 update 后 crustThickness 增加（上限 10）', () => {
    const tube = makeTube({ crustThickness: 3, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].crustThickness).toBeGreaterThan(3)
  })

  it('crustThickness 不超过 10', () => {
    const tube = makeTube({ crustThickness: 10, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].crustThickness).toBeLessThanOrEqual(10)
  })

  it('collapseRisk 在 [5, 60] 范围内（随机游走）', () => {
    const tube = makeTube({ collapseRisk: 30, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].collapseRisk).toBeGreaterThanOrEqual(5)
    expect((sys as any).tubes[0].collapseRisk).toBeLessThanOrEqual(60)
  })

  it('spectacle 在 [10, 70] 范围内（随机游走）', () => {
    const tube = makeTube({ spectacle: 40, tick: CHECK_INTERVAL })
    ;(sys as any).tubes.push(tube)
    ;(sys as any).lastCheck = 0
    sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).tubes[0].spectacle).toBeGreaterThanOrEqual(10)
    expect((sys as any).tubes[0].spectacle).toBeLessThanOrEqual(70)
  })
})

// ====================================================================
// 6. MAX_TUBES 上限
// ====================================================================
describe('WorldLavaTubeSystem — MAX_TUBES 上限', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it(`tubes 达到 MAX_TUBES(${MAX_TUBES}) 时不再 spawn`, () => {
    for (let i = 0; i < MAX_TUBES; i++) {
      ;(sys as any).tubes.push(makeTube({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes.length).toBe(MAX_TUBES)
  })

  it(`tubes 为 MAX_TUBES-1 时可 spawn 1 个`, () => {
    for (let i = 0; i < MAX_TUBES - 1; i++) {
      ;(sys as any).tubes.push(makeTube({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld(), makeEm(), CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).tubes.length).toBe(MAX_TUBES)
  })
})

// ====================================================================
// 7. cleanup 逻辑
// ====================================================================
describe('WorldLavaTubeSystem — cleanup', () => {
  let sys: WorldLavaTubeSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  // cutoff = tick - 96000
  it('tube.tick < cutoff 时被删除', () => {
    const tick = CHECK_INTERVAL
    const cutoff = tick - 96000
    ;(sys as any).tubes.push(makeTube({ tick: cutoff - 1 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).tubes).toHaveLength(0)
  })

  it('tube.tick === cutoff 时不删除（严格小于）', () => {
    const tick = CHECK_INTERVAL + 96000
    const cutoff = tick - 96000  // === CHECK_INTERVAL
    ;(sys as any).tubes.push(makeTube({ tick: cutoff }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).tubes).toHaveLength(1)
  })

  it('tube.tick > cutoff 时保留', () => {
    const tick = CHECK_INTERVAL + 96000
    const cutoff = tick - 96000
    ;(sys as any).tubes.push(makeTube({ tick: cutoff + 1 }))
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).tubes).toHaveLength(1)
  })

  it('混合情况：过期的删除，未过期的保留', () => {
    const tick = CHECK_INTERVAL + 96000
    const cutoff = tick - 96000
    ;(sys as any).tubes.push(makeTube({ tick: cutoff - 1 }))   // 过期
    ;(sys as any).tubes.push(makeTube({ tick: cutoff + 100 })) // 未过期
    ;(sys as any).tubes.push(makeTube({ tick: cutoff - 500 })) // 过期
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).tubes).toHaveLength(1)
    expect((sys as any).tubes[0].tick).toBe(cutoff + 100)
  })

  it('全部过期时 tubes 清空', () => {
    const tick = CHECK_INTERVAL + 96000
    const cutoff = tick - 96000
    for (let i = 0; i < 4; i++) {
      ;(sys as any).tubes.push(makeTube({ tick: cutoff - i - 1 }))
    }
    sys.update(1, makeBlockWorld(), makeEm(), tick)
    expect((sys as any).tubes).toHaveLength(0)
  })

  it('无 tube 时 cleanup 不抛出异常', () => {
    expect(() => sys.update(1, makeBlockWorld(), makeEm(), CHECK_INTERVAL)).not.toThrow()
  })
})
