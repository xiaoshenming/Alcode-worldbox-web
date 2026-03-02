import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldInlierSystem } from '../systems/WorldInlierSystem'
import type { Inlier } from '../systems/WorldInlierSystem'

function makeSys(): WorldInlierSystem { return new WorldInlierSystem() }
let nextId = 1
function makeInlier(overrides: Partial<Inlier> = {}): Inlier {
  return {
    id: nextId++, x: 20, y: 30,
    area: 30, rockAge: 500, surroundingAge: 100,
    exposureDepth: 10, geologicalValue: 40, spectacle: 20,
    tick: 0, ...overrides
  }
}

// TileType: MOUNTAIN=5, GRASS=3, SAND=2
const MOUNTAIN = 5
const GRASS = 3
const SAND = 2

function makeWorld(tileType: number) {
  return {
    width: 100,
    height: 100,
    getTile: () => tileType,
  }
}
const mockEm = {} as any

describe('WorldInlierSystem - 初始状态', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无内露岩', () => { expect((sys as any).inliers).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('inliers是数组', () => { expect(Array.isArray((sys as any).inliers)).toBe(true) })
})

describe('WorldInlierSystem - 字段验证', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).inliers.push(makeInlier())
    expect((sys as any).inliers).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).inliers).toBe((sys as any).inliers)
  })
  it('area字段���确', () => {
    ;(sys as any).inliers.push(makeInlier({ area: 40 }))
    expect((sys as any).inliers[0].area).toBe(40)
  })
  it('rockAge字段正确', () => {
    ;(sys as any).inliers.push(makeInlier({ rockAge: 800 }))
    expect((sys as any).inliers[0].rockAge).toBe(800)
  })
  it('surroundingAge字段正确', () => {
    ;(sys as any).inliers.push(makeInlier({ surroundingAge: 120 }))
    expect((sys as any).inliers[0].surroundingAge).toBe(120)
  })
  it('exposureDepth字段正确', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 15 }))
    expect((sys as any).inliers[0].exposureDepth).toBe(15)
  })
  it('geologicalValue字段正确', () => {
    ;(sys as any).inliers.push(makeInlier({ geologicalValue: 55 }))
    expect((sys as any).inliers[0].geologicalValue).toBe(55)
  })
  it('spectacle字段正确', () => {
    ;(sys as any).inliers.push(makeInlier({ spectacle: 25 }))
    expect((sys as any).inliers[0].spectacle).toBe(25)
  })
  it('tick字段记录spawn时刻', () => {
    ;(sys as any).inliers.push(makeInlier({ tick: 2590 }))
    expect((sys as any).inliers[0].tick).toBe(2590)
  })
  it('多个内露岩全部返回', () => {
    ;(sys as any).inliers.push(makeInlier())
    ;(sys as any).inliers.push(makeInlier())
    expect((sys as any).inliers).toHaveLength(2)
  })
})

describe('WorldInlierSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(2590)时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 1000)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })
  it('恰好达到CHECK_INTERVAL时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).lastCheck).toBe(2590)
    vi.restoreAllMocks()
  })
  it('两次update间隔不足不重复处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    const c1 = (sys as any).inliers.length
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 4000)
    expect((sys as any).inliers.length).toBe(c1)
    vi.restoreAllMocks()
  })
})

describe('WorldInlierSystem - spawn条件', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MOUNTAIN地形允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 2590)
    expect((sys as any).inliers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('GRASS地形允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(GRASS) as any, mockEm, 2590)
    expect((sys as any).inliers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('SAND地形阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).inliers).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random过大(>FORM_CHANCE=0.0013)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 2590)
    expect((sys as any).inliers).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 2590)
    expect((sys as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
})

describe('WorldInlierSystem - MAX_INLIERS上限', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已满14个时不再spawn', () => {
    for (let i = 0; i < 14; i++) {
      ;(sys as any).inliers.push(makeInlier({ tick: 2590 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 2590)
    expect((sys as any).inliers.length).toBe(14)
    vi.restoreAllMocks()
  })
  it('13个时可以继续spawn', () => {
    for (let i = 0; i < 13; i++) {
      ;(sys as any).inliers.push(makeInlier({ tick: 2590 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(MOUNTAIN) as any, mockEm, 2590)
    expect((sys as any).inliers.length).toBeGreaterThanOrEqual(13)
    vi.restoreAllMocks()
  })
})

describe('WorldInlierSystem - 动态更新逻辑', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('exposureDepth随时间缓慢增加', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 10, geologicalValue: 40, spectacle: 20, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).inliers[0].exposureDepth).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('exposureDepth不超过50', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 50, geologicalValue: 40, spectacle: 20, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).inliers[0].exposureDepth).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })
  it('geologicalValue随时间缓慢增加', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 10, geologicalValue: 40, spectacle: 20, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).inliers[0].geologicalValue).toBeGreaterThanOrEqual(40)
    vi.restoreAllMocks()
  })
  it('geologicalValue不超过80', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 10, geologicalValue: 80, spectacle: 20, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    expect((sys as any).inliers[0].geologicalValue).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })
  it('spectacle在5~50之间', () => {
    ;(sys as any).inliers.push(makeInlier({ exposureDepth: 10, geologicalValue: 40, spectacle: 20, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeWorld(SAND) as any, mockEm, 2590)
    const sp = (sys as any).inliers[0].spectacle
    expect(sp).toBeGreaterThanOrEqual(5)
    expect(sp).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })
})

describe('WorldInlierSystem - cleanup清理', () => {
  let sys: WorldInlierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick过期内露岩被清理', () => {
    ;(sys as any).inliers.push(makeInlier({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 93001)
    expect((sys as any).inliers).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick未过期内露岩保留', () => {
    ;(sys as any).inliers.push(makeInlier({ tick: 2590 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 5180)
    expect((sys as any).inliers).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cutoff=tick-93000，恰好过期被清理', () => {
    // tick=93001, cutoff=1, inlier.tick=0 < 1 → 清理
    ;(sys as any).inliers.push(makeInlier({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 93001)
    expect((sys as any).inliers).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('多个内露岩各自独立清理', () => {
    ;(sys as any).inliers.push(makeInlier({ tick: 0 }))
    ;(sys as any).inliers.push(makeInlier({ tick: 50000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorld(SAND) as any, mockEm, 93001)
    // tick=0的被清理, tick=50000的(cutoff=1)未过期保留
    expect((sys as any).inliers).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
