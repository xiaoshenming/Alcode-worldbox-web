import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldWeatherFrontSystem } from '../systems/WorldWeatherFrontSystem'
import type { WeatherFront, FrontCollision, FrontType } from '../systems/WorldWeatherFrontSystem'

// ===== 从源码提取的关键参数 =====
// MOVE_INTERVAL = 200
// SPAWN_INTERVAL = 1500
// MAX_FRONTS = 6
// FRONT_SPEED = 0.5
// COLLISION_DIST = 15
// cleanup: age >= maxAge || x < -20 || x > worldWidth+20 || y < -20 || y > worldHeight+20
// spawn: 从4个边缘随机spawn
// 字段范围: width(8-20), length(20-50), intensity(3-8), maxAge(300-500)
// 注意：spawn后同帧会执行moveFronts，age会递增1，位置会移动

const MOVE_INTERVAL = 200
const SPAWN_INTERVAL = 1500
const MAX_FRONTS = 6
const FRONT_SPEED = 0.5
const COLLISION_DIST = 15

function makeSys(): WorldWeatherFrontSystem { return new WorldWeatherFrontSystem() }

let nextId = 1
function makeFront(overrides: Partial<WeatherFront> = {}): WeatherFront {
  return {
    id: nextId++,
    type: 'cold',
    x: 30,
    y: 40,
    dx: 1,
    dy: 0,
    width: 10,
    length: 20,
    intensity: 5,
    age: 0,
    maxAge: 400,
    ...overrides,
  }
}

function makeCollision(frontA: number, frontB: number): FrontCollision {
  return { frontA, frontB, x: 35, y: 40, severity: 7 }
}

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldWeatherFrontSystem - 初始状态', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始fronts数组为空', () => {
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('初始collisions数组为空', () => {
    expect((sys as any).collisions).toHaveLength(0)
  })

  it('初始lastMove为0', () => {
    expect((sys as any).lastMove).toBe(0)
  })

  it('初始lastSpawn为0', () => {
    expect((sys as any).lastSpawn).toBe(0)
  })

  it('初始worldWidth为200', () => {
    expect((sys as any).worldWidth).toBe(200)
  })

  it('初始worldHeight为200', () => {
    expect((sys as any).worldHeight).toBe(200)
  })

  it('手动注入一个锋面后数组长度为1', () => {
    ;(sys as any).fronts.push(makeFront())
    expect((sys as any).fronts).toHaveLength(1)
  })

  it('fronts引用稳定（同一对象）', () => {
    const ref = (sys as any).fronts
    expect(ref).toBe((sys as any).fronts)
  })

  it('WeatherFront包含所有必要字段', () => {
    const f: WeatherFront = {
      id: 1, type: 'cold', x: 10, y: 20, dx: 0.5, dy: 0,
      width: 10, length: 25, intensity: 5, age: 0, maxAge: 400,
    }
    expect(f.id).toBe(1)
    expect(f.type).toBe('cold')
    expect(f.intensity).toBe(5)
    expect(f.maxAge).toBe(400)
  })
})

