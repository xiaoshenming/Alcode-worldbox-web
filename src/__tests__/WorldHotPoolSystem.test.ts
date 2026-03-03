import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHotPoolSystem } from '../systems/WorldHotPoolSystem'
import type { HotPool } from '../systems/WorldHotPoolSystem'

const CHECK_INTERVAL = 2730
const MAX_POOLS = 7
const FORM_CHANCE = 0.0008

function makeSys(): WorldHotPoolSystem { return new WorldHotPoolSystem() }

let nextId = 1
function makePool(overrides: Partial<HotPool> = {}): HotPool {
  return {
    id: nextId++, x: 25, y: 35,
    temperature: 85, mineralRichness: 70,
    poolDepth: 4, colorIntensity: 80,
    age: 0, tick: 0,
    ...overrides,
  }
}

// HotPool 无 tile 限制，任意 getTile 值皆可
const mockWorld = { width: 200, height: 200, getTile: () => 3 } as any
const fakeEm = {} as any

describe('WorldHotPoolSystem', () => {
  let sys: WorldHotPoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────��─────────────────
  describe('初始状态', () => {
    it('pools 数组初始为空', () => {
      expect((sys as any).pools).toHaveLength(0)
    })
    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL - 1)
      expect((sys as any).pools).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 阻断 spawn
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL + 500)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
    })

    it('第一次执行后再次调用间隔不足时不更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })
  })

  // ── spawn 控制 ──────────────────────────────────────────────────────────────
  describe('spawn 控制', () => {
    it('random=0.9 时不 spawn（FORM_CHANCE=0.0008）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools).toHaveLength(0)
    })

    it('random=0 时可 spawn（任意 tile 皆允许）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools).toHaveLength(1)
    })

    it('spawn 后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(2)
    })

    it('spawn 后记录正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].tick).toBe(CHECK_INTERVAL)
    })

    it('spawn 的 pool age 初始为 0，但 update 后立即增加 0.004', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      // spawn 发生后同一次 update 的 for 循环会执行 age += 0.004
      expect((sys as any).pools[0].age).toBeCloseTo(0.004)
    })
  })

  // ── update 后字段变化 ────────────────────────────────────────────────────────
  describe('update 后字段变化', () => {
    it('age 每次 update 增加 0.004', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ age: 10 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].age).toBeCloseTo(10.004)
    })

    it('temperature 每次 update 减少 0.006，最低 25', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ temperature: 60 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].temperature).toBeCloseTo(59.994)
    })

    it('temperature 不低于 25', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ temperature: 25 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].temperature).toBe(25)
    })

    it('mineralRichness 每次 update 增加 0.008，最大 85', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ mineralRichness: 50 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].mineralRichness).toBeCloseTo(50.008)
    })

    it('mineralRichness 不超过 85', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ mineralRichness: 85 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].mineralRichness).toBe(85)
    })

    it('colorIntensity 每次 update 增加 0.005，最大 90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ colorIntensity: 40 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].colorIntensity).toBeCloseTo(40.005)
    })

    it('colorIntensity 不超过 90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ colorIntensity: 90 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools[0].colorIntensity).toBe(90)
    })
  })

  // ── cleanup ─────────────────────────────────────────────────────────────────
  describe('cleanup', () => {
    it('age >= 93 时删除（注入 age=92.997 → update 后 >=93）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ age: 92.997 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      // 92.997 + 0.004 = 93.001 >= 93 → 删除
      expect((sys as any).pools).toHaveLength(0)
    })

    it('age=92.99 → update 后 <93 保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const p = makePool({ age: 92.99 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      // 92.99 + 0.004 = 92.994 < 93 → 保留
      expect((sys as any).pools).toHaveLength(1)
    })

    it('age 恰好到达 93 时删除（边界）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      // 设置 age = 93 - 0.004，update 后刚好等于 93
      const p = makePool({ age: 93 - 0.004 })
      ;(sys as any).pools.push(p)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      // 93 - 0.004 + 0.004 = 93.0，!(93 < 93) = true → 删除
      expect((sys as any).pools).toHaveLength(0)
    })

    it('混合 cleanup：age 已超删除，age 未超保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const old = makePool({ age: 92.997 })  // update 后 >= 93
      const fresh = makePool({ age: 10 })    // update 后 < 93
      ;(sys as any).pools.push(old, fresh)
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools).toHaveLength(1)
      expect((sys as any).pools[0].id).toBe(fresh.id)
    })
  })

  // ── MAX_POOLS 上限 ───────────────────────────────────────────────────────────
  describe('MAX_POOLS 上限', () => {
    it('已达 MAX_POOLS 时不再 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_POOLS; i++) {
        ;(sys as any).pools.push(makePool())
      }
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools).toHaveLength(MAX_POOLS)
    })

    it('pools 数量为 MAX_POOLS-1 时仍可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_POOLS - 1; i++) {
        ;(sys as any).pools.push(makePool())
      }
      sys.update(0, mockWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).pools).toHaveLength(MAX_POOLS)
    })
  })

  // ── 字段范围验证 ─────────────────────────────────────────────────────────────
  describe('字段范围验证', () => {
    it('注入的 temperature 可正确读取', () => {
      ;(sys as any).pools.push(makePool({ temperature: 65 }))
      expect((sys as any).pools[0].temperature).toBe(65)
    })
    it('注入的 poolDepth 可正确读取', () => {
      ;(sys as any).pools.push(makePool({ poolDepth: 12 }))
      expect((sys as any).pools[0].poolDepth).toBe(12)
    })
    it('注入的 colorIntensity 可正确读取', () => {
      ;(sys as any).pools.push(makePool({ colorIntensity: 30 }))
      expect((sys as any).pools[0].colorIntensity).toBe(30)
    })
    it('多个 pool 各自保持独立 id', () => {
      const p1 = makePool()
      const p2 = makePool()
      ;(sys as any).pools.push(p1, p2)
      expect((sys as any).pools[0].id).not.toBe((sys as any).pools[1].id)
    })
  })
})

