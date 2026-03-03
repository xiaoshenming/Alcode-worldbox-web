import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDreikanterSystem } from '../systems/WorldDreikanterSystem'
import type { Dreikanter } from '../systems/WorldDreikanterSystem'

const CHECK_INTERVAL = 2550
const MAX_DREIKANTERS = 16

function makeSys(): WorldDreikanterSystem { return new WorldDreikanterSystem() }

let _nextId = 1
function makeDreikanter(overrides: Partial<Dreikanter> = {}): Dreikanter {
  return {
    id: _nextId++,
    x: 50, y: 60,
    faces: 3,
    polish: 20,
    windIntensity: 40,
    stoneSize: 15,
    desertAge: 300,
    spectacle: 18,
    tick: 0,
    ...overrides,
  }
}

const worldSand     = { width: 200, height: 200, getTile: () => 2 } as any
const worldMountain = { width: 200, height: 200, getTile: () => 5 } as any
const worldGrass    = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

describe('WorldDreikanterSystem', () => {
  let sys: WorldDreikanterSystem

  beforeEach(() => {
    sys = makeSys()
    _nextId = 1
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- 1. 基础数据结构 ---
  it('dreikanters[] 初始为空', () => {
    expect((sys as any).dreikanters).toHaveLength(0)
  })

  it('dreikanters 是数组', () => {
    expect(Array.isArray((sys as any).dreikanters)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后长度正确', () => {
    ;(sys as any).dreikanters.push(makeDreikanter())
    ;(sys as any).dreikanters.push(makeDreikanter())
    ;(sys as any).dreikanters.push(makeDreikanter())
    expect((sys as any).dreikanters).toHaveLength(3)
  })

  // --- 2. CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL 时 lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次不满足间隔时 lastCheck 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    sys.update(0, worldSand, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('满足间隔后 lastCheck 再次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    sys.update(0, worldSand, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- 3. spawn 逻辑 ---
  it('SAND tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters).toHaveLength(1)
  })

  it('MOUNTAIN tile 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldMountain, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters).toHaveLength(1)
  })

  it('GRASS tile（不符合条件）时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldGrass, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters).toHaveLength(0)
  })

  it('达到 MAX_DREIKANTERS 时不再 spawn', () => {
    for (let i = 0; i < MAX_DREIKANTERS; i++) {
      ;(sys as any).dreikanters.push(makeDreikanter())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters).toHaveLength(MAX_DREIKANTERS)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 的记录 tick 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn 的记录 faces 始终为 3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].faces).toBe(3)
  })

  // --- 4. 字段动态更新 ---
  it('update 后 polish 不超过上限 75', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ polish: 74.9999 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].polish).toBeLessThanOrEqual(75)
  })

  it('update 后 windIntensity 在 [10, 80] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ windIntensity: 40 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const v = (sys as any).dreikanters[0].windIntensity
    expect(v).toBeGreaterThanOrEqual(10)
    expect(v).toBeLessThanOrEqual(80)
  })

  it('update 后 desertAge 不超过上限 1000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ desertAge: 999.999 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].desertAge).toBeLessThanOrEqual(1000)
  })

  it('update 后 spectacle 在 [5, 45] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ spectacle: 25 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    const s = (sys as any).dreikanters[0].spectacle
    expect(s).toBeGreaterThanOrEqual(5)
    expect(s).toBeLessThanOrEqual(45)
  })

  it('polish 每次 update 增加 0.00003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ polish: 20 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].polish).toBeCloseTo(20 + 0.00003, 8)
  })

  it('desertAge 每次 update 增加 0.001', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).dreikanters.push(makeDreikanter({ desertAge: 300 }))
    sys.update(0, worldSand, em, CHECK_INTERVAL)
    expect((sys as any).dreikanters[0].desertAge).toBeCloseTo(300 + 0.001, 6)
  })

  // --- 5. cleanup ---
  it('老记录（tick < cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: 0 }))
    const tick = 91001 + CHECK_INTERVAL
    sys.update(0, worldSand, em, tick)
    expect((sys as any).dreikanters).toHaveLength(0)
  })

  it('新记录（tick >= cutoff）不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL * 2
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: tick - 1000 }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).dreikanters).toHaveLength(1)
  })

  it('混合新旧只删旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = 91001 + CHECK_INTERVAL
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: 0 }))
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: tick - 1000 }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).dreikanters).toHaveLength(1)
  })

  it('刚好等于 cutoff 边界不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = CHECK_INTERVAL
    const cutoff = tick - 91000
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: cutoff }))
    sys.update(0, worldSand, em, tick)
    expect((sys as any).dreikanters).toHaveLength(1)
  })
})

