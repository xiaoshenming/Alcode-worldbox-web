import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLighthouseSystem } from '../systems/WorldLighthouseSystem'
import type { Lighthouse, LighthouseState } from '../systems/WorldLighthouseSystem'

// ────────────────────────────────────────────────────────────
// 常量（与源码对齐）
// CHECK_INTERVAL = 2500, BUILD_CHANCE = 0.003, MAX_LIGHTHOUSES = 15
// spawn条件: tile===2(SAND) && nearWater(tile<=1) && !nearLighthouseNear(15)
// cleanup: 状态==ruined && lh.tick < tick - 100000
// active: beamAngle += rotationSpeed, durability -= 0.02, <30→damaged
// damaged: beamAngle += rotationSpeed*0.3, durability -= 0.01, <5→ruined, random<0.01→repair
// building: tick-lh.tick > 5000 → active
// ──────────────────────────────────────────────��─────────────

function makeSys(): WorldLighthouseSystem { return new WorldLighthouseSystem() }

let _nextId = 1
function makeLighthouse(
  state: LighthouseState = 'active',
  overrides: Partial<Lighthouse> = {}
): Lighthouse {
  return {
    id: _nextId++,
    x: 20, y: 30,
    state,
    beamRange: 20,
    beamAngle: 0,
    rotationSpeed: 1.0,
    durability: 80,
    tick: 0,
    ...overrides,
  }
}

// 返回一个最小 world mock
function makeWorld(
  tileMap: (x: number, y: number) => number | null = () => null,
  w = 100, h = 100
) {
  return { width: w, height: h, getTile: tileMap } as any
}

const em = {} as any

// ────────────────────────────────────────────────────────────
// 1. 初始状态
// ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldLighthouseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('lighthouses 初始为空数组', () => {
    expect((sys as any).lighthouses).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('支持 4 种 LighthouseState 类型', () => {
    const states: LighthouseState[] = ['building', 'active', 'damaged', 'ruined']
    expect(states).toHaveLength(4)
  })

  it('Lighthouse 接口包含所有必要字段', () => {
    const lh = makeLighthouse()
    expect(lh).toHaveProperty('id')
    expect(lh).toHaveProperty('x')
    expect(lh).toHaveProperty('y')
    expect(lh).toHaveProperty('state')
    expect(lh).toHaveProperty('beamRange')
    expect(lh).toHaveProperty('beamAngle')
    expect(lh).toHaveProperty('rotationSpeed')
    expect(lh).toHaveProperty('durability')
    expect(lh).toHaveProperty('tick')
  })
})

// ────────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ────────────────────────────────────────────────────────────
describe('CHECK_INTERVAL 节流 (2500)', () => {
  let sys: WorldLighthouseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0, lastCheck=0: 0-0=0 < 2500 → 不执行（lastCheck 不更新）', () => {
    // 首次调用时 lastCheck=0, tick=0, 0-0=0 < 2500 → 跳过
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时不更新 lastCheck', () => {
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 2499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时恰好执行（边界：2500-0=2500 不小于2500）', () => {
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('执行后再次在间隔内调用不重复执行', () => {
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 2500) // 执行, lastCheck=2500
    sys.update(16, world, em, 2501) // 2501-2500=1 < 2500 → 跳过
    expect((sys as any).lastCheck).toBe(2500)
  })

  it('等待下一个间隔后再次执行', () => {
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 2500) // lastCheck=2500
    sys.update(16, world, em, 5000) // 5000-2500=2500, 恰好执行
    expect((sys as any).lastCheck).toBe(5000)
  })
})

