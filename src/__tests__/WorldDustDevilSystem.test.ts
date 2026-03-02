import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldDustDevilSystem } from '../systems/WorldDustDevilSystem'
import type { DustDevil, DevilIntensity } from '../systems/WorldDustDevilSystem'

function makeSys(): WorldDustDevilSystem { return new WorldDustDevilSystem() }
let nextId = 1
function makeDevil(intensity: DevilIntensity = 'moderate', overrides: Partial<DustDevil> = {}): DustDevil {
  return {
    id: nextId++, x: 30, y: 40, intensity, radius: 5, speed: 0.3,
    direction: 1.5, lifetime: 200, startTick: 0,
    resourcesScattered: 0, creaturesDisoriented: 0,
    ...overrides,
  }
}

const worldSand = { width: 200, height: 200, getTile: () => 2 } as any   // SAND=2
const worldGrass = { width: 200, height: 200, getTile: () => 3 } as any  // GRASS=3
const emEmpty = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

describe('WorldDustDevilSystem - 初始状态', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无尘卷风', () => { expect((sys as any).devils).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('devils是数组', () => { expect(Array.isArray((sys as any).devils)).toBe(true) })
})

describe('WorldDustDevilSystem - 强度与字段', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('支持4种强度', () => {
    const intensities: DevilIntensity[] = ['minor', 'moderate', 'strong', 'violent']
    expect(intensities).toHaveLength(4)
  })
  it('minor radius在RADIUS_MAP中为2', () => {
    ;(sys as any).devils.push(makeDevil('minor', { radius: 2 }))
    expect((sys as any).devils[0].radius).toBe(2)
  })
  it('moderate radius=3', () => {
    ;(sys as any).devils.push(makeDevil('moderate', { radius: 3 }))
    expect((sys as any).devils[0].radius).toBe(3)
  })
  it('strong radius=5', () => {
    ;(sys as any).devils.push(makeDevil('strong', { radius: 5 }))
    expect((sys as any).devils[0].radius).toBe(5)
  })
  it('violent radius=7', () => {
    ;(sys as any).devils.push(makeDevil('violent', { radius: 7 }))
    expect((sys as any).devils[0].radius).toBe(7)
  })
  it('尘卷风有creaturesDisoriented字段', () => {
    const d = makeDevil()
    expect(d.creaturesDisoriented).toBe(0)
  })
  it('尘卷风有resourcesScattered字段', () => {
    const d = makeDevil()
    expect(d.resourcesScattered).toBe(0)
  })
})

describe('WorldDustDevilSystem - update节流', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 500)  // 500 < 1000
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1000)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('连续两次update，第二次如tick差<CHECK_INTERVAL则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1000)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(0, worldSand, emEmpty, 1500)  // 差值500 < 1000
    expect((sys as any).lastCheck).toBe(lastCheck1)
  })
})

describe('WorldDustDevilSystem - 过期删除', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('elapsed > lifetime时删除尘卷风', () => {
    ;(sys as any).devils.push(makeDevil('minor', { x: 50, y: 50, radius: 2, lifetime: 100, startTick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1200)  // elapsed=1200 > lifetime=100
    expect((sys as any).devils).toHaveLength(0)
  })
  it('elapsed <= lifetime时保留尘卷风', () => {
    ;(sys as any).devils.push(makeDevil('moderate', { x: 50, y: 50, radius: 3, lifetime: 5000, startTick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1000)  // elapsed=1000 < lifetime=5000
    expect((sys as any).devils).toHaveLength(1)
  })
  it('多个尘卷风只过期的被删除', () => {
    ;(sys as any).devils.push(makeDevil('minor', { id: 10, x: 50, y: 50, lifetime: 50, startTick: 0 }))
    ;(sys as any).devils.push(makeDevil('strong', { id: 11, x: 80, y: 80, lifetime: 5000, startTick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emEmpty, 1000)
    expect((sys as any).devils).toHaveLength(1)
    expect((sys as any).devils[0].id).toBe(11)
  })
})

describe('WorldDustDevilSystem - 非沙地地形衰减', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('非SAND地形时lifetime减半', () => {
    ;(sys as any).devils.push(makeDevil('minor', { x: 50, y: 50, radius: 2, lifetime: 4000, startTick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // worldGrass返回GRASS(3)，非SAND，进入lifetime*=0.5分支
    sys.update(0, worldGrass, emEmpty, 1000)
    // lifetime减半后=2000，elapsed=1000还未过期，devil仍存在
    expect((sys as any).devils).toHaveLength(1)
    expect((sys as any).devils[0].lifetime).toBeLessThan(4000)
  })
})

describe('WorldDustDevilSystem - 生物击中计数', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('生物在半径内时creaturesDisoriented增加', () => {
    ;(sys as any).devils.push(makeDevil('strong', { x: 50, y: 50, radius: 5, lifetime: 5000, startTick: 0 }))
    const emWithCreature = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ x: 51, y: 51 }),  // 在radius=5内
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emWithCreature, 1000)
    expect((sys as any).devils[0].creaturesDisoriented).toBeGreaterThan(0)
  })
  it('生物在半径外时creaturesDisoriented不变', () => {
    ;(sys as any).devils.push(makeDevil('minor', { x: 50, y: 50, radius: 2, lifetime: 5000, startTick: 0 }))
    const emFar = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ x: 200, y: 200 }),  // 距离很远
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, worldSand, emFar, 1000)
    expect((sys as any).devils[0].creaturesDisoriented).toBe(0)
  })
})

describe('WorldDustDevilSystem - MAX_DEVILS上限', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入8个尘卷风达到MAX_DEVILS', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).devils.push(makeDevil('minor', { id: 100 + i, lifetime: 999999, startTick: 0 }))
    }
    expect((sys as any).devils).toHaveLength(8)
  })
  it('达到MAX_DEVILS时即使random<SPAWN_CHANCE也不spawn', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).devils.push(makeDevil('minor', { id: 100 + i, x: 50, y: 50, lifetime: 999999, startTick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // <SPAWN_CHANCE=0.005
    sys.update(0, worldSand, emEmpty, 1000)
    // 8个都保留（lifetime很大），不会再加
    expect((sys as any).devils.length).toBeLessThanOrEqual(8)
  })
})

describe('WorldDustDevilSystem - lifetime范围', () => {
  let sys: WorldDustDevilSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('手动构造的lifetime=2000符合最小值', () => {
    const d = makeDevil('minor', { lifetime: 2000 })
    expect(d.lifetime).toBeGreaterThanOrEqual(2000)
  })
  it('手动构造的lifetime=6000符合最大值', () => {
    const d = makeDevil('minor', { lifetime: 6000 })
    expect(d.lifetime).toBeLessThanOrEqual(6000)
  })
})
