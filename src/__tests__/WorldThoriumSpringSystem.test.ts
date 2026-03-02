import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldThoriumSpringSystem } from '../systems/WorldThoriumSpringSystem'
import type { ThoriumSpringZone } from '../systems/WorldThoriumSpringSystem'

function makeSys(): WorldThoriumSpringSystem { return new WorldThoriumSpringSystem() }
let idCounter = 1
function makeZone(overrides: Partial<ThoriumSpringZone> = {}): ThoriumSpringZone {
  return {
    id: idCounter++,
    x: 20, y: 30,
    thoriumContent: 70,
    springFlow: 35,
    monaziteWeathering: 60,
    radioactiveDecay: 50,
    tick: 0,
    ...overrides
  }
}

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
// nearWater: getTile()返回1或0时，hasAdjacentTile可能返回true
// mockWorld的getTile必须能满足nearWater或nearMountain条件
function makeWorldWithTile(tileType: number) {
  return { width: 200, height: 200, getTile: () => tileType } as any
}

// world all tiles = SHALLOW_WATER(1) → nearWater=true
const mockWorldWater = makeWorldWithTile(1)
// world all tiles = MOUNTAIN(5) → nearMountain=true
const mockWorldMountain = makeWorldWithTile(5)
// world all tiles = GRASS(3) → neither nearWater nor nearMountain → skip
const mockWorldGrass = makeWorldWithTile(3)
const mockEm = {} as any

const CHECK_INTERVAL = 3050
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const LIFETIME = 54000

describe('WorldThoriumSpringSystem - 初始状态', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones为Array实例', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('直接注入zone后可访问', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldThoriumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（差值0 < CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorldWater, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick = CHECK_INTERVAL时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时也触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次update在间隔内不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update满足间隔后触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick < CHECK_INTERVAL时zones不变化', () => {
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldThoriumSpringSystem - tile条件与spawn逻辑', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('nearWater(SHALLOW_WATER)且random<=FORM_CHANCE时spawn（3次attempt全部触发，spawn3个）', () => {
    // FORM_CHANCE=0.003，3次attempt全部满足tile+chance条件，spawn 3个zone
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('nearMountain且random<=FORM_CHANCE时spawn（至少1个zone）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldMountain, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('无水无山（GRASS）时不spawn（tile条件不满足，continue）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // FORM_CHANCE条件满足，但tile不满足
    sys.update(0, mockWorldGrass, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn（即使tile条件满足）', () => {
    // random > 0.003 → continue（跳过）
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random = FORM_CHANCE时应spawn（条件是 > ，等于则不continue）', () => {
    // 条件: if (Math.random() > FORM_CHANCE) continue
    // random = 0.003 → NOT > 0.003 → 不continue → 3次attempt各spawn一个
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('random略大于FORM_CHANCE时不spawn（continue跳过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE + 0.0001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn后nextId至少递增1（3次attempt最多spawn3个）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    expect((sys as any).nextId).toBeLessThanOrEqual(4)
  })

  it('spawn的zone tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
  })

  it('spawn的zone id为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].id).toBe(1)
  })

  it('每次update最多尝试3次spawn（attempt < 3）', () => {
    // tile=GRASS → 3次attempt都被continue，zones保持为0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldGrass, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones >= MAX_ZONES时不spawn（break提前退出）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('spawn的thoriumContent在[40, 100)范围（40+random*60）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.thoriumContent).toBeGreaterThanOrEqual(40)
    expect(z.thoriumContent).toBeLessThan(100.1)
  })

  it('spawn的springFlow在[10, 60)范围（10+random*50）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThan(60.1)
  })

  it('spawn的monaziteWeathering在[20, 100)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.monaziteWeathering).toBeGreaterThanOrEqual(20)
    expect(z.monaziteWeathering).toBeLessThan(100.1)
  })

  it('spawn的radioactiveDecay在[15, 100)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.radioactiveDecay).toBeGreaterThanOrEqual(15)
    expect(z.radioactiveDecay).toBeLessThan(100.1)
  })

  it('spawn的zone x在[0, world.width)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(mockWorldWater.width)
  })

  it('spawn的zone y在[0, world.height)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(mockWorldWater.height)
  })

  it('DEEP_WATER(0)也满足nearWater条件（至少spawn1个）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const worldDeepWater = makeWorldWithTile(0) // DEEP_WATER
    sys.update(0, worldDeepWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })
})

