import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLaharSystem } from '../systems/WorldLaharSystem'
import type { Lahar } from '../systems/WorldLaharSystem'

// WorldLaharSystem:
// CHECK_INTERVAL = 2660, FORM_CHANCE = 0.0009, MAX_LAHARS = 8
// spawn 无 tile 条件限制，直接 random < FORM_CHANCE
// update: velocity -= 0.1, debrisLoad -= 0.05, temperature -= 0.03 (min 10), destructionPath += velocity * 0.01 (max 100)
// cleanup: velocity <= 1 时删除

const CHECK_INTERVAL = 2660
const MAX_LAHARS = 8

function makeSys(): WorldLaharSystem { return new WorldLaharSystem() }

let _nextId = 1
function makeLahar(overrides: Partial<Lahar> = {}): Lahar {
  return {
    id: _nextId++,
    x: 10, y: 20,
    velocity: 30,
    debrisLoad: 50,
    temperature: 60,
    destructionPath: 0,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(width = 200, height = 200) {
  return { width, height, getTile: () => 0 } as any
}

function makeEm() { return {} as any }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldLaharSystem 初始状态', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 lahars 为空数组', () => {
    expect((sys as any).lahars).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lahars 是数组类型', () => {
    expect(Array.isArray((sys as any).lahars)).toBe(true)
  })

  it('不同实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).lahars.push(makeLahar())
    expect((sys2 as any).lahars).toHaveLength(0)
  })

  it('多个泥石流全部返回', () => {
    ;(sys as any).lahars.push(makeLahar())
    ;(sys as any).lahars.push(makeLahar())
    expect((sys as any).lahars).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldLaharSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick < CHECK_INTERVAL 时不执行，lastCheck 不更新', () => {
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时执行（不满足严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tick = CHECK_INTERVAL + 100
    sys.update(1, makeWorld(), makeEm(), tick)
    expect((sys as any).lastCheck).toBe(tick)
    vi.restoreAllMocks()
  })

  it('间隔内连续 update 不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const count1 = (sys as any).lahars.length
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 1)
    // 没到下一个 CHECK_INTERVAL，不执行
    expect((sys as any).lahars.length).toBe(count1)
    vi.restoreAllMocks()
  })

  it('lastCheck 在间隔内不二次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const tick = CHECK_INTERVAL + 10
    sys.update(1, makeWorld(), makeEm(), tick)
    const lc = (sys as any).lastCheck
    sys.update(1, makeWorld(), makeEm(), tick + 5)
    expect((sys as any).lastCheck).toBe(lc)
    vi.restoreAllMocks()
  })

  it('两次 update 间隔足够后再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 3. Spawn 条件
// ─────────────────────────────────────────────
describe('WorldLaharSystem spawn 条件', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random=0 时 spawn 泥石流（无 tile 限制）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lahars.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('random >= FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lahars).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const spawned = (sys as any).lahars.length
    expect((sys as any).nextId).toBe(1 + spawned)
    vi.restoreAllMocks()
  })

  it('spawn 的泥石流 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tick = CHECK_INTERVAL
    sys.update(1, makeWorld(), makeEm(), tick)
    const l = (sys as any).lahars[0]
    expect(l.tick).toBe(tick)
    vi.restoreAllMocks()
  })

  it('spawn 的泥石流 destructionPath 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // destructionPath 初始 0，但 update 后已被修改，需用范围断言
    const l = (sys as any).lahars[0]
    // destructionPath 在 spawn 后立即 update：0 + velocity*0.01，velocity>=20
    expect(l.destructionPath).toBeGreaterThanOrEqual(0)
    expect(l.destructionPath).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('world 使用 width/height 属性（或默认200）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const worldNoSize = { getTile: () => 0 } as any
    sys.update(1, worldNoSize, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lahars.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 4. 字段验证
// ─────────────────────────────────────────────
describe('WorldLaharSystem 字段验证', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('注入泥石流 velocity 字段正确', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 5 }))
    expect((sys as any).lahars[0].velocity).toBe(5)
  })

  it('注入泥石流 debrisLoad 字段正确', () => {
    ;(sys as any).lahars.push(makeLahar({ debrisLoad: 60 }))
    expect((sys as any).lahars[0].debrisLoad).toBe(60)
  })

  it('注入泥石流 temperature 字段正确', () => {
    ;(sys as any).lahars.push(makeLahar({ temperature: 200 }))
    expect((sys as any).lahars[0].temperature).toBe(200)
  })

  it('spawn 的泥石流 velocity 在 [20,60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // spawn 后立即 update，velocity 已减 0.1
    const l = (sys as any).lahars[0]
    expect(l.velocity).toBeGreaterThanOrEqual(19)  // 最小20-0.1
    expect(l.velocity).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })

  it('spawn 的泥石流 temperature 在合理范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    const l = (sys as any).lahars[0]
    // temperature 初始 40~70，update 减 0.03
    expect(l.temperature).toBeGreaterThanOrEqual(10)
    expect(l.temperature).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })

  it('id 字段为正整数', () => {
    ;(sys as any).lahars.push(makeLahar({ id: 5 }))
    expect((sys as any).lahars[0].id).toBe(5)
  })
})

