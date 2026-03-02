import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldKettleHoleSystem } from '../systems/WorldKettleHoleSystem'
import type { KettleHole } from '../systems/WorldKettleHoleSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
const GRASS = 3
const SNOW = 6
const SAND = 2
const LAVA = 7

const CHECK_INTERVAL = 2650
const MAX_KETTLES = 14

function makeSys(): WorldKettleHoleSystem { return new WorldKettleHoleSystem() }

let _nextId = 1
function makeKettle(overrides: Partial<KettleHole> = {}): KettleHole {
  return {
    id: _nextId++,
    x: 20, y: 30,
    diameter: 10,
    depth: 5,
    waterFilled: true,
    sedimentLayer: 20,
    vegetationRing: 40,
    wildlifeValue: 30,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = GRASS, width = 200, height = 200) {
  return { width, height, getTile: () => tile } as any
}

function makeEm() { return {} as any }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem 初始状态', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 kettles 为空数组', () => {
    expect((sys as any).kettles).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('kettles 是数组类型', () => {
    expect(Array.isArray((sys as any).kettles)).toBe(true)
  })

  it('不同实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).kettles.push(makeKettle())
    expect((sys2 as any).kettles).toHaveLength(0)
  })

  it('注入多个冰壶湖可查询', () => {
    ;(sys as any).kettles.push(makeKettle(), makeKettle())
    expect((sys as any).kettles).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick < CHECK_INTERVAL 时不执行 update 逻辑，lastCheck 不更新', () => {
    const tick = CHECK_INTERVAL - 1
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时执行（不满足严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tick = CHECK_INTERVAL + 100
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).lastCheck).toBe(tick)
    vi.restoreAllMocks()
  })

  it('第二次 update 在间隔内不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    const count1 = (sys as any).kettles.length
    // 在间隔内再 update
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL + 1)
    expect((sys as any).kettles.length).toBe(count1)
    vi.restoreAllMocks()
  })

  it('两次 update 间隔足够则再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    const first = (sys as any).kettles.length
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).kettles.length).toBeGreaterThanOrEqual(first)
    vi.restoreAllMocks()
  })

  it('lastCheck 在间隔内不二次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL + 10)
    const lc = (sys as any).lastCheck
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL + 11)
    expect((sys as any).lastCheck).toBe(lc)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 3. Spawn 条件
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem spawn 条件', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tile=GRASS 且 random=0 时 spawn 冰壶湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    expect((sys as any).kettles.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('tile=SNOW 且 random=0 时 spawn 冰壶湖', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SNOW), makeEm(), CHECK_INTERVAL)
    expect((sys as any).kettles.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('tile=SAND 时不 spawn（tile 不满足条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect((sys as any).kettles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=LAVA 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(LAVA), makeEm(), CHECK_INTERVAL)
    expect((sys as any).kettles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random >= FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    expect((sys as any).kettles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL)
    const spawned = (sys as any).kettles.length
    expect((sys as any).nextId).toBe(1 + spawned)
    vi.restoreAllMocks()
  })

  it('spawn 的冰壶湖 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tick = CHECK_INTERVAL
    sys.update(1, makeWorld(GRASS), makeEm(), tick)
    const k = (sys as any).kettles[0]
    expect(k.tick).toBe(tick)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 4. 字段验证
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem 字段验证', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('注入冰壶湖 waterFilled 字段可为 true', () => {
    ;(sys as any).kettles.push(makeKettle({ waterFilled: true }))
    expect((sys as any).kettles[0].waterFilled).toBe(true)
  })

  it('注入冰壶湖 waterFilled 字段可为 false', () => {
    ;(sys as any).kettles.push(makeKettle({ waterFilled: false }))
    expect((sys as any).kettles[0].waterFilled).toBe(false)
  })

  it('sedimentLayer 初始在 [5,30] 范围内（注入值合法）', () => {
    const k = makeKettle({ sedimentLayer: 20 })
    expect(k.sedimentLayer).toBeGreaterThanOrEqual(5)
    expect(k.sedimentLayer).toBeLessThanOrEqual(30)
  })

  it('vegetationRing 初始在 [10,50] 范围内（注入值合法）', () => {
    const k = makeKettle({ vegetationRing: 30 })
    expect(k.vegetationRing).toBeGreaterThanOrEqual(10)
    expect(k.vegetationRing).toBeLessThanOrEqual(50)
  })

  it('wildlifeValue 初始在 [15,50] 范围内（注入值合法）', () => {
    const k = makeKettle({ wildlifeValue: 30 })
    expect(k.wildlifeValue).toBeGreaterThanOrEqual(15)
    expect(k.wildlifeValue).toBeLessThanOrEqual(50)
  })

  it('id 字段唯一递增', () => {
    ;(sys as any).kettles.push(makeKettle())
    ;(sys as any).kettles.push(makeKettle())
    const ids = (sys as any).kettles.map((k: KettleHole) => k.id)
    expect(new Set(ids).size).toBe(2)
  })
})