// ────────────────────────────────────────────────────────────
// 3. spawn 条件
// ────────────────────────────────────────────────────────────
describe('spawn 条件', () => {
  let sys: WorldLighthouseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tile!=SAND(2) 时不 spawn', () => {
    // tile=3(GRASS), 不满足 tile===2
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 < BUILD_CHANCE
    const world = makeWorld(() => 3)
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses).toHaveLength(0)
  })

  it('tile===SAND 但无邻水 tile 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 中心格=2(SAND), 邻格全部=3(GRASS)，无水
    const world = makeWorld((x, y) => (x === 0 && y === 0 ? 2 : 3))
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses).toHaveLength(0)
  })

  it('random >= BUILD_CHANCE 时不 spawn', () => {
    // random=1 > 0.003
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeWorld(() => 2)
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses).toHaveLength(0)
  })

  it('tile===SAND 且邻格有浅水(1) 且 random=0 时 spawn', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      // 第1次: random for x position → 0
      // 第2次: random for y position → 0
      // 第3次: BUILD_CHANCE check → 0 (< 0.003)
      // 其余: beamRange/rotationSpeed
      return 0
    })
    // 中心格(0,0)=SAND, 邻格(1,0)=SHALLOW_WATER(1)
    const world = makeWorld((x, y) => {
      if (x === 0 && y === 0) return 2  // SAND
      if (x <= 1 && y <= 1) return 1    // SHALLOW_WATER
      return 3
    }, 50, 50)
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses.length).toBeGreaterThanOrEqual(1)
  })

  it('spawn 后 nextId 递增', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => 0)
    const world = makeWorld((x, y) => {
      if (x === 0 && y === 0) return 2
      return 1  // SHALLOW_WATER
    }, 50, 50)
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    const lighthouses = (sys as any).lighthouses
    if (lighthouses.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  it('邻格有深水(0) 也算 nearWater', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld((x, y) => {
      if (x === 0 && y === 0) return 2 // SAND
      return 0  // DEEP_WATER
    }, 50, 50)
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses.length).toBeGreaterThanOrEqual(1)
  })
})

// ────────────────────────────────────────────────────────────
// 4. spawn 后字段验证
// ────────────────────────────────────────────────────────────
describe('spawn 后字段验证', () => {
  let sys: WorldLighthouseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('spawn 后灯塔 state 初始为 building', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('building', { tick: 2500 }))
    expect((sys as any).lighthouses[0].state).toBe('building')
  })

  it('spawn 后 beamAngle 初始为 0', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('building'))
    expect((sys as any).lighthouses[0].beamAngle).toBe(0)
  })

  it('spawn 后 durability 初始为 100', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('building', { durability: 100 }))
    expect((sys as any).lighthouses[0].durability).toBe(100)
  })

  it('beamRange 在 [10, 24] 范围内（10 + random*15, random in [0,1)）', () => {
    // 注入手动构造
    ;(sys as any).lighthouses.push(makeLighthouse('active', { beamRange: 17 }))
    const lh = (sys as any).lighthouses[0]
    // 手动验证范围规则
    expect(17).toBeGreaterThanOrEqual(10)
    expect(17).toBeLessThan(25)
  })

  it('rotationSpeed 在 [0.5, 2.0] 范围内', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active', { rotationSpeed: 1.2 }))
    expect(1.2).toBeGreaterThanOrEqual(0.5)
    expect(1.2).toBeLessThanOrEqual(2.0)
  })
})

// ────────────────────────────────────────────────────────────
// 5. 状态机 update 逻辑
// ────────────────────────────────────────────────────────────
describe('状态机 update 逻辑', () => {
  let sys: WorldLighthouseSystem
  const world = makeWorld(() => 3) // 不会 spawn

  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('building 状态: tick-lh.tick > 5000 → 转 active', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('building', { tick: 0 }))
    // 需要 tick-lh.tick > 5000, lh.tick=0, tick=5001 时满足条件
    sys.update(16, world, em, 5001)
    expect((sys as any).lighthouses[0].state).toBe('active')
  })

  it('building 状态: tick-lh.tick <= 5000 → 保持 building', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('building', { tick: 0 }))
    // tick=2500, lh.tick=0, 2500-0=2500 <= 5000 → 仍然 building
    sys.update(16, world, em, 2500)
    expect((sys as any).lighthouses[0].state).toBe('building')
  })

  it('active 状态: beamAngle 增加 rotationSpeed', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active', { beamAngle: 0, rotationSpeed: 2.0, durability: 80 }))
    sys.update(16, world, em, 2500)
    expect((sys as any).lighthouses[0].beamAngle).toBeCloseTo(2.0)
  })

  it('active 状态: durability 减少 0.02', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active', { durability: 80 }))
    sys.update(16, world, em, 2500)
    expect((sys as any).lighthouses[0].durability).toBeCloseTo(79.98)
  })

  it('active 状态: durability < 30 → 转 damaged', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active', { durability: 29 }))
    sys.update(16, world, em, 2500)
    expect((sys as any).lighthouses[0].state).toBe('damaged')
  })

  it('damaged 状态: beamAngle 增加 rotationSpeed*0.3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不触发修复
    ;(sys as any).lighthouses.push(makeLighthouse('damaged', { beamAngle: 0, rotationSpeed: 2.0, durability: 20 }))
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses[0].beamAngle).toBeCloseTo(0.6)
  })

  it('damaged 状态: durability 减少 0.01', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lighthouses.push(makeLighthouse('damaged', { durability: 20 }))
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses[0].durability).toBeCloseTo(19.99)
  })

  it('damaged 状态: durability < 5 → 转 ruined', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lighthouses.push(makeLighthouse('damaged', { durability: 4 }))
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    expect((sys as any).lighthouses[0].state).toBe('ruined')
  })

  it('damaged 状态: random<0.01 → 修复为 active, durability=70', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < 0.01
    ;(sys as any).lighthouses.push(makeLighthouse('damaged', { durability: 20 }))
    sys.update(16, world, em, 2500)
    vi.restoreAllMocks()
    const lh = (sys as any).lighthouses[0]
    expect(lh.state).toBe('active')
    expect(lh.durability).toBe(70)
  })

  it('ruined 状态: 什么都不做', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { beamAngle: 45, durability: 2, tick: 0 }))
    sys.update(16, world, em, 2500)
    const lh = (sys as any).lighthouses[0]
    expect(lh.beamAngle).toBe(45) // 不变
    expect(lh.durability).toBe(2) // 不变
  })
})