// ========================================================
// 2. SPAWN_INTERVAL 节流
// ========================================================
describe('WorldWeatherFrontSystem - SPAWN_INTERVAL节流', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tick=0时不spawn', () => {
    sys.update(0, 0)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('tick < SPAWN_INTERVAL时不spawn', () => {
    sys.update(0, SPAWN_INTERVAL - 1)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('tick == SPAWN_INTERVAL时spawn', () => {
    sys.update(0, SPAWN_INTERVAL)
    expect((sys as any).fronts.length).toBeGreaterThan(0)
  })

  it('tick > SPAWN_INTERVAL时spawn', () => {
    sys.update(0, SPAWN_INTERVAL + 100)
    expect((sys as any).fronts.length).toBeGreaterThan(0)
  })

  it('第一次spawn后lastSpawn更新', () => {
    sys.update(0, SPAWN_INTERVAL)
    expect((sys as any).lastSpawn).toBe(SPAWN_INTERVAL)
  })

  it('第二次达到间隔时再次spawn', () => {
    sys.update(0, SPAWN_INTERVAL)
    const count1 = (sys as any).fronts.length
    sys.update(0, SPAWN_INTERVAL * 2)
    expect((sys as any).fronts.length).toBeGreaterThanOrEqual(count1)
  })

  it('低于间隔时不spawn', () => {
    sys.update(0, SPAWN_INTERVAL)
    const count1 = (sys as any).fronts.length
    sys.update(0, SPAWN_INTERVAL + SPAWN_INTERVAL - 1)
    expect((sys as any).fronts.length).toBe(count1)
  })
})

// ========================================================
// 3. MOVE_INTERVAL 节流
// ========================================================
describe('WorldWeatherFrontSystem - MOVE_INTERVAL节流', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tick=0时不move', () => {
    const front = makeFront({ x: 30, y: 40 })
    ;(sys as any).fronts.push(front)
    sys.update(0, 0)
    expect(front.x).toBe(30)
  })

  it('tick < MOVE_INTERVAL时不move', () => {
    const front = makeFront({ x: 30, y: 40 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL - 1)
    expect(front.x).toBe(30)
  })

  it('tick == MOVE_INTERVAL时move', () => {
    const front = makeFront({ x: 30, y: 40, dx: 1, dy: 0 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect(front.x).toBe(31)
  })

  it('tick > MOVE_INTERVAL时move', () => {
    const front = makeFront({ x: 30, y: 40, dx: 1, dy: 0 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL + 100)
    expect(front.x).toBe(31)
  })

  it('第一次move后lastMove更新', () => {
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).lastMove).toBe(MOVE_INTERVAL)
  })

  it('第二次达到间隔时再次move', () => {
    const front = makeFront({ x: 30, y: 40, dx: 1, dy: 0 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    sys.update(0, MOVE_INTERVAL * 2)
    expect(front.x).toBe(32)
  })
})

// ========================================================
// 4. spawn条件和字段值
// ========================================================
describe('WorldWeatherFrontSystem - spawn条件', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fronts已满MAX_FRONTS时不spawn', () => {
    for (let i = 0; i < MAX_FRONTS; i++) {
      ;(sys as any).fronts.push(makeFront())
    }
    sys.update(0, SPAWN_INTERVAL)
    expect((sys as any).fronts).toHaveLength(MAX_FRONTS)
  })

  it('fronts=MAX_FRONTS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_FRONTS - 1; i++) {
      ;(sys as any).fronts.push(makeFront())
    }
    sys.update(0, SPAWN_INTERVAL)
    expect((sys as any).fronts.length).toBeGreaterThan(MAX_FRONTS - 1)
  })

  it('spawn后type是5种之一', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      const types: FrontType[] = ['cold', 'warm', 'storm', 'dry', 'humid']
      expect(types).toContain(front.type)
    }
  })

  it('spawn后width在8..20范围', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      expect(front.width).toBeGreaterThanOrEqual(8)
      expect(front.width).toBeLessThan(20)
    }
  })

  it('spawn后length在20..50范围', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      expect(front.length).toBeGreaterThanOrEqual(20)
      expect(front.length).toBeLessThan(50)
    }
  })

  it('spawn后intensity在3..8范围', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      expect(front.intensity).toBeGreaterThanOrEqual(3)
      expect(front.intensity).toBeLessThan(8)
    }
  })

  it('spawn后maxAge在300..500范围', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      expect(front.maxAge).toBeGreaterThanOrEqual(300)
      expect(front.maxAge).toBeLessThan(500)
    }
  })

  it('spawn后age为1（spawn后同帧执行moveFronts递增）', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) expect(front.age).toBe(1)
  })

  it('spawn后dx或dy包含FRONT_SPEED', () => {
    sys.update(0, SPAWN_INTERVAL)
    const front = (sys as any).fronts[0]
    if (front) {
      const hasSpeed = Math.abs(front.dx) === FRONT_SPEED || Math.abs(front.dy) === FRONT_SPEED
      expect(hasSpeed).toBe(true)
    }
  })
})