describe('WorldHotPoolSystem - 附加测试', () => {
  let sys: WorldHotPoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('pools初始为空数组', () => { expect((sys as any).pools).toHaveLength(0) })
  it('pools是数组类型', () => { expect(Array.isArray((sys as any).pools)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('tick不足CHECK_INTERVAL=2730时不更新lastCheck', () => {
    sys.update(1, mockWorld, fakeEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2730时更新lastCheck', () => {
    sys.update(1, mockWorld, fakeEm, 2730)
    expect((sys as any).lastCheck).toBe(2730)
  })
  it('tick=2729时不触发', () => {
    sys.update(1, mockWorld, fakeEm, 2729)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=5460时再次触发', () => {
    sys.update(1, mockWorld, fakeEm, 2730)
    sys.update(1, mockWorld, fakeEm, 5460)
    expect((sys as any).lastCheck).toBe(5460)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, mockWorld, fakeEm, 8190)
    expect((sys as any).lastCheck).toBe(8190)
  })
  it('注入pool后长度为1', () => {
    ;(sys as any).pools.push(makePool())
    expect((sys as any).pools).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { (sys as any).pools.push(makePool()) }
    expect((sys as any).pools).toHaveLength(5)
  })
  it('pool含temperature字段', () => { expect(makePool({ temperature: 95 }).temperature).toBe(95) })
  it('pool含mineralRichness字段', () => { expect(makePool({ mineralRichness: 80 }).mineralRichness).toBe(80) })
  it('pool含poolDepth字段', () => { expect(makePool({ poolDepth: 5 }).poolDepth).toBe(5) })
  it('pool含colorIntensity字段', () => { expect(makePool({ colorIntensity: 90 }).colorIntensity).toBe(90) })
  it('pool含age字段', () => { expect(makePool({ age: 100 }).age).toBe(100) })
  it('pool含tick字段', () => { expect(makePool({ tick: 5000 }).tick).toBe(5000) })
  it('pool含x,y坐标', () => {
    const p = makePool({ x: 15, y: 25 })
    expect(p.x).toBe(15); expect(p.y).toBe(25)
  })
  it('过期pool被清除', () => {
    // age >= 93 的 pool 会被 source 的 !(p.age < 93) 条件删除
    ;(sys as any).pools.push(makePool({ age: 93, tick: 0 }))
    sys.update(1, mockWorld, fakeEm, 100000)
    expect((sys as any).pools).toHaveLength(0)
  })
  it('未过期pool保留', () => {
    ;(sys as any).pools.push(makePool({ tick: 90000 }))
    sys.update(1, mockWorld, fakeEm, 95000)
    expect((sys as any).pools).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    // pool1: age=93 (过期) → 被删除
    ;(sys as any).pools.push(makePool({ id:1, age: 93, tick: 0 }))
    // pool2: age=0 (未过期) → 保留
    ;(sys as any).pools.push(makePool({ id:2, age: 0, tick: 90000 }))
    sys.update(1, mockWorld, fakeEm, 95000)
    expect((sys as any).pools).toHaveLength(1)
    expect((sys as any).pools[0].id).toBe(2)
  })
  it('MAX_POOLS=7硬上限不超过', () => {
    for (let i = 0; i < 7; i++) { (sys as any).pools.push(makePool({ id:i+1, tick: 999999 })) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, mockWorld, fakeEm, 2730)
    expect((sys as any).pools.length).toBeLessThanOrEqual(7)
  })
  it('pools中id不重复', () => {
    for (let i = 0; i < 5; i++) { (sys as any).pools.push(makePool()) }
    const ids = (sys as any).pools.map((p: any) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('空pools时update不崩溃', () => {
    expect(() => sys.update(1, mockWorld, fakeEm, 2730)).not.toThrow()
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, mockWorld, fakeEm, 2730)
    const lc1 = (sys as any).lastCheck
    sys.update(1, mockWorld, fakeEm, 2730)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('update不返回值', () => {
    expect(sys.update(1, mockWorld, fakeEm, 2730)).toBeUndefined()
  })
  it('tick=0时不触发', () => {
    sys.update(1, mockWorld, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})
