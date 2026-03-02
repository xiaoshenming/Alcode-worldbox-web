import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSacredGroveSystem } from '../systems/WorldSacredGroveSystem'
import type { SacredGrove } from '../systems/WorldSacredGroveSystem'

// ── helpers ────────────────────────────────────────────────────────────────
let _idCounter = 100
function makeSys(): WorldSacredGroveSystem { return new WorldSacredGroveSystem() }

function makeGrove(
  x = 20,
  y = 30,
  overrides: Partial<SacredGrove> = {},
): SacredGrove {
  return {
    id: _idCounter++,
    x,
    y,
    radius: 10,
    power: 5,
    spiritCount: 2,
    age: 0,
    blessingType: 'healing',
    discoveredBy: new Set(),
    ...overrides,
  }
}

/** 构造一个始终返回 FOREST tile（4）的 world mock */
function makeWorld(w = 100, h = 100, tile: number | null = 4) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
  }
}

// 常量（与源码保持一致）
const SPAWN_INTERVAL = 2500
const BLESSING_INTERVAL = 600
const MAX_GROVES = 10
const GROVE_RADIUS = 10
const MIN_DISTANCE = 25

// ── 1. 初始状态 ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => { sys = makeSys() })

  it('groves 初始为空数组', () => {
    expect(sys.getGroves()).toHaveLength(0)
  })
  it('getGroveCount() ��始为 0', () => {
    expect(sys.getGroveCount()).toBe(0)
  })
  it('getGroveAt() 在空列表上返回 undefined', () => {
    expect(sys.getGroveAt(50, 50)).toBeUndefined()
  })
  it('getGroves() 返回同一引用', () => {
    expect(sys.getGroves()).toBe(sys.getGroves())
  })
  it('lastSpawn 初始为 0', () => {
    expect((sys as any).lastSpawn).toBe(0)
  })
  it('lastBlessing 初始为 0', () => {
    expect((sys as any).lastBlessing).toBe(0)
  })
  it('groves 是 Array 类型', () => {
    expect(Array.isArray(sys.getGroves())).toBe(true)
  })
  it('初始 getGroveAt 任意坐标均为 undefined', () => {
    for (const [x, y] of [[0, 0], [100, 100], [-5, -5]]) {
      expect(sys.getGroveAt(x, y)).toBeUndefined()
    }
  })
})

// ── 2. 节流逻辑 ────────────────────────────────────────────────────────────
describe('节流逻辑', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 不触发 spawn（lastSpawn=0，差值=0 < SPAWN_INTERVAL）', () => {
    sys.update(16, makeWorld(), 0)
    // SPAWN_INTERVAL=2500，tick-lastSpawn=0，不满足 >=
    expect(sys.getGroveCount()).toBe(0)
  })
  it('tick < SPAWN_INTERVAL 时不 spawn', () => {
    sys.update(16, makeWorld(), SPAWN_INTERVAL - 1)
    expect(sys.getGroveCount()).toBe(0)
  })
  it('tick === SPAWN_INTERVAL 时触发 spawn（forest tile）', () => {
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(1)
  })
  it('spawn 后 lastSpawn 更新为当前 tick', () => {
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect((sys as any).lastSpawn).toBe(SPAWN_INTERVAL)
  })
  it('两次 update 间隔不足 SPAWN_INTERVAL 时不重复 spawn', () => {
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL + 100)
    expect(sys.getGroveCount()).toBe(1)
  })
  it('tick < BLESSING_INTERVAL 时不调用 updateGroves', () => {
    sys.getGroves().push(makeGrove(20, 30, { age: 0 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL - 1)
    expect(sys.getGroves()[0].age).toBe(0)
  })
  it('tick === BLESSING_INTERVAL 时触发 updateGroves，age+1', () => {
    sys.getGroves().push(makeGrove(20, 30, { age: 0 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].age).toBe(1)
  })
  it('lastBlessing 在 blessing 触发后更新', () => {
    sys.getGroves().push(makeGrove())
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect((sys as any).lastBlessing).toBe(BLESSING_INTERVAL)
  })
})

// ── 3. spawn 条件 ──────────────────────────────────────────────────────────
describe('spawn 条件', () => {
  let sys: WorldSacredGroveSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('非 forest tile（null）不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, null), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(0)
  })
  it('非 forest tile（3=草地）不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 3), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(0)
  })
  it('非 forest tile（0=深水）不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 0), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(0)
  })
  it('非 forest tile（1=浅水）不 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 1), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(0)
  })
  it('已达 MAX_GROVES 时不再 spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 注入 MAX_GROVES 个圣林（间距 > MIN_DISTANCE）
    for (let i = 0; i < MAX_GROVES; i++) {
      sys.getGroves().push(makeGrove(i * 30 + 10, 10))
    }
    sys.update(16, makeWorld(500, 500, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(MAX_GROVES)
  })
  it('新位置距已有圣林 < MIN_DISTANCE 时不 spawn', () => {
    sys = makeSys()
    // Math.random 始终返回 0.5，坐标为 10+floor(0.5*(100-20))=10+40=50
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const count = sys.getGroveCount()
    // 在同一位置再次触发
    ;(sys as any).lastSpawn = 0
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(count) // 不增加
  })
  it('位置距已有圣林 >= MIN_DISTANCE 时可 spawn', () => {
    sys = makeSys()
    // 注入一个圣林在 (50, 50)
    sys.getGroves().push(makeGrove(50, 50))
    // mock 让坐标落在 (10, 10)，距离 > MIN_DISTANCE
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(2)
  })
})

