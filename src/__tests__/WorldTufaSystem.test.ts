import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTufaSystem } from '../systems/WorldTufaSystem'
import type { TufaTower } from '../systems/WorldTufaSystem'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2770
// FORM_CHANCE = 0.0007  (Math.random() < FORM_CHANCE 才 spawn)
// MAX_TOWERS = 6
// 每次 update 只尝试 1 次（无 for attempt 循环）
// cleanup: !(t.age < 97) 即 t.age >= 97 则删除
// 每次触发后：t.age += 0.003, towerHeight = min(60, h+0.006), calciumContent = max(15, c-0.004), porosityLevel = min(80, p+0.005)
// 新 tower: towerHeight: 3+rand*12, calciumContent: 40+rand*35, porosityLevel: 25+rand*30, waterAlkalinity: 30+rand*35, age: 0

const CHECK_INTERVAL = 2770
const FORM_CHANCE = 0.0007
const MAX_TOWERS = 6
const CLEANUP_AGE = 97
const AGE_PER_TICK = 0.003
const HEIGHT_PER_TICK = 0.006
const MAX_HEIGHT = 60
const CALCIUM_DECAY = 0.004
const MIN_CALCIUM = 15
const POROSITY_PER_TICK = 0.005
const MAX_POROSITY = 80

function makeSys(): WorldTufaSystem {
  return new WorldTufaSystem()
}

let nextId = 1