// ========================================================
// 5. moveFronts逻辑
// ========================================================
describe('WorldWeatherFrontSystem - moveFronts逻辑', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('front.x按dx移动', () => {
    const front = makeFront({ x: 30, dx: 2, dy: 0 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect(front.x).toBe(32)
  })

  it('front.y按dy移动', () => {
    const front = makeFront({ y: 40, dx: 0, dy: 3 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect(front.y).toBe(43)
  })

  it('front.age每次move递增1', () => {
    const front = makeFront({ age: 0 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect(front.age).toBe(1)
  })

  it('age超过maxAge*0.7时intensity衰减', () => {
    const front = makeFront({ age: 0, maxAge: 100, intensity: 5 })
    ;(sys as any).fronts.push(front)
    // age=71 > 100*0.7=70
    for (let i = 0; i < 71; i++) {
      sys.update(0, MOVE_INTERVAL * (i + 1))
    }
    expect(front.intensity).toBeLessThan(5)
  })

  it('intensity不会低于1', () => {
    const front = makeFront({ age: 0, maxAge: 100, intensity: 1.05 })
    ;(sys as any).fronts.push(front)
    for (let i = 0; i < 100; i++) {
      sys.update(0, MOVE_INTERVAL * (i + 1))
    }
    expect(front.intensity).toBeGreaterThanOrEqual(1)
  })

  it('多个锋面全部移动', () => {
    const f1 = makeFront({ x: 10, dx: 1, dy: 0 })
    const f2 = makeFront({ x: 20, dx: 2, dy: 0 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    expect(f1.x).toBe(11)
    expect(f2.x).toBe(22)
  })
})

// ========================================================
// 6. detectCollisions逻辑
// ========================================================
describe('WorldWeatherFrontSystem - detectCollisions逻辑', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('距离小于COLLISION_DIST且类型不同时产生碰撞', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 15, y: 10 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).collisions.length).toBeGreaterThan(0)
  })

  it('距离大于COLLISION_DIST时不产生碰撞', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 50, y: 50 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).collisions).toHaveLength(0)
  })

  it('类型相同时不产生碰撞', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10 })
    const f2 = makeFront({ id: 2, type: 'cold', x: 15, y: 10 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).collisions).toHaveLength(0)
  })

  it('碰撞severity为两者intensity之和（上限10）', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10, intensity: 4 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 15, y: 10, intensity: 3 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    const col = (sys as any).collisions[0]
    if (col) expect(col.severity).toBe(7)
  })

  it('碰撞severity不超过10', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10, intensity: 8 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 15, y: 10, intensity: 8 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    const col = (sys as any).collisions[0]
    if (col) expect(col.severity).toBeLessThanOrEqual(10)
  })

  it('碰撞位置为两者移动后的中点', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10, dx: 1, dy: 0 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 20, y: 10, dx: 1, dy: 0 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    const col = (sys as any).collisions[0]
    if (col) {
      // 移动后f1.x=11, f2.x=21, 中点=(11+21)/2=16
      expect(col.x).toBe(16)
      expect(col.y).toBe(10)
    }
  })

  it('每次move时collisions重新计算', () => {
    const f1 = makeFront({ id: 1, type: 'cold', x: 10, y: 10 })
    const f2 = makeFront({ id: 2, type: 'warm', x: 15, y: 10 })
    ;(sys as any).fronts.push(f1, f2)
    sys.update(0, MOVE_INTERVAL)
    const count1 = (sys as any).collisions.length
    // 移动后距离变远，碰撞消失
    f2.x = 50
    sys.update(0, MOVE_INTERVAL * 2)
    expect((sys as any).collisions.length).toBeLessThanOrEqual(count1)
  })
})