describe('WorldDreikanterSystem - 附加测试', () => {
  let sys: WorldDreikanterSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('dreikanters初始为空数组', () => { expect((sys as any).dreikanters).toHaveLength(0) })
  it('dreikanters是数组类型', () => { expect(Array.isArray((sys as any).dreikanters)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('tick不足CHECK_INTERVAL=2550时不更新lastCheck', () => {
    sys.update(1, worldSand, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2550时更新lastCheck', () => {
    sys.update(1, worldSand, em, 2550)
    expect((sys as any).lastCheck).toBe(2550)
  })
  it('tick=2549时不触发', () => {
    sys.update(1, worldSand, em, 2549)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=5100时再次触发', () => {
    sys.update(1, worldSand, em, 2550)
    sys.update(1, worldSand, em, 5100)
    expect((sys as any).lastCheck).toBe(5100)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, worldSand, em, 7650)
    expect((sys as any).lastCheck).toBe(7650)
  })
  it('注入dreikanter后长度为1', () => {
    ;(sys as any).dreikanters.push(makeDreikanter())
    expect((sys as any).dreikanters).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { (sys as any).dreikanters.push(makeDreikanter()) }
    expect((sys as any).dreikanters).toHaveLength(5)
  })
  it('dreikanter含faces字段', () => { expect(makeDreikanter({ faces: 4 }).faces).toBe(4) })
  it('dreikanter含polish字段', () => { expect(makeDreikanter({ polish: 30 }).polish).toBe(30) })
  it('dreikanter含windIntensity字段', () => { expect(makeDreikanter({ windIntensity: 60 }).windIntensity).toBe(60) })
  it('dreikanter含stoneSize字段', () => { expect(makeDreikanter({ stoneSize: 20 }).stoneSize).toBe(20) })
  it('dreikanter含desertAge字段', () => { expect(makeDreikanter({ desertAge: 500 }).desertAge).toBe(500) })
  it('dreikanter含spectacle字段', () => { expect(makeDreikanter({ spectacle: 25 }).spectacle).toBe(25) })
  it('dreikanter含tick字段', () => { expect(makeDreikanter({ tick: 5000 }).tick).toBe(5000) })
  it('dreikanter含x,y坐标', () => {
    const d = makeDreikanter({ x: 10, y: 20 })
    expect(d.x).toBe(10); expect(d.y).toBe(20)
  })
  it('过期dreikanter被清除', () => {
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: 0 }))
    sys.update(1, worldSand, em, 100000)
    expect((sys as any).dreikanters).toHaveLength(0)
  })
  it('未过期dreikanter保留', () => {
    ;(sys as any).dreikanters.push(makeDreikanter({ tick: 90000 }))
    sys.update(1, worldSand, em, 95000)
    expect((sys as any).dreikanters).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    ;(sys as any).dreikanters.push(makeDreikanter({ id:1, tick: 0 }))
    ;(sys as any).dreikanters.push(makeDreikanter({ id:2, tick: 90000 }))
    sys.update(1, worldSand, em, 95000)
    expect((sys as any).dreikanters).toHaveLength(1)
    expect((sys as any).dreikanters[0].id).toBe(2)
  })
  it('MAX_DREIKANTERS=16硬上限不超过', () => {
    for (let i = 0; i < 16; i++) { (sys as any).dreikanters.push(makeDreikanter({ id:i+1, tick: 999999 })) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSand, em, 2550)
    expect((sys as any).dreikanters.length).toBeLessThanOrEqual(16)
  })
  it('dreikanters中id不重复', () => {
    for (let i = 0; i < 5; i++) { (sys as any).dreikanters.push(makeDreikanter()) }
    const ids = (sys as any).dreikanters.map((d: any) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('空dreikanters时update不崩溃', () => {
    expect(() => sys.update(1, worldSand, em, 2550)).not.toThrow()
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, worldSand, em, 2550)
    const lc1 = (sys as any).lastCheck
    sys.update(1, worldSand, em, 2550)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('update不返回值', () => {
    expect(sys.update(1, worldSand, em, 2550)).toBeUndefined()
  })
})
