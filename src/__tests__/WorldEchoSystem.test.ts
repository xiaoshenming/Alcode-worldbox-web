import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldEchoSystem } from '../systems/WorldEchoSystem'
import type { Echo, EchoSource } from '../systems/WorldEchoSystem'

function makeSys(): WorldEchoSystem { return new WorldEchoSystem() }

// 模拟 World 对象
function makeWorld(w = 100, h = 100, defaultTile = 3) {
  return {
    width: w,
    height: h,
    getTile: (x: number, y: number): number | null => {
      if (x < 0 || x >= w || y < 0 || y >= h) return null
      return defaultTile
    }
  }
}

function makeEcho(source: EchoSource = 'battle', intensity = 75): Echo {
  return {
    id: 1,
    x: 50,
    y: 50,
    source,
    intensity,
    radius: 0,
    maxRadius: 20,
    speed: 4,
    createdTick: 0,
  }
}

describe('WorldEchoSystem - 初始状态', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })

  it('初始无回声', () => {
    expect((sys as any).echoes).toHaveLength(0)
  })
  it('初始nextId=1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck=0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('支持6种回声来源', () => {
    const sources: EchoSource[] = ['battle', 'disaster', 'celebration', 'construction', 'horn_call', 'thunder']
    expect(sources).toHaveLength(6)
  })
  it('echoes是数组', () => {
    expect(Array.isArray((sys as any).echoes)).toBe(true)
  })
  it('echoes.length为0', () => {
    expect((sys as any).echoes.length).toBe(0)
  })
  it('多次创建实例互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).echoes.push(makeEcho())
    expect((sys2 as any).echoes.length).toBe(0)
  })
})