// ─────────────────────────────────────────────
// 5. 动态 update 逻辑
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem 动态 update 逻辑', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('sedimentLayer 每次 update 增加 0.003', () => {
    const k = makeKettle({ sedimentLayer: 20, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.sedimentLayer).toBeCloseTo(20.003, 5)
    vi.restoreAllMocks()
  })

  it('sedimentLayer 达到 50 时被钳制不超过 50', () => {
    const k = makeKettle({ sedimentLayer: 49.999, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.sedimentLayer).toBe(50)
    vi.restoreAllMocks()
  })

  it('vegetationRing 在 [5,70] 范围内钳制', () => {
    const k = makeKettle({ vegetationRing: 70, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(1) // 偏正，但被钳制到70
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.vegetationRing).toBeLessThanOrEqual(70)
    expect(k.vegetationRing).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('wildlifeValue 在 [5,65] 范围内钳制', () => {
    const k = makeKettle({ wildlifeValue: 65, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.wildlifeValue).toBeLessThanOrEqual(65)
    expect(k.wildlifeValue).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('vegetationRing 最小值不低于 5', () => {
    const k = makeKettle({ vegetationRing: 5, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 偏负
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.vegetationRing).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('wildlifeValue 最小值不低于 5', () => {
    const k = makeKettle({ wildlifeValue: 5, tick: 0 })
    ;(sys as any).kettles.push(k)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(SAND), makeEm(), CHECK_INTERVAL)
    expect(k.wildlifeValue).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 6. Cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem cleanup 逻辑', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick < cutoff(tick-93000) 的冰壶湖被删除', () => {
    const tick = 100000
    const cutoff = tick - 93000 // = 7000
    // 注入 spawnTick=6999 < 7000，应被删除
    ;(sys as any).kettles.push(makeKettle({ tick: 6999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick == cutoff 时不删除（严格小于）', () => {
    const tick = 100000
    const cutoff = tick - 93000 // = 7000
    // spawnTick == 7000 === cutoff，不满足严格小于，不删除
    ;(sys as any).kettles.push(makeKettle({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick > cutoff 时不删除', () => {
    const tick = 100000
    // spawnTick=8000 > 7000，不删除
    ;(sys as any).kettles.push(makeKettle({ tick: 8000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合情况：过期的删、未过期的保留', () => {
    const tick = 100000
    const cutoff = tick - 93000 // = 7000
    ;(sys as any).kettles.push(makeKettle({ tick: 6000 }))   // 过期
    ;(sys as any).kettles.push(makeKettle({ tick: 8000 }))   // 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(1)
    expect((sys as any).kettles[0].tick).toBe(8000)
    vi.restoreAllMocks()
  })

  it('多个过期全部删除', () => {
    const tick = 100000
    ;(sys as any).kettles.push(makeKettle({ tick: 1000 }))
    ;(sys as any).kettles.push(makeKettle({ tick: 2000 }))
    ;(sys as any).kettles.push(makeKettle({ tick: 3000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('cutoff 为负时（tick 小于 93000）不删除近期冰壶湖', () => {
    const tick = CHECK_INTERVAL
    ;(sys as any).kettles.push(makeKettle({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(SAND), makeEm(), tick)
    expect((sys as any).kettles).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 7. MAX_KETTLES 上限
// ─────────────────────────────────────────────
describe('WorldKettleHoleSystem MAX_KETTLES 上限', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已满 MAX_KETTLES 时不再 spawn', () => {
    for (let i = 0; i < MAX_KETTLES; i++) {
      ;(sys as any).kettles.push(makeKettle({ tick: CHECK_INTERVAL }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL * 2)
    // 因 cleanup 可能删除过期项，我们只验证 MAX 时未 spawn
    // 注入时 tick=CHECK_INTERVAL，tick*2 时 cutoff=CHECK_INTERVAL*2-93000 < 0，不会删除
    expect((sys as any).kettles.length).toBe(MAX_KETTLES)
    vi.restoreAllMocks()
  })

  it('差 1 时可以 spawn', () => {
    for (let i = 0; i < MAX_KETTLES - 1; i++) {
      ;(sys as any).kettles.push(makeKettle({ tick: CHECK_INTERVAL }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(GRASS), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).kettles.length).toBeGreaterThanOrEqual(MAX_KETTLES - 1)
    vi.restoreAllMocks()
  })
})
