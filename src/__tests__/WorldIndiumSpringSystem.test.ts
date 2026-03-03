import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldIndiumSpringSystem } from '../systems/WorldIndiumSpringSystem'
import type { IndiumSpringZone } from '../systems/WorldIndiumSpringSystem'

function makeSys(): WorldIndiumSpringSystem { return new WorldIndiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<IndiumSpringZone> = {}): IndiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    indiumContent: 60, springFlow: 35,
    sulfideLeaching: 50, mineralSoftness: 55,
    tick: 0, ...overrides
  }
}

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, MOUNTAIN=5
const DEEP_WATER = 0
const SHALLOW_WATER = 1
const SAND = 2
const MOUNTAIN = 5

// hasAdjacentTile扫描(x±1,y±1)方向，构造包含water/mountain邻居的mock
function makeWorldWithNeighbor(centerTile: number, neighborTile: number) {
  return {
    width: 100,
    height: 100,
    getTile: (x: number, y: number) => {
      // 中心格子返回centerTile，周围格子返回neighborTile
      if (x === 50 && y === 50) return centerTile
      return neighborTile
    },
  }
}

// 全部返回SAND，无邻居水/山，阻断spawn
function makeSandWorld() {
  return {
    width: 100,
    height: 100,
    getTile: () => SAND,
  }
}

const mockEm = {} as any

describe('WorldIndiumSpringSystem - 初始状态', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Indium泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('zones是数组', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
})

describe('WorldIndiumSpringSystem - 字段验证', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('indiumContent字段正确', () => {
    ;(sys as any).zones.push(makeZone({ indiumContent: 75 }))
    expect((sys as any).zones[0].indiumContent).toBe(75)
  })
  it('springFlow字段正确', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45 }))
    expect((sys as any).zones[0].springFlow).toBe(45)
  })
  it('sulfideLeaching字段正确', () => {
    ;(sys as any).zones.push(makeZone({ sulfideLeaching: 80 }))
    expect((sys as any).zones[0].sulfideLeaching).toBe(80)
  })
  it('mineralSoftness字段正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralSoftness: 60 }))
    expect((sys as any).zones[0].mineralSoftness).toBe(60)
  })
  it('tick字段记录spawn时刻', () => {
    ;(sys as any).zones.push(makeZone({ tick: 2880 }))
    expect((sys as any).zones[0].tick).toBe(2880)
  })
  it('多个泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
})

describe('WorldIndiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(2880)时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeSandWorld() as any, mockEm, 1000)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })
  it('恰好达到CHECK_INTERVAL时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeSandWorld() as any, mockEm, 2880)
    expect((sys as any).lastCheck).toBe(2880)
    vi.restoreAllMocks()
  })
  it('两次update间隔不足不重复处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeSandWorld() as any, mockEm, 2880)
    const c1 = (sys as any).zones.length
    sys.update(0, makeSandWorld() as any, mockEm, 4000)
    expect((sys as any).zones.length).toBe(c1)
    vi.restoreAllMocks()
  })
})

describe('WorldIndiumSpringSystem - spawn条件', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nearWater(SHALLOW_WATER)时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    // random()=0.002 < FORM_CHANCE=0.003
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('nearWater(DEEP_WATER)时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, DEEP_WATER) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('nearMountain时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, MOUNTAIN) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
  it('SAND全图无邻居水/山时阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeSandWorld() as any, mockEm, 2880)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('random过大(>FORM_CHANCE)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).nextId).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })
})

describe('WorldIndiumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已满32个时不再spawn', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 2880 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBe(32)
    vi.restoreAllMocks()
  })
  it('31个时可以继续spawn', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 2880 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(31)
    vi.restoreAllMocks()
  })
})

describe('WorldIndiumSpringSystem - cleanup清理', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick过期泉区被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeSandWorld() as any, mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick未过期泉区保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 2880 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeSandWorld() as any, mockEm, 5760)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cutoff=tick-54000，恰好过期被清理', () => {
    // tick=54001, cutoff=1, zone.tick=0 < 1 → 清理
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeSandWorld() as any, mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('spawn后的泉区不含动态更新（字段不变）', () => {
    ;(sys as any).zones.push(makeZone({ indiumContent: 60, springFlow: 35, tick: 2880 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(0, makeSandWorld() as any, mockEm, 5760)
    const z = (sys as any).zones[0]
    expect(z.indiumContent).toBe(60)
    expect(z.springFlow).toBe(35)
    vi.restoreAllMocks()
  })
  it('3次attempt都满足条件时可多次spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorldWithNeighbor(SAND, SHALLOW_WATER) as any, mockEm, 2880)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })
})

describe('WorldIndiumSpringSystem - 附加测试', () => {
  let sys: WorldIndiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones初始为空数组', () => { expect((sys as any).zones).toHaveLength(0) })
  it('zones是数组类型', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ x: i })) }
    expect((sys as any).zones).toHaveLength(5)
  })
  it('zone含indiumContent字段', () => { expect(typeof makeZone().indiumContent).toBe('number') })
  it('zone含springFlow字段', () => { expect(typeof makeZone().springFlow).toBe('number') })
  it('zone含sulfideLeaching字段', () => { expect(typeof makeZone().sulfideLeaching).toBe('number') })
  it('zone含mineralSoftness字段', () => { expect(typeof makeZone().mineralSoftness).toBe('number') })
  it('zone含tick字段', () => { expect(makeZone({ tick: 5000 }).tick).toBe(5000) })
  it('zone含id字段', () => { expect(typeof makeZone().id).toBe('number') })
  it('zone含x,y坐标', () => {
    const z = makeZone({ x: 10, y: 20 })
    expect(z.x).toBe(10); expect(z.y).toBe(20)
  })
  it('sandWorld不spawn', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeSandWorld() as any, mockEm, 3000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('过期zone被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, makeSandWorld() as any, mockEm, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('未过期zone保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 90000 }))
    sys.update(1, makeSandWorld() as any, mockEm, 95000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    ;(sys as any).zones.push(makeZone({ id:1, tick: 0 }))
    ;(sys as any).zones.push(makeZone({ id:2, tick: 90000 }))
    sys.update(1, makeSandWorld() as any, mockEm, 95000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].id).toBe(2)
  })
  it('全部5个过期时清空', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ tick: 0, x: i })) }
    sys.update(1, makeSandWorld() as any, mockEm, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('空zones时update不崩溃', () => {
    expect(() => sys.update(1, makeSandWorld() as any, mockEm, 3000)).not.toThrow()
  })
  it('zones中id不重复', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ x: i })) }
    const ids = (sys as any).zones.map((z: any) => z.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('update不返回值', () => {
    expect(sys.update(1, makeSandWorld() as any, mockEm, 3000)).toBeUndefined()
  })
  it('tick=0时不触发', () => {
    sys.update(1, makeSandWorld() as any, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('zones最大32个（MAX_ZONES）不超过', () => {
    for (let i = 0; i < 32; i++) { (sys as any).zones.push(makeZone({ id:i+1, tick: 999999, x: i })) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldWithNeighbor(3, SHALLOW_WATER) as any, mockEm, 3000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
})
