import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCirqueSystem } from '../systems/WorldCirqueSystem'
import type { Cirque } from '../systems/WorldCirqueSystem'

const CHECK_INTERVAL = 2650
const world = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

function makeSys(): WorldCirqueSystem { return new WorldCirqueSystem() }
let nextId = 1
function makeCirque(overrides: Partial<Cirque> = {}): Cirque {
  return {
    id: nextId++, x: 20, y: 30,
    diameter: 15, wallHeight: 25, glacialDepth: 10,
    erosionRate: 3, tarnPresent: true, spectacle: 80, tick: 0,
    ...overrides
  }
}

describe('WorldCirqueSystem', () => {
  let sys: WorldCirqueSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // === 基础状态测试 ===
  it('初始无冰斗', () => { expect((sys as any).cirques).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).cirques.push(makeCirque())
    expect((sys as any).cirques).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).cirques).toBe((sys as any).cirques)
  })

  it('冰斗字段正确', () => {
    ;(sys as any).cirques.push(makeCirque())
    const c = (sys as any).cirques[0]
    expect(c.wallHeight).toBe(25)
    expect(c.tarnPresent).toBe(true)
    expect(c.spectacle).toBe(80)
  })

  it('多个冰斗全部返回', () => {
    ;(sys as any).cirques.push(makeCirque())
    ;(sys as any).cirques.push(makeCirque())
    expect((sys as any).cirques).toHaveLength(2)
  })

  // === CHECK_INTERVAL 节流测试 ===
  it('tick不足CHECK_INTERVAL不触发更新', () => {
    ;(sys as any).cirques.push(makeCirque({ diameter: 15 }))
    const before = (sys as any).cirques[0].diameter
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).cirques[0].diameter).toBe(before)
  })

  it('tick达到CHECK_INTERVAL时执行字段更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ diameter: 10, erosionRate: 3 }))
    const before = (sys as any).cirques[0].diameter
    sys.update(1, world, em, CHECK_INTERVAL)
    // diameter += erosionRate * 0.00004 = 3*0.00004 = 0.00012 → 微小增量
    expect((sys as any).cirques[0].diameter).toBeGreaterThan(before)
  })

  it('lastCheck在update后被记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次间隔不足不重复更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ diameter: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const after1 = (sys as any).cirques[0].diameter
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).cirques[0].diameter).toBe(after1)
  })

  // === spawn 测试 ===
  it('DEEP_WATER地形不触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques).toHaveLength(0)
  })

  it('MOUNTAIN(5)地形可以spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < 0.0014 触发spawn
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cirques.length).toBeGreaterThanOrEqual(1)
  })

  it('SNOW(6)地形可以spawn', () => {
    const snowWorld = { width: 200, height: 200, getTile: () => 6 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).cirques.length).toBeGreaterThanOrEqual(1)
  })

  it('random超过FORM_CHANCE不spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.0014
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cirques).toHaveLength(0)
  })

  it('spawn冰斗的tick等于当前tick', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    if ((sys as any).cirques.length > 0) {
      expect((sys as any).cirques[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('达到MAX_CIRQUES(15)后不再spawn', () => {
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    for (let i = 0; i < 15; i++) {
      ;(sys as any).cirques.push(makeCirque())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).cirques).toHaveLength(15)
  })

  // === 字段更新逻辑测试 ===
  it('diameter随erosionRate增长且不超过50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ diameter: 49.999, erosionRate: 6 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].diameter).toBeLessThanOrEqual(50)
  })

  it('diameter已达50时不再增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ diameter: 50, erosionRate: 6 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].diameter).toBe(50)
  })

  it('wallHeight不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    // random=0, (0-0.49)*0.15=-0.0735
    ;(sys as any).cirques.push(makeCirque({ wallHeight: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].wallHeight).toBeGreaterThanOrEqual(10)
  })

  it('wallHeight不超过100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).cirques.push(makeCirque({ wallHeight: 100 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].wallHeight).toBeLessThanOrEqual(100)
  })

  it('glacialDepth不低于2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).cirques.push(makeCirque({ glacialDepth: 2 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].glacialDepth).toBeGreaterThanOrEqual(2)
  })

  it('glacialDepth不超过40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).cirques.push(makeCirque({ glacialDepth: 40 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].glacialDepth).toBeLessThanOrEqual(40)
  })

  it('spectacle不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).cirques.push(makeCirque({ spectacle: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].spectacle).toBeGreaterThanOrEqual(10)
  })

  it('spectacle不超过75', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).cirques.push(makeCirque({ spectacle: 75 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].spectacle).toBeLessThanOrEqual(75)
  })

  // === cleanup 测试 ===
  it('过期冰斗被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ tick: 0 }))
    // tick=100000 → cutoff=10000, cirque.tick=0 < 10000 → 被删除
    sys.update(1, world, em, 100000)
    expect((sys as any).cirques).toHaveLength(0)
  })

  it('未过期冰斗不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ tick: CHECK_INTERVAL }))
    // tick=CHECK_INTERVAL → cutoff=CHECK_INTERVAL-90000<0, cirque.tick > cutoff
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques).toHaveLength(1)
  })

  it('cleanup只删除过期的，保留未过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ tick: 0 }))       // 过期: cutoff=10000, 0<10000
    ;(sys as any).cirques.push(makeCirque({ tick: 99000 }))   // 未过期: 99000>10000
    sys.update(1, world, em, 100000)
    expect((sys as any).cirques).toHaveLength(1)
    expect((sys as any).cirques[0].tick).toBe(99000)
  })

  it('冰斗erosionRate字段保持不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).cirques.push(makeCirque({ erosionRate: 3 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).cirques[0].erosionRate).toBe(3)
  })
})
