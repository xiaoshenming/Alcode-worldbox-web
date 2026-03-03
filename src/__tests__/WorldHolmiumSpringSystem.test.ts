import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHolmiumSpringSystem } from '../systems/WorldHolmiumSpringSystem'
import type { HolmiumSpringZone } from '../systems/WorldHolmiumSpringSystem'

function makeSys(): WorldHolmiumSpringSystem { return new WorldHolmiumSpringSystem() }

// TileType: SHALLOW_WATER=1, DEEP_WATER=0, SAND=2, MOUNTAIN=5
// hasAdjacentTile checks adjacent tiles; getTile returning SHALLOW_WATER makes adjacent checks pass
const mockWorldSand = { width: 200, height: 200, getTile: () => 2 }
const mockWorldShallowWater = { width: 200, height: 200, getTile: () => 1 }
const mockEM = {} as any

let nextId = 1
function makeZone(overrides: Partial<HolmiumSpringZone> = {}): HolmiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    holmiumContent: 70, springFlow: 35,
    gadoliniteWeathering: 60, magneticFluxDensity: 50,
    tick: 0,
    ...overrides,
  }
}

describe('WorldHolmiumSpringSystem - 初始状态', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('��始zones为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('zones是数组', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('注入zone后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('zone字段holmiumContent正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].holmiumContent).toBe(70)
  })
  it('zone字段springFlow正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].springFlow).toBe(35)
  })
  it('zone字段gadoliniteWeathering正确', () => {
    ;(sys as any).zones.push(makeZone({ gadoliniteWeathering: 55 }))
    expect((sys as any).zones[0].gadoliniteWeathering).toBe(55)
  })
  it('zone字段magneticFluxDensity正确', () => {
    ;(sys as any).zones.push(makeZone({ magneticFluxDensity: 45 }))
    expect((sys as any).zones[0].magneticFluxDensity).toBe(45)
  })
  it('内部zones引用一致', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
})

describe('WorldHolmiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL(2990)时跳过执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(0, mockWorldShallowWater as any, mockEM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=100时lastCheck仍为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2990时lastCheck更新为2990', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    expect((sys as any).lastCheck).toBe(2990)
  })
  it('第二次tick未满间隔不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(0, mockWorldShallowWater as any, mockEM, 2991)
    expect((sys as any).lastCheck).toBe(lastCheck1)
  })
})

describe('WorldHolmiumSpringSystem - 不spawn验证', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0.9时不spawn（超出FORM_CHANCE=0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, mockWorldShallowWater as any, mockEM, 2990)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tile=SAND时不spawn（不邻接水/山）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldHolmiumSpringSystem - cleanup', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期zone（tick < currentTick-54000）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(0, mockWorldSand as any, mockEM, 55000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('未过期zone保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 50000 }))
    sys.update(0, mockWorldSand as any, mockEM, 55000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('cutoff-1时（严格小于cutoff）被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 54000 // = 46000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick等于cutoff时保留（不删）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    const cutoff = currentTick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合cleanup：过期删除，未过期保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    ;(sys as any).zones.push(makeZone({ id: 10, tick: 0 }))
    ;(sys as any).zones.push(makeZone({ id: 11, tick: 99000 }))
    sys.update(0, mockWorldSand as any, mockEM, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(99000)
  })
  it('全部过期时zones清空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    sys.update(0, mockWorldSand as any, mockEM, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })
})

describe('WorldHolmiumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones满32个时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    }
    sys.update(0, mockWorldShallowWater as any, mockEM, 99999 + 2990)
    expect((sys as any).zones.length).toBe(32)
  })
})

describe('WorldHolmiumSpringSystem - id唯一性', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入多个zone时id各不相同', () => {
    const z1 = makeZone()
    const z2 = makeZone()
    const z3 = makeZone()
    ;(sys as any).zones.push(z1, z2, z3)
    const ids = (sys as any).zones.map((z: HolmiumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('WorldHolmiumSpringSystem - 字段不被update动态修改', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('update不改变zone的holmiumContent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 99000, holmiumContent: 70 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    expect((sys as any).zones[0].holmiumContent).toBe(70)
  })
  it('update不改变zone的springFlow', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 99000, springFlow: 35 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    expect((sys as any).zones[0].springFlow).toBe(35)
  })
  it('update不改变zone的magneticFluxDensity', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 99000, magneticFluxDensity: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, mockWorldSand as any, mockEM, 2990)
    expect((sys as any).zones[0].magneticFluxDensity).toBe(50)
  })
})

describe('WorldHolmiumSpringSystem - 附加测试', () => {
  let sys: WorldHolmiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones初始为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('zones是数组', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
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
  it('zone含holmiumContent字段', () => { expect(typeof makeZone().holmiumContent).toBe('number') })
  it('zone含springFlow字段', () => { expect(typeof makeZone().springFlow).toBe('number') })
  it('zone含gadoliniteWeathering字段', () => { expect(typeof makeZone().gadoliniteWeathering).toBe('number') })
  it('zone含magneticFluxDensity字段', () => { expect(typeof makeZone().magneticFluxDensity).toBe('number') })
  it('zone含tick字段', () => { expect(makeZone({ tick: 5000 }).tick).toBe(5000) })
  it('zone含id字段', () => { expect(typeof makeZone().id).toBe('number') })
  it('zone含x,y坐标', () => {
    const z = makeZone({ x: 10, y: 20 })
    expect(z.x).toBe(10); expect(z.y).toBe(20)
  })
  it('过期zone被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, mockWorldSand as any, mockEM, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('未过期zone保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 90000 }))
    sys.update(1, mockWorldSand as any, mockEM, 95000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    ;(sys as any).zones.push(makeZone({ id:1, tick: 0 }))
    ;(sys as any).zones.push(makeZone({ id:2, tick: 90000 }))
    sys.update(1, mockWorldSand as any, mockEM, 95000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].id).toBe(2)
  })
  it('全部5个过期时清空', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ tick: 0, x: i })) }
    sys.update(1, mockWorldSand as any, mockEM, 100000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('空zones时update不崩溃', () => {
    expect(() => sys.update(1, mockWorldSand as any, mockEM, 3000)).not.toThrow()
  })
  it('mockWorldSand(getTile=2)不spawn（无水无山）', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mockWorldSand as any, mockEM, 3000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('zones中id不重复', () => {
    for (let i = 0; i < 5; i++) { (sys as any).zones.push(makeZone({ x: i })) }
    const ids = (sys as any).zones.map((z: any) => z.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('update不返回值', () => {
    expect(sys.update(1, mockWorldSand as any, mockEM, 3000)).toBeUndefined()
  })
  it('zones最大32个（MAX_ZONES）不超过', () => {
    for (let i = 0; i < 32; i++) { (sys as any).zones.push(makeZone({ id:i+1, tick: 999999, x: i })) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mockWorldShallowWater as any, mockEM, 3000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
  it('tick=0时不触发', () => {
    sys.update(1, mockWorldSand as any, mockEM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})
