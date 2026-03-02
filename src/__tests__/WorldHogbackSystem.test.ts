import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHogbackSystem } from '../systems/WorldHogbackSystem'
import type { Hogback } from '../systems/WorldHogbackSystem'

function makeSys(): WorldHogbackSystem { return new WorldHogbackSystem() }

// TileType: MOUNTAIN=5, FOREST=4, SAND=2
const mockWorldMountain = { width: 200, height: 200, getTile: () => 5 }
const mockWorldForest = { width: 200, height: 200, getTile: () => 4 }
const mockWorldSand = { width: 200, height: 200, getTile: () => 2 }
const mockEM = {} as any

let nextId = 1
function makeHogback(overrides: Partial<Hogback> = {}): Hogback {
  return {
    id: nextId++, x: 20, y: 30,
    length: 25, height: 50, dipAngle: 45,
    rockResistance: 80, erosionRate: 2, spectacle: 40, tick: 0,
    ...overrides,
  }
}

describe('WorldHogbackSystem - 初始状态', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始hogbacks为空', () => { expect((sys as any).hogbacks).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('hogbacks是数组', () => { expect(Array.isArray((sys as any).hogbacks)).toBe(true) })
  it('注入后可查询', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('猪背岭字段正确', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    const h = (sys as any).hogbacks[0]
    expect(h.dipAngle).toBe(45)
    expect(h.rockResistance).toBe(80)
    expect(h.spectacle).toBe(40)
  })
  it('多个猪背岭全部存储', () => {
    ;(sys as any).hogbacks.push(makeHogback())
    ;(sys as any).hogbacks.push(makeHogback())
    expect((sys as any).hogbacks).toHaveLength(2)
  })
  it('内部引用一致', () => {
    expect((sys as any).hogbacks).toBe((sys as any).hogbacks)
  })
})

describe('WorldHogbackSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL时跳过执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, mockWorldMountain as any, mockEM, 100)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('tick=0时跳过（0-0<2620）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, mockWorldMountain as any, mockEM, 0)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('tick=CHECK_INTERVAL时不跳过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    expect((sys as any).lastCheck).toBe(2620)
  })
  it('第二次tick未满间隔不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2620)
    const countAfterFirst = (sys as any).hogbacks.length
    sys.update(0, mockWorldMountain as any, mockEM, 2621)
    expect((sys as any).hogbacks).toHaveLength(countAfterFirst)
  })
})

describe('WorldHogbackSystem - spawn条件', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（超出FORM_CHANCE=0.0014）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('tile=SAND时不spawn（不满足MOUNTAIN/FOREST条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, mockWorldSand as any, mockEM, 2620)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('tile=MOUNTAIN且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('tile=FOREST且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldForest as any, mockEM, 2620)
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    expect((sys as any).nextId).toBe(2)
  })
})

describe('WorldHogbackSystem - 字段范围验证', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的hogback有id字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    const h = (sys as any).hogbacks[0]
    expect(h).toHaveProperty('id')
  })
  it('spawn的hogback有x/y坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    const h = (sys as any).hogbacks[0]
    expect(h.x).toBeGreaterThanOrEqual(10)
    expect(h.y).toBeGreaterThanOrEqual(10)
  })
  it('spawn的hogback有tick字段等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain as any, mockEM, 2620)
    const h = (sys as any).hogbacks[0]
    expect(h.tick).toBe(2620)
  })
  it('注入的hogback高度字段有效', () => {
    ;(sys as any).hogbacks.push(makeHogback({ height: 50 }))
    const h = (sys as any).hogbacks[0]
    expect(h.height).toBe(50)
  })
  it('注入的hogback erosionRate字段有效', () => {
    ;(sys as any).hogbacks.push(makeHogback({ erosionRate: 3 }))
    const h = (sys as any).hogbacks[0]
    expect(h.erosionRate).toBe(3)
  })
})

describe('WorldHogbackSystem - cleanup（tick-based）', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期hogback（tick < tick-91000）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).hogbacks.push(makeHogback({ tick: 0 }))
    sys.update(0, mockWorldSand as any, mockEM, 92000)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('未过期hogback保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).hogbacks.push(makeHogback({ tick: 50000 }))
    sys.update(0, mockWorldSand as any, mockEM, 92000)
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('cutoff边界（tick==cutoff+1）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 91000 // = 9000
    ;(sys as any).hogbacks.push(makeHogback({ tick: cutoff - 1 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).hogbacks).toHaveLength(0)
  })
  it('tick等于cutoff时保留（不严格小于cutoff）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 91000
    ;(sys as any).hogbacks.push(makeHogback({ tick: cutoff }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).hogbacks).toHaveLength(1)
  })
  it('混合cleanup：过期删除，未过期保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    ;(sys as any).hogbacks.push(makeHogback({ tick: 0 }))
    ;(sys as any).hogbacks.push(makeHogback({ tick: 99000 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).hogbacks).toHaveLength(1)
    expect((sys as any).hogbacks[0].tick).toBe(99000)
  })
})

describe('WorldHogbackSystem - MAX_HOGBACKS上限', () => {
  let sys: WorldHogbackSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('hogbacks满15个时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).hogbacks.push(makeHogback({ tick: 99999 }))
    }
    sys.update(0, mockWorldMountain as any, mockEM, 99999 + 2620)
    expect((sys as any).hogbacks.length).toBe(15)
  })
})