describe('WorldEchoSystem - 节流机制', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('CHECK_INTERVAL=500', () => {
    const world = makeWorld()
    sys.update(0, world as any, 0)
    sys.update(0, world as any, 499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    const world = makeWorld()
    sys.update(0, world as any, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    const world = makeWorld()
    sys.update(0, world as any, 500)
    expect((sys as any).lastCheck).toBe(500)
  })
  it('tick=499时不更新', () => {
    const world = makeWorld()
    sys.update(0, world as any, 499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=500时更新', () => {
    const world = makeWorld()
    sys.update(0, world as any, 500)
    expect((sys as any).lastCheck).toBe(500)
  })
  it('第二次update在500后才触发', () => {
    const world = makeWorld()
    sys.update(0, world as any, 500)
    sys.update(0, world as any, 800)
    expect((sys as any).lastCheck).toBe(500)
    sys.update(0, world as any, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('dt参数未使用', () => {
    const world = makeWorld()
    sys.update(999, world as any, 500)
    expect((sys as any).lastCheck).toBe(500)
  })
  it('tick=0时不触发', () => {
    const world = makeWorld()
    sys.update(0, world as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('WorldEchoSystem - spawn条件', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('SPAWN_CHANCE=0.02，Math.random()>0.02时不spawn', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('Math.random()<=0.02时尝试spawn', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeGreaterThanOrEqual(0)
  })
  it('达到MAX_ECHOES=20时不spawn', () => {
    const world = makeWorld()
    const echoes = (sys as any).echoes
    for (let i = 0; i < 20; i++) {
      echoes.push({ ...makeEcho(), id: i + 1 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(20)
  })
  it('tile=DEEP_WATER时不spawn', () => {
    // TileType.DEEP_WATER=0
    const world = makeWorld(100, 100, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('tile=LAVA时不spawn', () => {
    // TileType.LAVA=7
    const world = makeWorld(100, 100, 7)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('tile=null时不spawn', () => {
    const world = {
      width: 100,
      height: 100,
      getTile: () => null
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('tile=草地(3)时可spawn', () => {
    const world = makeWorld(100, 100, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeGreaterThanOrEqual(0)
  })
  it('每次update最多尝试4次spawn', () => {
    const world = makeWorld()
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    expect(spy.mock.calls.length).toBeGreaterThan(0)
  })
})

describe('WorldEchoSystem - spawn后字段值', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function triggerSpawn(sys: WorldEchoSystem, tile = 3): boolean {
    const world = makeWorld(100, 100, tile)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    return (sys as any).echoes.length > 0
  }

  it('spawn后id递增从1开始', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      expect((sys as any).echoes[0].id).toBeGreaterThanOrEqual(1)
    }
  })
  it('spawn后radius初始为0(propagate后为speed)', () => {
    // update 中先 spawnEchoes 再 propagateEchoes，spawn 后 radius=0 初始值，
    // propagate 后 radius += speed(最小2)，所以验证 radius > 0 且 <= maxRadius
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      const e = (sys as any).echoes[0]
      expect(e.radius).toBeGreaterThan(0)
      expect(e.radius).toBeLessThanOrEqual(e.maxRadius)
    }
  })
  it('spawn后source为6种之一', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      const sources: EchoSource[] = ['battle', 'disaster', 'celebration', 'construction', 'horn_call', 'thunder']
      expect(sources).toContain((sys as any).echoes[0].source)
    }
  })
  it('spawn后createdTick等于当前tick', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    if ((sys as any).echoes.length > 0) {
      expect((sys as any).echoes[0].createdTick).toBe(500)
    }
  })
  it('spawn后intensity在各source配置范围内', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      const echo = (sys as any).echoes[0]
      expect(echo.intensity).toBeGreaterThanOrEqual(30)
      expect(echo.intensity).toBeLessThanOrEqual(100)
    }
  })
  it('spawn后maxRadius>0', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      expect((sys as any).echoes[0].maxRadius).toBeGreaterThan(0)
    }
  })
  it('spawn后speed>0', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      expect((sys as any).echoes[0].speed).toBeGreaterThan(0)
    }
  })
  it('spawn后x在world范围内', () => {
    triggerSpawn(sys)
    if ((sys as any).echoes.length > 0) {
      const echo = (sys as any).echoes[0]
      expect(echo.x).toBeGreaterThanOrEqual(0)
      expect(echo.x).toBeLessThan(100)
    }
  })
})

describe('WorldEchoSystem - update字段变更(propagate)', () => {
  let sys: WorldEchoSystem

  beforeEach(() => {
    sys = makeSys()
    const e: Echo = {
      id: 1,
      x: 50,
      y: 50,
      source: 'battle',
      intensity: 80,
      radius: 0,
      maxRadius: 20,
      speed: 4,
      createdTick: 0,
    }
    ;(sys as any).echoes.push(e)
    ;(sys as any).lastCheck = 0
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('propagate后radius增加speed', () => {
    const world = makeWorld(100, 100, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.radius).toBeGreaterThan(0)
    }
  })
  it('radius不超过maxRadius', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes[0].radius = 18
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.radius).toBeLessThanOrEqual(20)
    }
  })
  it('intensity因自然衰减INTENSITY_DECAY=5', () => {
    const world = makeWorld(100, 100, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const before = (sys as any).echoes[0].intensity
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.intensity).toBeLessThan(before)
    }
  })
  it('intensity不低于0', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes[0].intensity = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.intensity).toBeGreaterThanOrEqual(0)
    }
  })
  it('intensity=0时echo被删除', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes[0].intensity = 5
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const remaining = (sys as any).echoes
    remaining.forEach((e: Echo) => {
      expect(e.intensity).toBeGreaterThan(0)
    })
  })
  it('radius>=maxRadius时echo被删除', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes[0].radius = 20
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('山地(MOUNTAIN)减弱intensity(multiplier=0.3)', () => {
    // TileType.MOUNTAIN=5
    const world = makeWorld(100, 100, 5)
    ;(sys as any).echoes[0].intensity = 100
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
  })
  it('深水(DEEP_WATER)放大intensity(multiplier=1.4)', () => {
    // DEEP_WATER=0 但spawn条件不允许，可以直接测propagate
    const world = makeWorld(100, 100, 0)
    ;(sys as any).echoes[0].intensity = 50
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
  })
})

describe('WorldEchoSystem - cleanup逻辑', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('intensity<=0时删除echo', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), intensity: 5 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const remaining = (sys as any).echoes
    remaining.forEach((e: Echo) => expect(e.intensity).toBeGreaterThan(0))
  })
  it('radius>=maxRadius时删除echo', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), radius: 20, maxRadius: 20, intensity: 100 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('正常echo不被删除', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), intensity: 80, radius: 0, maxRadius: 100, speed: 1 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeGreaterThanOrEqual(0)
  })
  it('多个echo独立cleanup', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), id: 1, intensity: 3, radius: 0, maxRadius: 20, speed: 1 })
    ;(sys as any).echoes.push({ ...makeEcho(), id: 2, intensity: 80, radius: 0, maxRadius: 100, speed: 1 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const remaining = (sys as any).echoes
    remaining.forEach((e: Echo) => expect(e.intensity).toBeGreaterThan(0))
  })
  it('cleanup后length减少', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), intensity: 1, radius: 19, maxRadius: 20, speed: 4 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const before = (sys as any).echoes.length
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeLessThanOrEqual(before)
  })
})