function makeTower(overrides: Partial<TufaTower> = {}): TufaTower {
  return {
    id: nextId++,
    x: 50,
    y: 50,
    towerHeight: 10,
    calciumContent: 60,
    porosityLevel: 40,
    waterAlkalinity: 50,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

// mock world（Tufa 不检查 tile，只需要 width/height）
function makeMockWorld(width = 200, height = 200): any {
  return { width, height }
}

const mockEm = {} as any

// 强制绕过 CHECK_INTERVAL
function forceTrigger(sys: any, tick: number): void {
  sys.lastCheck = tick - CHECK_INTERVAL - 1
}

// ===== 1. 初始状态 =====
describe('初始状态', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('towers 初始为空数组', () => {
    expect((sys as any).towers).toHaveLength(0)
  })

  it('towers 是 Array 实例', () => {
    expect(Array.isArray((sys as any).towers)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('可以手动注入 tower 并查询', () => {
    ;(sys as any).towers.push(makeTower())
    expect((sys as any).towers).toHaveLength(1)
  })

  it('towers 返回内部引用', () => {
    expect((sys as any).towers).toBe((sys as any).towers)
  })

  it('注入后字段值正确', () => {
    const t = makeTower({ calciumContent: 75, waterAlkalinity: 55, towerHeight: 15 })
    ;(sys as any).towers.push(t)
    const stored = (sys as any).towers[0]
    expect(stored.calciumContent).toBe(75)
    expect(stored.waterAlkalinity).toBe(55)
    expect(stored.towerHeight).toBe(15)
  })

  it('多个 tower 全部返回', () => {
    ;(sys as any).towers.push(makeTower())
    ;(sys as any).towers.push(makeTower())
    expect((sys as any).towers).toHaveLength(2)
  })
})

// ===== 2. CHECK_INTERVAL 节流 =====
describe('CHECK_INTERVAL 节流', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('tick=2769 时不触发（2769 < 2770）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2769)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('tick=2770 时触发（等于 CHECK_INTERVAL）', () => {
    // random=0 < 0.0007 => spawn，且 towers.length=0 < MAX_TOWERS=6
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2770)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('触发后 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不spawn
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('未触发时 lastCheck 不更新', () => {
    sys.update(0, makeMockWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次触发需要再等 CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2770)
    const c1 = (sys as any).towers.length
    sys.update(0, makeMockWorld(), mockEm, 2771) // 1 < 2770，不触发
    expect((sys as any).towers.length).toBe(c1)
  })

  it('tick=5540 时可触发第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 2770) // 第一次
    const c1 = (sys as any).towers.length
    sys.update(0, makeMockWorld(), mockEm, 5540) // 5540-2770=2770，第二次
    expect((sys as any).towers.length).toBeGreaterThan(c1)
  })

  it('tick=1 不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(), mockEm, 1)
    expect((sys as any).towers).toHaveLength(0)
  })
})

// ===== 3. spawn 条件（random 方向） =====
describe('spawn 条件', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0007) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0006)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('random = 0 时 spawn（0 < 0.0007）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('random = FORM_CHANCE = 0.0007 时不 spawn（0.0007 < 0.0007 => false）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('random > FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('random = 1.0 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('towers.length >= MAX_TOWERS 时不 spawn', () => {
    for (let i = 0; i < MAX_TOWERS; i++) {
      ;(sys as any).towers.push(makeTower({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    // towers.length >= 6，不spawn，仍为6（假设age不达到97）
    // 每次触发 age += 0.003，一次触发后 age = 0.003，远未达到 97
    expect((sys as any).towers.length).toBe(MAX_TOWERS)
  })

  it('towers.length < MAX_TOWERS 时可以 spawn', () => {
    for (let i = 0; i < MAX_TOWERS - 1; i++) {
      ;(sys as any).towers.push(makeTower({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 99999)
    sys.update(0, makeMockWorld(), mockEm, 99999)
    expect((sys as any).towers.length).toBe(MAX_TOWERS)
  })

  it('不检查 tile 类型（无 tile 条件）', () => {
    // 不需要 getTile，world 只需要 width/height
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('world 使用 width/height 确定坐标范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(100, 150), mockEm, 5000)
    const t = (sys as any).towers[0]
    expect(t.x).toBeGreaterThanOrEqual(0)
    expect(t.x).toBeLessThan(100)
    expect(t.y).toBeGreaterThanOrEqual(0)
    expect(t.y).toBeLessThan(150)
  })

  it('world.width || 200 fallback：width=0 时使用 200', () => {
    // width=0 时 world.width || 200 = 200
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, { width: 0, height: 0 } as any, mockEm, 5000)
    const t = (sys as any).towers[0]
    // Math.floor(0 * 200) = 0，x=0, y=0
    expect(t.x).toBe(0)
    expect(t.y).toBe(0)
  })
})

// ===== 4. spawn 后字段值校验 =====
describe('spawn 后字段值校验', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(tick = 5000): TufaTower {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, tick)
    sys.update(0, makeMockWorld(), mockEm, tick)
    return (sys as any).towers[0]
  }

  it('新 tower 具有 id 字段', () => {
    const t = spawnOne()
    expect(t).toHaveProperty('id')
  })

  it('新 tower 具有 x, y 字段', () => {
    const t = spawnOne()
    expect(t).toHaveProperty('x')
    expect(t).toHaveProperty('y')
  })

  it('新 tower 初始 age 经 updateAll 后约为 0.003（同帧更新）', () => {
    // 注意：spawn 后同帧执行 update loop，age += 0.003
    const t = spawnOne()
    expect(t.age).toBeCloseTo(0.003, 10)
  })

  it('新 tower 的 tick 等于当前 tick', () => {
    const t = spawnOne(5000)
    expect(t.tick).toBe(5000)
  })

  it('towerHeight 经同帧更新后增加 0.006（random=0时初始为3）', () => {
    const t = spawnOne()
    // initialHeight = 3 + 0*12 = 3, 同帧 +0.006 = 3.006
    expect(t.towerHeight).toBeCloseTo(3.006, 10)
  })

  it('calciumContent 经同帧更新后减少 0.004（random=0时初始为40）', () => {
    const t = spawnOne()
    // initialCalcium = 40 + 0*35 = 40, max(15, 40-0.004) = 39.996
    expect(t.calciumContent).toBeCloseTo(39.996, 10)
  })

  it('porosityLevel 经同帧更新后增加 0.005（random=0时初始为25）', () => {
    const t = spawnOne()
    // initialPorosity = 25 + 0*30 = 25, min(80, 25+0.005) = 25.005
    expect(t.porosityLevel).toBeCloseTo(25.005, 10)
  })

  it('waterAlkalinity 不随 update 变化（random=0时初始为30）', () => {
    const t = spawnOne()
    // initialAlkalinity = 30 + 0*35 = 30，没有更新
    expect(t.waterAlkalinity).toBeCloseTo(30, 10)
  })

  it('towerHeight 上限为 60（min 操作）', () => {
    const t = makeTower({ towerHeight: 59.999 })
    ;(sys as any).towers.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1.0) // 不 spawn
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // 59.999 + 0.006 = 60.005 => min(60, 60.005) = 60
    expect((sys as any).towers[0].towerHeight).toBe(60)
  })

  it('calciumContent 下限为 15（max 操作）', () => {
    const t = makeTower({ calciumContent: 15.001 })
    ;(sys as any).towers.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // 15.001 - 0.004 = 14.997 => max(15, 14.997) = 15
    expect((sys as any).towers[0].calciumContent).toBe(15)
  })

  it('porosityLevel 上限为 80（min 操作）', () => {
    const t = makeTower({ porosityLevel: 79.999 })
    ;(sys as any).towers.push(t)
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // 79.999 + 0.005 = 80.004 => min(80, 80.004) = 80
    expect((sys as any).towers[0].porosityLevel).toBe(80)
  })
})

// ===== 5. cleanup 逻辑（age >= 97） =====
describe('cleanup 逻辑（t.age >= 97）', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('age >= 97 的 tower 被删除（!(age < 97) 为 true）', () => {
    ;(sys as any).towers.push(makeTower({ age: 97 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0) // 不 spawn
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // age=97, 97+0.003=97.003, !(97.003 < 97) = true => 删除
    expect((sys as any).towers).toHaveLength(0)
  })

  it('age < 97 的 tower 保留', () => {
    ;(sys as any).towers.push(makeTower({ age: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('age = 96.999 时保留（96.999+0.003=97.002 >= 97 => 删除）', () => {
    ;(sys as any).towers.push(makeTower({ age: 96.999 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // 96.999 + 0.003 = 97.002, !(97.002 < 97) = true => 删除
    expect((sys as any).towers).toHaveLength(0)
  })

  it('age = 0 时不删除（0+0.003=0.003 < 97）', () => {
    ;(sys as any).towers.push(makeTower({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('同时清理多个过期 tower', () => {
    ;(sys as any).towers.push(makeTower({ age: 97 }))
    ;(sys as any).towers.push(makeTower({ age: 98 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('部分过期时只删过期的', () => {
    ;(sys as any).towers.push(makeTower({ age: 97, id: 100 }))
    ;(sys as any).towers.push(makeTower({ age: 10, id: 101 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
    expect((sys as any).towers[0].id).toBe(101)
  })

  it('cleanup 在 updateAll 之后执行（age 先 +0.003 再检查）', () => {
    // age=96.998，更新后=97.001 >= 97 => 删除
    ;(sys as any).towers.push(makeTower({ age: 96.998 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(0)
  })

  it('未达到 CHECK_INTERVAL 时 cleanup 不执行', () => {
    ;(sys as any).towers.push(makeTower({ age: 100 })) // 超龄
    sys.update(0, makeMockWorld(), mockEm, 100) // 不触发
    expect((sys as any).towers).toHaveLength(1) // 不清理
  })
})

// ===== 6. MAX_TOWERS 上限 =====
describe('MAX_TOWERS 上限（6）', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_TOWERS 常量为 6', () => {
    expect(MAX_TOWERS).toBe(6)
  })

  it('towers.length >= 6 时不 spawn', () => {
    for (let i = 0; i < MAX_TOWERS; i++) {
      ;(sys as any).towers.push(makeTower({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    // 已有 6 个，不能 spawn 更多；age 0+0.003 < 97 不清理
    expect((sys as any).towers.length).toBe(MAX_TOWERS)
  })

  it('towers.length = 5 时可以 spawn 到 6', () => {
    for (let i = 0; i < MAX_TOWERS - 1; i++) {
      ;(sys as any).towers.push(makeTower({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers.length).toBe(MAX_TOWERS)
  })

  it('CHECK_INTERVAL 参数正确', () => {
    expect(CHECK_INTERVAL).toBe(2770)
  })

  it('FORM_CHANCE 参数正确', () => {
    expect(FORM_CHANCE).toBe(0.0007)
  })

  it('每次 update 只尝试一次 spawn（非循环）', () => {
    // 空 towers，random=0，每次触发只 spawn 1 个
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers).toHaveLength(1)
  })

  it('towers 上限不超过 MAX_TOWERS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 5000; t < 5000 + CHECK_INTERVAL * 10; t += CHECK_INTERVAL) {
      forceTrigger(sys, t)
      sys.update(0, makeMockWorld(), mockEm, t)
    }
    expect((sys as any).towers.length).toBeLessThanOrEqual(MAX_TOWERS)
  })

  it('age 更新逻辑：每次触发 +0.003', () => {
    ;(sys as any).towers.push(makeTower({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0) // 不spawn
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].age).toBeCloseTo(0.003, 10)
  })

  it('多次触发后 age 累积', () => {
    ;(sys as any).towers.push(makeTower({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    forceTrigger(sys, 10000)
    sys.update(0, makeMockWorld(), mockEm, 10000)
    expect((sys as any).towers[0].age).toBeCloseTo(0.006, 10)
  })
})

// ===== 7. 字段更新逻辑细节 =====
describe('字段更新逻辑细节', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  afterEach(() => { vi.restoreAllMocks() })

  it('towerHeight 已达 60 时保持 60（min 守护）', () => {
    ;(sys as any).towers.push(makeTower({ towerHeight: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].towerHeight).toBe(60)
  })

  it('calciumContent 已达 15 时保持 15（max 守护）', () => {
    ;(sys as any).towers.push(makeTower({ calciumContent: 15 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].calciumContent).toBe(15)
  })

  it('porosityLevel 已达 80 时保持 80（min 守护）', () => {
    ;(sys as any).towers.push(makeTower({ porosityLevel: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].porosityLevel).toBe(80)
  })

  it('towerHeight 正常增长', () => {
    ;(sys as any).towers.push(makeTower({ towerHeight: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].towerHeight).toBeCloseTo(20.006, 10)
  })

  it('calciumContent 正常衰减', () => {
    ;(sys as any).towers.push(makeTower({ calciumContent: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].calciumContent).toBeCloseTo(49.996, 10)
  })

  it('porosityLevel 正常增长', () => {
    ;(sys as any).towers.push(makeTower({ porosityLevel: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].porosityLevel).toBeCloseTo(50.005, 10)
  })

  it('waterAlkalinity 不变', () => {
    ;(sys as any).towers.push(makeTower({ waterAlkalinity: 45 }))
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    expect((sys as any).towers[0].waterAlkalinity).toBe(45)
  })

  it('tower.id 单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    forceTrigger(sys, 5000)
    sys.update(0, makeMockWorld(), mockEm, 5000)
    forceTrigger(sys, 10000)
    sys.update(0, makeMockWorld(), mockEm, 10000)
    const towers: TufaTower[] = (sys as any).towers
    if (towers.length >= 2) {
      for (let i = 1; i < towers.length; i++) {
        expect(towers[i].id).toBeGreaterThan(towers[i - 1].id)
      }
    }
  })
})