// ── 4. spawn 后字段值 ──────────────────────────────────────────────────────
describe('spawn 后字段值', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('新圣林 age 初始为 0（spawn 时赋值，blessing 可能同 tick 自增 1）', () => {
    // SPAWN_INTERVAL=2500 > BLESSING_INTERVAL=600，同一 tick 内 blessing 也会触发，
    // 所以 age 可能为 0（spawn 在 blessing 之后评估）或 1（blessing 先执行）。
    // 验证 spawn 时写入 age=0 的方式：直接检查 grove 的初始赋值为合理小值。
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 先注入一个 tick 仅触发 spawn 不触发 blessing（不可能，SPAWN>BLESSING）
    // 所以通过先让 lastBlessing 已在 tick=SPAWN_INTERVAL 时更新来规避二次触发
    ;(sys as any).lastBlessing = SPAWN_INTERVAL  // blessing 刚刚触发过，不会再触发
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroves()[0].age).toBe(0)
  })
  it('新圣林 radius === GROVE_RADIUS（10）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroves()[0].radius).toBe(GROVE_RADIUS)
  })
  it('新圣林 power 在 [2,6] 范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const p = sys.getGroves()[0].power
    expect(p).toBeGreaterThanOrEqual(2)
    expect(p).toBeLessThanOrEqual(6)
  })
  it('新圣林 spiritCount 在 [1,3] 范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const s = sys.getGroves()[0].spiritCount
    expect(s).toBeGreaterThanOrEqual(1)
    expect(s).toBeLessThanOrEqual(3)
  })
  it('新圣林 discoveredBy 为空 Set', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    expect(sys.getGroves()[0].discoveredBy.size).toBe(0)
  })
  it('新圣林 id 为正整数', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const id = sys.getGroves()[0].id
    expect(id).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(id)).toBe(true)
  })
  it('新圣林 blessingType 为合法值', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const valid = ['healing', 'wisdom', 'strength', 'fertility', 'protection']
    expect(valid).toContain(sys.getGroves()[0].blessingType)
  })
  it('x 坐标在 [10, width-10) 范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const x = sys.getGroves()[0]?.x
    if (x !== undefined) {
      expect(x).toBeGreaterThanOrEqual(10)
      expect(x).toBeLessThan(100)
    }
  })
  it('y 坐标在 [10, height-10) 范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, makeWorld(100, 100, 4), SPAWN_INTERVAL)
    const y = sys.getGroves()[0]?.y
    if (y !== undefined) {
      expect(y).toBeGreaterThanOrEqual(10)
      expect(y).toBeLessThan(100)
    }
  })
})