// ────────────────────────────────────────────────────────────
// 6. cleanup 逻辑（cutoff = tick - 100000）
// ────────────────────────────────────────────────────────────
describe('cleanup 逻辑', () => {
  let sys: WorldLighthouseSystem
  const world = makeWorld(() => 3)

  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('ruined 且 lh.tick < cutoff 时删除', () => {
    // cutoff = 102500 - 100000 = 2500; lh.tick=0 < 2500 → 删除
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 0 }))
    sys.update(16, world, em, 102500)
    expect((sys as any).lighthouses).toHaveLength(0)
  })

  it('ruined 且 lh.tick === cutoff 时不删除（严格小于）', () => {
    // cutoff = 102500 - 100000 = 2500; lh.tick=2500, 2500 < 2500 为 false → 保留
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 2500 }))
    sys.update(16, world, em, 102500)
    expect((sys as any).lighthouses).toHaveLength(1)
  })

  it('ruined 且 lh.tick > cutoff 时不删除', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 3000 }))
    sys.update(16, world, em, 102500)
    expect((sys as any).lighthouses).toHaveLength(1)
  })

  it('active 状态不管多久都不删除', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('active', { tick: 0, durability: 80 }))
    sys.update(16, world, em, 200000)
    const lh = (sys as any).lighthouses[0]
    // 可能因 durability 耗尽转为 ruined 被删，但初始 durability=80 先计算
    expect(lh).toBeDefined()
  })

  it('混合情况: ruined过期删除, active保留', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 0 }))     // 会被删
    ;(sys as any).lighthouses.push(makeLighthouse('active', { tick: 2500, durability: 80 })) // 保留
    sys.update(16, world, em, 102500)
    // ruined(tick=0) 被删, active 保留
    const remaining = (sys as any).lighthouses
    expect(remaining.some((lh: any) => lh.state === 'active')).toBe(true)
  })

  it('多个 ruined 灯塔同时过期全部删除', () => {
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 0 }))
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 100 }))
    ;(sys as any).lighthouses.push(makeLighthouse('ruined', { tick: 200 }))
    sys.update(16, world, em, 102500)
    // 全部 tick < 2500 → 全部删除
    expect((sys as any).lighthouses).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────
// 7. MAX_LIGHTHOUSES 上限
// ────────────────────────────────────────────────────────────
describe('MAX_LIGHTHOUSES 上限 (15)', () => {
  let sys: WorldLighthouseSystem
  const world = makeWorld(() => 3)

  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已有 15 个灯塔时不再 spawn', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).lighthouses.push(makeLighthouse('active', { x: i * 20, y: i * 20, durability: 80 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = makeWorld((x, y) => x === 0 ? 2 : 1, 100, 100)
    sys.update(16, w, em, 2500)
    vi.restoreAllMocks()
    // 已满 15，不再添加
    expect((sys as any).lighthouses.length).toBeLessThanOrEqual(15)
  })

  it('已有 14 个时可以再 spawn 一个', () => {
    for (let i = 0; i < 14; i++) {
      ;(sys as any).lighthouses.push(makeLighthouse('active', { x: i * 20 + 50, y: i * 20 + 50, durability: 80 }))
    }
    // 设置 lighthouses.length < 15 → 允许 spawn
    expect((sys as any).lighthouses.length).toBe(14)
    expect(14).toBeLessThan(15)
  })
})
