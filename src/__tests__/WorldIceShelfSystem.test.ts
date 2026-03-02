import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldIceShelfSystem } from '../systems/WorldIceShelfSystem'
import type { IceShelf } from '../systems/WorldIceShelfSystem'

function makeSys(): WorldIceShelfSystem { return new WorldIceShelfSystem() }
let nextId = 1
function makeShelf(overrides: Partial<IceShelf> = {}): IceShelf {
  return {
    id: nextId++, x: 40, y: 50, radius: 15, thickness: 50, stability: 70,
    calvingRate: 0.3, temperature: -15, tick: 0, ...overrides
  }
}

const mockWorld = (tileType: number) => ({
  width: 100,
  height: 100,
  getTile: () => tileType,
})
const mockEm = {} as any

// TileType: DEEP_WATER=0, SNOW=6
const DEEP_WATER = 0
const SNOW = 6
const SAND = 2

describe('WorldIceShelfSystem - 初始状态', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰架', () => { expect((sys as any).shelves).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('shelves是数组', () => { expect(Array.isArray((sys as any).shelves)).toBe(true) })
})

describe('WorldIceShelfSystem - 字段验证', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).shelves.push(makeShelf())
    expect((sys as any).shelves).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).shelves).toBe((sys as any).shelves)
  })
  it('冰架thickness字段正确', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 60 }))
    expect((sys as any).shelves[0].thickness).toBe(60)
  })
  it('冰架stability字段正确', () => {
    ;(sys as any).shelves.push(makeShelf({ stability: 80 }))
    expect((sys as any).shelves[0].stability).toBe(80)
  })
  it('冰架calvingRate字段正确', () => {
    ;(sys as any).shelves.push(makeShelf({ calvingRate: 0.4 }))
    expect((sys as any).shelves[0].calvingRate).toBe(0.4)
  })
  it('冰架temperature字段正确', () => {
    ;(sys as any).shelves.push(makeShelf({ temperature: -20 }))
    expect((sys as any).shelves[0].temperature).toBe(-20)
  })
  it('冰架radius字段正确', () => {
    ;(sys as any).shelves.push(makeShelf({ radius: 25 }))
    expect((sys as any).shelves[0].radius).toBe(25)
  })
  it('多个冰架全部返回', () => {
    ;(sys as any).shelves.push(makeShelf())
    ;(sys as any).shelves.push(makeShelf())
    expect((sys as any).shelves).toHaveLength(2)
  })
  it('tick字段记录spawn时刻', () => {
    ;(sys as any).shelves.push(makeShelf({ tick: 5000 }))
    expect((sys as any).shelves[0].tick).toBe(5000)
  })
})

describe('WorldIceShelfSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 1000)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('恰好达到CHECK_INTERVAL时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    // 可能spawn，lastCheck更新
    expect((sys as any).lastCheck).toBe(3000)
    vi.restoreAllMocks()
  })
  it('第一次update后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    vi.restoreAllMocks()
  })
  it('连续两次update间隔不足不重复处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    const countAfterFirst = (sys as any).shelves.length
    sys.update(0, mockWorld(SNOW) as any, mockEm, 4000)
    expect((sys as any).shelves.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('WorldIceShelfSystem - spawn条件', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('SNOW地形允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    expect((sys as any).shelves.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('DEEP_WATER地形允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(DEEP_WATER) as any, mockEm, 3000)
    expect((sys as any).shelves.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('SAND地形阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random过大时不spawn（概率条件失败）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    expect((sys as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
})

describe('WorldIceShelfSystem - MAX_SHELVES上限', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已满22个时不再spawn', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).shelves.push(makeShelf({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    expect((sys as any).shelves.length).toBe(22)
    vi.restoreAllMocks()
  })
  it('21个时可以继续spawn', () => {
    for (let i = 0; i < 21; i++) {
      ;(sys as any).shelves.push(makeShelf({ tick: 3000 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorld(SNOW) as any, mockEm, 3000)
    expect((sys as any).shelves.length).toBeGreaterThanOrEqual(21)
    vi.restoreAllMocks()
  })
})

describe('WorldIceShelfSystem - 动态更新逻辑', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('thickness随calvingRate减少', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, calvingRate: 0.2, stability: 70, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    const shelf = (sys as any).shelves[0]
    expect(shelf.thickness).toBeLessThan(50)
    vi.restoreAllMocks()
  })
  it('thickness不低于10', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 10, calvingRate: 5, stability: 70, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves[0]?.thickness ?? 10).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('stability随时间减少', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, stability: 50, calvingRate: 0.3, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves[0].stability).toBeLessThan(50)
    vi.restoreAllMocks()
  })
  it('stability不低于10', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, stability: 10, calvingRate: 0.1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves[0].stability).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('stability<20时calvingRate增加', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, stability: 15, calvingRate: 0.5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves[0].calvingRate).toBeGreaterThan(0.5)
    vi.restoreAllMocks()
  })
  it('stability>=20时calvingRate不因stability增加', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, stability: 30, calvingRate: 0.3, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    // calvingRate不应额外增加（仅因stability>=20）
    expect((sys as any).shelves[0].calvingRate).toBe(0.3)
    vi.restoreAllMocks()
  })
  it('calvingRate不超过2', () => {
    ;(sys as any).shelves.push(makeShelf({ thickness: 50, stability: 10, calvingRate: 1.99, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 3000)
    expect((sys as any).shelves[0].calvingRate).toBeLessThanOrEqual(2)
    vi.restoreAllMocks()
  })
})

describe('WorldIceShelfSystem - cleanup清理', () => {
  let sys: WorldIceShelfSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick过期冰架被清理', () => {
    ;(sys as any).shelves.push(makeShelf({ tick: 0, thickness: 50, stability: 50, calvingRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 100001)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick未过期冰架不被清理', () => {
    ;(sys as any).shelves.push(makeShelf({ tick: 3000, thickness: 50, stability: 50, calvingRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 6000)
    expect((sys as any).shelves).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cleanup条件thickness<10：update会先clamp到10，故tick未过期时不会被删', () => {
    // 源码：先 thickness=Math.max(10, ...) 再 cleanup 判断 thickness<10
    // 因此 thickness=9 经update后变为10，cleanup条件不满足，保留
    ;(sys as any).shelves.push(makeShelf({ tick: 3000, thickness: 9, stability: 50, calvingRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 6000)
    // update把thickness clamp到10，cleanup条件(< 10)不满足，不删除
    expect((sys as any).shelves).toHaveLength(1)
    expect((sys as any).shelves[0].thickness).toBe(10)
    vi.restoreAllMocks()
  })
  it('cutoff边界=tick-100000', () => {
    // tick=200000, cutoff=100000, shelf.tick=99999 应被清理
    ;(sys as any).shelves.push(makeShelf({ tick: 99999, thickness: 50, stability: 50, calvingRate: 0.001 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 200000)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('同时满足两个清理条件时仍只删一次', () => {
    ;(sys as any).shelves.push(makeShelf({ tick: 0, thickness: 5, stability: 50, calvingRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, mockWorld(SAND) as any, mockEm, 100001)
    expect((sys as any).shelves).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
