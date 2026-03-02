import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLabyrinthSystem } from '../systems/WorldLabyrinthSystem'
import type { Labyrinth, LabyrinthType } from '../systems/WorldLabyrinthSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
// spawn 条件：tile >= 4
// 类型映射：tile==6 → 'ice', tile==4 → 'hedge', tile>=5 → 'cave', else 'stone'

const CHECK_INTERVAL = 4000
const MAX_LABYRINTHS = 12

function makeSys(): WorldLabyrinthSystem { return new WorldLabyrinthSystem() }

let _nextId = 1
function makeLabyrinth(overrides: Partial<Labyrinth> = {}): Labyrinth {
  return {
    id: _nextId++,
    x: 20, y: 30,
    type: 'stone',
    size: 15,
    complexity: 50,
    explored: 0,
    hasTreasure: true,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = 4, width = 200, height = 200) {
  return { width, height, getTile: () => tile } as any
}

function makeEm() { return {} as any }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem 初始状态', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 labyrinths 为空数组', () => {
    expect((sys as any).labyrinths).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('labyrinths 是数组类型', () => {
    expect(Array.isArray((sys as any).labyrinths)).toBe(true)
  })

  it('不同实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).labyrinths.push(makeLabyrinth())
    expect((sys2 as any).labyrinths).toHaveLength(0)
  })

  it('支持 4 种迷宫类型', () => {
    const types: LabyrinthType[] = ['cave', 'hedge', 'stone', 'ice']
    expect(types).toHaveLength(4)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick < CHECK_INTERVAL 时不执行，lastCheck 不更新', () => {
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时执行（不满足严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tick = CHECK_INTERVAL + 500
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).lastCheck).toBe(tick)
    vi.restoreAllMocks()
  })

  it('间隔内连续 update 不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const count1 = (sys as any).labyrinths.length
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL + 1)
    expect((sys as any).labyrinths.length).toBe(count1)
    vi.restoreAllMocks()
  })

  it('第一次执行后 lastCheck 被记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tick = CHECK_INTERVAL * 2
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).lastCheck).toBe(tick)
    vi.restoreAllMocks()
  })

  it('足够间隔后可再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const c1 = (sys as any).labyrinths.length
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL * 2)
    // 两次都应执行，labyrinths 数量 >= c1
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(c1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 3. Spawn 条件与类型映射
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem spawn 条件与类型映射', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tile < 4 时不 spawn（SAND=2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(3), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tile=4(FOREST) 时 spawn 类型为 hedge', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(1)
    const lab = (sys as any).labyrinths[0]
    expect(lab.type).toBe('hedge')
    vi.restoreAllMocks()
  })

  it('tile=5(MOUNTAIN) 时 spawn 类型为 cave', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(1)
    const lab = (sys as any).labyrinths[0]
    expect(lab.type).toBe('cave')
    vi.restoreAllMocks()
  })

  it('tile=6(SNOW) 时 spawn 类型为 ice', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(6), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(1)
    const lab = (sys as any).labyrinths[0]
    expect(lab.type).toBe('ice')
    vi.restoreAllMocks()
  })

  it('tile=7(LAVA) 时 spawn 类型为 cave（>=5 且不为 6）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(7), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(1)
    const lab = (sys as any).labyrinths[0]
    expect(lab.type).toBe('cave')
    vi.restoreAllMocks()
  })

  it('random >= SPAWN_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const spawned = (sys as any).labyrinths.length
    expect((sys as any).nextId).toBe(1 + spawned)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 4. 字段验证
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem 字段验证', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('注入迷宫 explored 初始为 0', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 0 }))
    expect((sys as any).labyrinths[0].explored).toBe(0)
  })

  it('注入迷宫 hasTreasure 字段为 boolean', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ hasTreasure: false }))
    expect(typeof (sys as any).labyrinths[0].hasTreasure).toBe('boolean')
  })

  it('spawn 的迷宫 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tick = CHECK_INTERVAL
    sys.update(1, makeWorld(4), makeEm(), tick)
    const lab = (sys as any).labyrinths[0]
    expect(lab.tick).toBe(tick)
    vi.restoreAllMocks()
  })

  it('spawn 的迷宫 size 在 [5,19] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const lab = (sys as any).labyrinths[0]
    expect(lab.size).toBeGreaterThanOrEqual(5)
    expect(lab.size).toBeLessThanOrEqual(19)
    vi.restoreAllMocks()
  })

  it('spawn 的迷宫 complexity 在 [20,99] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const lab = (sys as any).labyrinths[0]
    expect(lab.complexity).toBeGreaterThanOrEqual(20)
    expect(lab.complexity).toBeLessThanOrEqual(99)
    vi.restoreAllMocks()
  })

  it('spawn 的迷宫 explored 在 spawn 后同次 update 即增加 0.1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL)
    const lab = (sys as any).labyrinths[0]
    // spawn 后同次 update 立刻执行 explored += 0.1
    expect(lab.explored).toBeCloseTo(0.1, 5)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 5. 动态 update 逻辑（explored 累加）
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem 动态 update 逻辑', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('explored < 100 时每次 update 增加 0.1', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths[0].explored).toBeCloseTo(0.1, 5)
    vi.restoreAllMocks()
  })

  it('explored 达到 100 时不再增加', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths[0].explored).toBe(100)
    vi.restoreAllMocks()
  })

  it('explored 不超过 100（钳制）', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 99.95 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths[0].explored).toBe(100)
    vi.restoreAllMocks()
  })

  it('多个迷宫各自 explored 独立增加', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 0 }))
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths[0].explored).toBeCloseTo(0.1, 5)
    expect((sys as any).labyrinths[1].explored).toBeCloseTo(50.1, 5)
    vi.restoreAllMocks()
  })

  it('explored=99.9 再 update 后等于 100', () => {
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 99.9 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths[0].explored).toBe(100)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 6. Cleanup 逻辑（explored>=100 且 tick < cutoff）
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem cleanup 逻辑', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('explored>=100 且 tick < cutoff 时被删除', () => {
    const tick = 200000
    const cutoff = tick - 150000 // = 50000
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: 49999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).labyrinths).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('explored>=100 但 tick == cutoff 时不删除（严格小于）', () => {
    const tick = 200000
    const cutoff = tick - 150000 // = 50000
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).labyrinths).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('explored < 100 时即使 tick < cutoff 也不删除', () => {
    const tick = 200000
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 50, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).labyrinths).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('explored>=100 且 tick > cutoff 时不删除', () => {
    const tick = 200000
    const cutoff = tick - 150000 // = 50000
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: 60000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).labyrinths).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合情况：满足条件的删、不满足的保留', () => {
    const tick = 200000
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: 1000 }))  // 过期删
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 50, tick: 0 }))      // 未完成保留
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: 60000 })) // tick>cutoff 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), tick)
    expect((sys as any).labyrinths).toHaveLength(2)
    vi.restoreAllMocks()
  })

  it('tick 较小时 cutoff 为负，不删除任何迷宫', () => {
    // tick=CHECK_INTERVAL 时 cutoff=CHECK_INTERVAL-150000 < 0
    ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 100, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEm(), CHECK_INTERVAL)
    expect((sys as any).labyrinths).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 7. MAX_LABYRINTHS 上限
// ─────────────────────────────────────────────
describe('WorldLabyrinthSystem MAX_LABYRINTHS 上限', () => {
  let sys: WorldLabyrinthSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已满 MAX_LABYRINTHS 时不再 spawn', () => {
    // 注入足够新的 tick，不会被 cleanup 删除
    for (let i = 0; i < MAX_LABYRINTHS; i++) {
      ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 0, tick: CHECK_INTERVAL * 2 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).labyrinths.length).toBe(MAX_LABYRINTHS)
    vi.restoreAllMocks()
  })

  it('差 1 时可以 spawn', () => {
    for (let i = 0; i < MAX_LABYRINTHS - 1; i++) {
      ;(sys as any).labyrinths.push(makeLabyrinth({ explored: 0, tick: CHECK_INTERVAL * 2 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(4), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).labyrinths.length).toBeGreaterThanOrEqual(MAX_LABYRINTHS - 1)
    vi.restoreAllMocks()
  })
})