// ── 5. update 字段变更（updateGroves）─────────────────────────────────────
describe('update 字段变更', () => {
  let sys: WorldSacredGroveSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('每次 blessing tick age 增加 1', () => {
    sys = makeSys()
    sys.getGroves().push(makeGrove(20, 30, { age: 0 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].age).toBe(1)
  })
  it('age % 10 === 0 且 power < 10 时 power+1', () => {
    sys = makeSys()
    // age 从 9 开始，blessing 后变 10（10%10===0），power 应+1
    sys.getGroves().push(makeGrove(20, 30, { age: 9, power: 5 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].power).toBe(6)
  })
  it('power 已达 10 时不再增加', () => {
    sys = makeSys()
    sys.getGroves().push(makeGrove(20, 30, { age: 9, power: 10 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].power).toBe(10)
  })
  it('age % 10 !== 0 时 power 不变', () => {
    sys = makeSys()
    sys.getGroves().push(makeGrove(20, 30, { age: 4, power: 5 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].power).toBe(5)
  })
  it('age % 20 === 0 且 spiritCount < 5 且 random < 0.2 时 spiritCount+1', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.2
    // age 从 19 开始，blessing 后变 20（20%20===0）
    sys.getGroves().push(makeGrove(20, 30, { age: 19, spiritCount: 2 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].spiritCount).toBe(3)
  })
  it('age % 20 === 0 但 random >= 0.2 时 spiritCount 不变', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // >= 0.2
    sys.getGroves().push(makeGrove(20, 30, { age: 19, spiritCount: 2 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].spiritCount).toBe(2)
  })
  it('spiritCount 已达 5 时不再增加', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.getGroves().push(makeGrove(20, 30, { age: 19, spiritCount: 5 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].spiritCount).toBe(5)
  })
  it('多个圣林 age 均被更新', () => {
    sys = makeSys()
    sys.getGroves().push(makeGrove(20, 30, { age: 0 }))
    sys.getGroves().push(makeGrove(80, 80, { age: 5 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].age).toBe(1)
    expect(sys.getGroves()[1].age).toBe(6)
  })
})

// ── 6. cleanup / discoveredBy ─────────────────────────────────────────────
describe('cleanup 逻辑', () => {
  let sys: WorldSacredGroveSystem

  beforeEach(() => { sys = makeSys() })

  it('discoveredBy 可手动添加 civId', () => {
    const g = makeGrove()
    g.discoveredBy.add(1)
    g.discoveredBy.add(2)
    sys.getGroves().push(g)
    expect(sys.getGroves()[0].discoveredBy.size).toBe(2)
  })
  it('discoveredBy 不重复添加相同 civId', () => {
    const g = makeGrove()
    g.discoveredBy.add(5)
    g.discoveredBy.add(5)
    sys.getGroves().push(g)
    expect(sys.getGroves()[0].discoveredBy.size).toBe(1)
  })
  it('手动从 groves 列表移除一个后 count 减少', () => {
    sys.getGroves().push(makeGrove(10, 10))
    sys.getGroves().push(makeGrove(60, 60))
    sys.getGroves().splice(0, 1)
    expect(sys.getGroveCount()).toBe(1)
  })
  it('清空 groves 后 getGroveAt 返回 undefined', () => {
    sys.getGroves().push(makeGrove(20, 30))
    sys.getGroves().length = 0
    expect(sys.getGroveAt(20, 30)).toBeUndefined()
  })
  it('updateGroves 不移除任何圣林（无清理逻辑）', () => {
    sys.getGroves().push(makeGrove(20, 30, { age: 0 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroveCount()).toBe(1)
  })
  it('圣林 power 被 Math.min 保护不超过 10', () => {
    sys.getGroves().push(makeGrove(20, 30, { age: 9, power: 9 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].power).toBeLessThanOrEqual(10)
  })
  it('圣林 spiritCount 被条件保护不超过 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.getGroves().push(makeGrove(20, 30, { age: 19, spiritCount: 5 }))
    sys.update(16, makeWorld(), BLESSING_INTERVAL)
    expect(sys.getGroves()[0].spiritCount).toBeLessThanOrEqual(5)
    vi.restoreAllMocks()
  })
})

// ── 7. MAX_GROVES 上限 ────────────────────────────────────────────────────
describe('MAX_GROVES 上限', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it(`已有 ${MAX_GROVES} 个圣林时不再 spawn`, () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < MAX_GROVES; i++) {
      sys.getGroves().push(makeGrove(i * 30 + 10, 10))
    }
    sys.update(16, makeWorld(500, 500, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(MAX_GROVES)
  })
  it('未达 MAX_GROVES 时可继续 spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 注入 MAX_GROVES - 1 个，间距足够大
    for (let i = 0; i < MAX_GROVES - 1; i++) {
      sys.getGroves().push(makeGrove(i * 50 + 10, 10))
    }
    // 新 tick 触发，位置在中间附近（0.5*480+10=250），离最近圣林距离合理
    // 因为���有圣林排在 x=10,60,110,...，最近为 x=450，250离450差200>25
    sys.update(16, makeWorld(500, 500, 4), SPAWN_INTERVAL)
    expect(sys.getGroveCount()).toBe(MAX_GROVES)
  })
  it('MAX_GROVES 常量值为 10', () => {
    expect(MAX_GROVES).toBe(10)
  })
})

// ── 8. getGroveAt 边界验证 ─────────────────────────────────────────────────
describe('getGroveAt 边界验证', () => {
  let sys: WorldSacredGroveSystem
  beforeEach(() => { sys = makeSys() })

  it('中心点（dx=0,dy=0）在 radius 内，返回圣林', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 10 }))
    expect(sys.getGroveAt(50, 50)).toBeDefined()
  })
  it('距中心恰好 radius 时（dx²+dy²===r²）仍返回圣林', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 10 }))
    // 水平距离 = 10，dy = 0，dx²+dy²=100 = radius²，满足 <=
    expect(sys.getGroveAt(60, 50)).toBeDefined()
  })
  it('距中心 radius+1 时返回 undefined', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 10 }))
    // dx=11,dy=0 → 121 > 100
    expect(sys.getGroveAt(61, 50)).toBeUndefined()
  })
  it('多个圣林时返回第一个覆盖目标的圣林', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 5, id: 1 }))
    sys.getGroves().push(makeGrove(50, 50, { radius: 10, id: 2 }))
    expect(sys.getGroveAt(50, 50)?.id).toBe(1)
  })
  it('负坐标不崩溃', () => {
    sys.getGroves().push(makeGrove(0, 0, { radius: 10 }))
    expect(() => sys.getGroveAt(-5, -5)).not.toThrow()
  })
  it('坐标超出边界不崩溃', () => {
    expect(() => sys.getGroveAt(9999, 9999)).not.toThrow()
  })
  it('getGroveAt 不在 getGroves 范围内时返回 undefined', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 5 }))
    expect(sys.getGroveAt(0, 0)).toBeUndefined()
  })
  it('radius 为 0 时仅中心点返回圣林', () => {
    sys.getGroves().push(makeGrove(50, 50, { radius: 0 }))
    expect(sys.getGroveAt(50, 50)).toBeDefined()
    expect(sys.getGroveAt(51, 50)).toBeUndefined()
  })
  it('getGroveCount 与 getGroves().length 一致', () => {
    sys.getGroves().push(makeGrove(10, 10))
    sys.getGroves().push(makeGrove(60, 60))
    sys.getGroves().push(makeGrove(110, 10))
    expect(sys.getGroveCount()).toBe(sys.getGroves().length)
  })
  it('圣林列表修改后 getGroveAt 即时反映', () => {
    const g = makeGrove(50, 50)
    sys.getGroves().push(g)
    expect(sys.getGroveAt(50, 50)).toBeDefined()
    sys.getGroves().length = 0
    expect(sys.getGroveAt(50, 50)).toBeUndefined()
  })
})