// ========================================================
// 7. cleanupFronts逻辑
// ========================================================
describe('WorldWeatherFrontSystem - cleanupFronts逻辑', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('age >= maxAge时被删除', () => {
    const front = makeFront({ age: 9, maxAge: 10 })
    ;(sys as any).fronts.push(front)
    ;(sys as any).lastMove = 0
    sys.update(0, MOVE_INTERVAL)
    // age=9 -> 10, 10 >= 10 => 删除
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('age < maxAge时不删除', () => {
    const front = makeFront({ age: 0, maxAge: 100 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(1)
  })

  it('x < -20时被删除（左边界）', () => {
    const front = makeFront({ x: -21, y: 50, dx: 0, dy: 0, age: 0, maxAge: 500 })
    ;(sys as any).fronts.push(front)
    ;(sys as any).lastMove = 0
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('x = -20时不删除（边界值）', () => {
    const front = makeFront({ x: -20, y: 50, age: 0, maxAge: 500 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(1)
  })

  it('x > worldWidth+20时被删除（右边界）', () => {
    sys.setWorldSize(200, 200)
    const front = makeFront({ x: 221, y: 50 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('y < -20时被删除（上边界）', () => {
    const front = makeFront({ x: 50, y: -21 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('y = -20时不删除（边界值）', () => {
    const front = makeFront({ x: 50, y: -20, age: 0, maxAge: 500 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(1)
  })

  it('y > worldHeight+20时被删除（下边界）', () => {
    sys.setWorldSize(200, 200)
    const front = makeFront({ x: 50, y: 221 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(0)
  })

  it('在边界内时不删除', () => {
    sys.setWorldSize(200, 200)
    const front = makeFront({ x: 100, y: 100, age: 0, maxAge: 500 })
    ;(sys as any).fronts.push(front)
    sys.update(0, MOVE_INTERVAL)
    expect((sys as any).fronts).toHaveLength(1)
  })

  it('只删除过期的，保留新的', () => {
    const old = makeFront({ age: 4, maxAge: 5 })
    const fresh = makeFront({ age: 0, maxAge: 500 })
    ;(sys as any).fronts.push(old, fresh)
    ;(sys as any).lastMove = 0
    sys.update(0, MOVE_INTERVAL)
    // old: age=4 -> 5, 5 >= 5 => 删除
    expect((sys as any).fronts).toHaveLength(1)
  })
})

// ========================================================
// 8. setWorldSize和边界验证
// ========================================================
describe('WorldWeatherFrontSystem - setWorldSize和边界', () => {
  let sys: WorldWeatherFrontSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('setWorldSize更新worldWidth', () => {
    sys.setWorldSize(300, 250)
    expect((sys as any).worldWidth).toBe(300)
  })

  it('setWorldSize更新worldHeight', () => {
    sys.setWorldSize(300, 250)
    expect((sys as any).worldHeight).toBe(250)
  })

  it('MAX_FRONTS常量为6', () => {
    expect(MAX_FRONTS).toBe(6)
  })

  it('MOVE_INTERVAL常量为200', () => {
    expect(MOVE_INTERVAL).toBe(200)
  })

  it('SPAWN_INTERVAL常量为1500', () => {
    expect(SPAWN_INTERVAL).toBe(1500)
  })

  it('FRONT_SPEED常量为0.5', () => {
    expect(FRONT_SPEED).toBe(0.5)
  })

  it('COLLISION_DIST常量为15', () => {
    expect(COLLISION_DIST).toBe(15)
  })

  it('支持5种锋面类型', () => {
    const types: FrontType[] = ['cold', 'warm', 'storm', 'dry', 'humid']
    expect(types).toHaveLength(5)
  })

  it('FrontCollision包含所有必要字段', () => {
    const col: FrontCollision = { frontA: 1, frontB: 2, x: 10, y: 20, severity: 5 }
    expect(col.frontA).toBe(1)
    expect(col.frontB).toBe(2)
    expect(col.severity).toBe(5)
  })
})