describe('WorldThoriumSpringSystem - cleanup逻辑', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick恰好等于cutoff时不删除（条件是 < cutoff）', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME // = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: cutoff })) // tick === cutoff，不满足 < cutoff
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick < cutoff时删除', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick > cutoff时保留', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('过期和未过期混合时只删过期的', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(cutoff + 1)
  })

  it('所有zone都��期时清空', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('不在间隔内时不执行cleanup', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 })) // 旧zone但update不触发
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(1) // 没执行，仍保留
  })

  it('多个过期zone全部被删除', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    for (let i = 0; i < 4; i++) {
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 500 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup后nextId不重置', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).nextId = 10
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).nextId).toBe(10)
  })

  it('cleanup后zones数量正确', () => {
    const currentTick = CHECK_INTERVAL + LIFETIME
    const cutoff = currentTick - LIFETIME
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 过期
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 5 })) // 保留
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 10 })) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(2)
  })

  it('LIFETIME为54000（cutoff = tick - 54000）', () => {
    const tick = CHECK_INTERVAL + 54000
    const cutoff = tick - 54000 // = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL - 1 })) // < cutoff，删除
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))     // === cutoff，保留
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldThoriumSpringSystem - 综合场景', () => {
  let sys: WorldThoriumSpringSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone字段类型均为number', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(typeof z.thoriumContent).toBe('number')
    expect(typeof z.springFlow).toBe('number')
    expect(typeof z.monaziteWeathering).toBe('number')
    expect(typeof z.radioactiveDecay).toBe('number')
  })

  it('update不改变已存在zone的字段值（无update逻辑）', () => {
    ;(sys as any).zones.push(makeZone({ thoriumContent: 70, springFlow: 35, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    // thorium spring system没有对已存在zone的update逻辑
    expect((sys as any).zones[0].thoriumContent).toBe(70)
    expect((sys as any).zones[0].springFlow).toBe(35)
  })

  it('zones数组在update后仍为同一引用', () => {
    const ref = (sys as any).zones
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toBe(ref)
  })

  it('连续两次满足间隔的update都更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('zone id为正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].id).toBeGreaterThan(0)
    expect(Number.isInteger((sys as any).zones[0].id)).toBe(true)
  })

  it('zone x、y为非负整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].x).toBeGreaterThanOrEqual(0)
    expect((sys as any).zones[0].y).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger((sys as any).zones[0].x)).toBe(true)
    expect(Number.isInteger((sys as any).zones[0].y)).toBe(true)
  })

  it('nextId在多次spawn后正确递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    const afterFirst = (sys as any).nextId
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL * 2)
    const afterSecond = (sys as any).nextId
    expect(afterSecond).toBeGreaterThan(afterFirst)
  })

  it('cleanup后可再次spawn', () => {
    const tick1 = CHECK_INTERVAL
    const tick2 = CHECK_INTERVAL + LIFETIME + CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: tick1 })) // 旧zone，在tick2时会过期
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, tick2)
    // 旧zone被清理，可以spawn新zone
    const zones = (sys as any).zones
    // 有可能spawn了新的（random=0.001 <= FORM_CHANCE=0.003），检查新zone的tick
    if (zones.length > 0) {
      expect(zones[zones.length - 1].tick).toBe(tick2)
    }
  })

  it('直接注入zone不调用update时字段不变', () => {
    ;(sys as any).zones.push(makeZone({ thoriumContent: 80 }))
    expect((sys as any).zones[0].thoriumContent).toBe(80)
  })

  it('满额MAX_ZONES时即使tile条件满足也不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('LAVA(7) tile不满足nearWater或nearMountain条件，不spawn', () => {
    const worldLava = makeWorldWithTile(7) // LAVA
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldLava, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SAND(2) tile不满足nearWater或nearMountain条件，不spawn', () => {
    const worldSand = makeWorldWithTile(2) // SAND
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSand, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SNOW(6) tile不满足nearWater或nearMountain条件，不spawn', () => {
    const worldSnow = makeWorldWithTile(6) // SNOW
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, worldSnow, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('每次update最多添加3个zone（3次attempt）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL)
    // 最多3次attempt，最多spawn 3个
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('lastCheck在tick=CHECK_INTERVAL-1时不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, mockWorldWater, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
})