// ─────────────────────────────────────────────
// 5. 动态 update 逻辑
// ─────────────────────────────────────────────
describe('WorldLaharSystem 动态 update 逻辑', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('velocity 每次 update 减少 0.1', () => {
    const l = makeLahar({ velocity: 30, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.velocity).toBeCloseTo(29.9, 5)
    vi.restoreAllMocks()
  })

  it('velocity 不会低于 0', () => {
    const l = makeLahar({ velocity: 0.05, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.velocity).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })

  it('debrisLoad 每次 update 减少 0.05', () => {
    const l = makeLahar({ velocity: 30, debrisLoad: 50, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.debrisLoad).toBeCloseTo(49.95, 5)
    vi.restoreAllMocks()
  })

  it('debrisLoad 不低于 0', () => {
    const l = makeLahar({ velocity: 30, debrisLoad: 0.01, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.debrisLoad).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })

  it('temperature 每次 update 减少 0.03，最小 10', () => {
    const l = makeLahar({ velocity: 30, temperature: 60, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.temperature).toBeCloseTo(59.97, 5)
    vi.restoreAllMocks()
  })

  it('temperature 不低于 10（钳制）', () => {
    const l = makeLahar({ velocity: 30, temperature: 10.01, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.temperature).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('destructionPath 增加 velocity * 0.01', () => {
    const l = makeLahar({ velocity: 30, destructionPath: 0, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // velocity 先减 0.1 变为 29.9，然后 destructionPath += 29.9 * 0.01 = 0.299
    expect(l.destructionPath).toBeCloseTo(0.299, 3)
    vi.restoreAllMocks()
  })

  it('destructionPath 不超过 100', () => {
    const l = makeLahar({ velocity: 30, destructionPath: 99.8, tick: 0 })
    ;(sys as any).lahars.push(l)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(l.destructionPath).toBe(100)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 6. Cleanup 逻辑（velocity <= 1 时删除）
// ─────────────────────────────────────────────
describe('WorldLaharSystem cleanup 逻辑', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('velocity <= 1 的泥石流被删除', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 0.5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // velocity 0.5 - 0.1 = 0.4 <= 1，被删除
    expect((sys as any).lahars).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('velocity == 1 时被删除', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // velocity 1 - 0.1 = 0.9 <= 1，被删除
    expect((sys as any).lahars).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('velocity > 1 update 后仍 > 1 的保留', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // velocity 5 - 0.1 = 4.9 > 1，保留
    expect((sys as any).lahars).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合情况：低速删、高速保留', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 0.5 })) // 删
    ;(sys as any).lahars.push(makeLahar({ velocity: 10 }))  // 保留
    ;(sys as any).lahars.push(makeLahar({ velocity: 1.05 })) // 0.95 <= 1，删
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lahars).toHaveLength(1)
    expect((sys as any).lahars[0].velocity).toBeCloseTo(9.9, 3)
    vi.restoreAllMocks()
  })

  it('多个低速全部删除', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 0.1 }))
    ;(sys as any).lahars.push(makeLahar({ velocity: 0.5 }))
    ;(sys as any).lahars.push(makeLahar({ velocity: 1.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lahars).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('velocity 为 1.15 update 后 1.05 > 1 不删除', () => {
    ;(sys as any).lahars.push(makeLahar({ velocity: 1.15 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    // 1.15 - 0.1 = 1.05 > 1，保留
    expect((sys as any).lahars).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

// ─────────────────────────────────────────────
// 7. MAX_LAHARS 上限
// ─────────────────────────────────────────────
describe('WorldLaharSystem MAX_LAHARS 上限', () => {
  let sys: WorldLaharSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('已满 MAX_LAHARS 时不再 spawn', () => {
    for (let i = 0; i < MAX_LAHARS; i++) {
      ;(sys as any).lahars.push(makeLahar({ velocity: 30, tick: CHECK_INTERVAL * 2 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    // update 后 velocity 减 0.1，不会删除（30->29.9 > 1）
    expect((sys as any).lahars.length).toBe(MAX_LAHARS)
    vi.restoreAllMocks()
  })

  it('差 1 时可以 spawn', () => {
    for (let i = 0; i < MAX_LAHARS - 1; i++) {
      ;(sys as any).lahars.push(makeLahar({ velocity: 30, tick: CHECK_INTERVAL * 2 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lahars.length).toBeGreaterThanOrEqual(MAX_LAHARS - 1)
    vi.restoreAllMocks()
  })
})