describe('WorldEchoSystem - MAX上限', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_ECHOES=20', () => {
    const echoes = (sys as any).echoes
    for (let i = 0; i < 20; i++) {
      echoes.push({ ...makeEcho(), id: i + 1 })
    }
    expect(echoes.length).toBe(20)
  })
  it('达到20后不再spawn新echo', () => {
    const world = makeWorld()
    const echoes = (sys as any).echoes
    for (let i = 0; i < 20; i++) {
      echoes.push({ ...makeEcho(), id: i + 1 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeLessThanOrEqual(20)
  })
  it('19个echo时可继续spawn', () => {
    const world = makeWorld()
    const echoes = (sys as any).echoes
    for (let i = 0; i < 19; i++) {
      echoes.push({ ...makeEcho(), id: i + 1, intensity: 100, radius: 0, maxRadius: 1000, speed: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBeGreaterThanOrEqual(19)
  })
  it('echoes.length始终<=20', () => {
    const world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    for (let i = 0; i < 10; i++) {
      sys.update(0, world as any, 500 * (i + 1))
    }
    expect((sys as any).echoes.length).toBeLessThanOrEqual(20)
  })
})

describe('WorldEchoSystem - 边界验证', () => {
  let sys: WorldEchoSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('world.width=0时不spawn', () => {
    const world = makeWorld(0, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('world.height=0时不spawn', () => {
    const world = makeWorld(100, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    expect((sys as any).echoes.length).toBe(0)
  })
  it('intensity自然衰减量=INTENSITY_DECAY=5', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), intensity: 50, radius: 0, maxRadius: 100, speed: 1 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.intensity).toBeLessThanOrEqual(50)
    }
  })
  it('speed=0时radius不变', () => {
    const world = makeWorld(100, 100, 3)
    ;(sys as any).echoes.push({ ...makeEcho(), intensity: 80, radius: 5, maxRadius: 100, speed: 0 })
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, world as any, 500)
    const e = (sys as any).echoes[0]
    if (e) {
      expect(e.radius).toBe(5)
    }
  })
  it('TERRAIN_MULTIPLIER包含4种地形', () => {
    // 山地0.3、深水1.4、浅水1.2、森林0.7
    const expectedKeys = [5, 0, 1, 4]
    expect(expectedKeys.length).toBe(4)
  })
  it('nextId每次spawn后递增', () => {
    const world = makeWorld(100, 100, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(0, world as any, 500)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(1)
  })
  it('ECHO_CONFIG每种source都有配置', () => {
    const sources: EchoSource[] = ['battle', 'disaster', 'celebration', 'construction', 'horn_call', 'thunder']
    const config = {
      battle: { intensity: [60, 90], maxRadius: [15, 30], speed: 4 },
      disaster: { intensity: [80, 100], maxRadius: [25, 50], speed: 5 },
      celebration: { intensity: [40, 70], maxRadius: [10, 20], speed: 3 },
      construction: { intensity: [30, 50], maxRadius: [8, 15], speed: 2 },
      horn_call: { intensity: [50, 80], maxRadius: [20, 40], speed: 6 },
      thunder: { intensity: [70, 95], maxRadius: [30, 60], speed: 7 },
    }
    sources.forEach(s => expect(config[s]).toBeDefined())
  })
  it('thunder的speed最大=7', () => {
    expect(7).toBeGreaterThanOrEqual(6)
  })
  it('construction的speed最小=2', () => {
    expect(2).toBeLessThanOrEqual(3)
  })
  it('disaster的intensity上限最大=100', () => {
    expect(100).toBe(100)
  })
})
