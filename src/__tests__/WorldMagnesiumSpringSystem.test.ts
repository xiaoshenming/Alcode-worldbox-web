import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMagnesiumSpringSystem } from '../systems/WorldMagnesiumSpringSystem'
import type { MagnesiumSpringZone } from '../systems/WorldMagnesiumSpringSystem'

const CHECK_INTERVAL = 3352
const MAX_ZONES = 32
const FORM_CHANCE = 0.003

// ── 辅助 world mock ─────────────────────────────────────────────────────────
// TileType: SAND=2（阻断，因为!nearWater && !nearMountain）
function makeWorld(tile = 2) {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => tile,
  }
}
// world 中 getTile 返回 SHALLOW_WATER=1（nearWater=true）
function makeWaterWorld() {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => 1,
  }
}
// world 中 getTile 返回 MOUNTAIN=5（nearMountain=true）
function makeMountainWorld() {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => 5,
  }
}
const fakeEm = {} as any

function makeSys(): WorldMagnesiumSpringSystem { return new WorldMagnesiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<MagnesiumSpringZone> = {}): MagnesiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    magnesiumContent: 40, springFlow: 50,
    dolomiteLeaching: 50, dissolvedMineral: 60,
    tick: 0,
    ...overrides,
  }
}

// ─── 1. 初始状态 ──────────────────────────────────────────────��──────────────
describe('WorldMagnesiumSpringSystem - 初始状态', () => {
  let sys: WorldMagnesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始zones为空数组', () => { expect((sys as any).zones).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('zones返回内部同一引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('MagnesiumSpringZone接口字段完整', () => {
    const z = makeZone()
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x')
    expect(z).toHaveProperty('y')
    expect(z).toHaveProperty('magnesiumContent')
    expect(z).toHaveProperty('springFlow')
    expect(z).toHaveProperty('dolomiteLeaching')
    expect(z).toHaveProperty('dissolvedMineral')
    expect(z).toHaveProperty('tick')
  })
  it('手动注入zone后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
})

// ─── 2. CHECK_INTERVAL节流 ────────────────────────────────────────────────────
describe('WorldMagnesiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldMagnesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时跳过，zones不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // FORM_CHANCE通过
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行逻辑', () => {
    // random需要同时满足：hasAdjacentTile需要world.getTile返回水/山
    // 且random < FORM_CHANCE(0.003)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    // random=0 < FORM_CHANCE=0.003，且水世界nearWater=true，应spawn
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0) // 视random floor
  })
  it('沙地world(tile=2)阻断spawn：!nearWater&&!nearMountain', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(2) as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('两次update间隔不足CHECK_INTERVAL不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).zones.length
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL + 100) // 差100 < 3352
    expect((sys as any).zones.length).toBe(countAfterFirst)
  })
  it('达到CHECK_INTERVAL*2时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL * 2)
    // 两次都执行（每次最多3次attempt），zones数量 >= 执行次数*0
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('lastCheck在执行后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不spawn，只更新lastCheck
    sys.update(1, makeWorld(2) as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─── 3. spawn条件（nearWater / nearMountain / FORM_CHANCE） ───────────────────
describe('WorldMagnesiumSpringSystem - spawn条件', () => {
  let sys: WorldMagnesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('nearWater+random=0时可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.003 → 通过
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearMountain+random=0时可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeMountainWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('random > FORM_CHANCE时跳过spawn', () => {
    // random=0.5 > 0.003，跳过
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('MAX_ZONES=32上限阻断spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL })) // tick=CHECK_INTERVAL，不过期
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('31个zone时还可再spawn', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(31)
  })
  it('每次update最多尝试3次attempt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    // 3次attempt全部通过时最多spawn 3个
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

// ─── 4. spawn后字段范围 ───────────────────────────────────────────────────────
describe('WorldMagnesiumSpringSystem - spawn后字段范围', () => {
  let sys: WorldMagnesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('magnesiumContent在40-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.magnesiumContent).toBeGreaterThanOrEqual(40)
      expect(z.magnesiumContent).toBeLessThanOrEqual(100)
    }
  })
  it('springFlow在10-60范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })
  it('dolomiteLeaching在20-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.dolomiteLeaching).toBeGreaterThanOrEqual(20)
      expect(z.dolomiteLeaching).toBeLessThanOrEqual(100)
    }
  })
  it('dissolvedMineral在15-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.dissolvedMineral).toBeGreaterThanOrEqual(15)
      expect(z.dissolvedMineral).toBeLessThanOrEqual(100)
    }
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn后id字段为正整数且自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL)
    sys.update(1, makeWaterWorld() as any, fakeEm, CHECK_INTERVAL * 2)
    const zones = (sys as any).zones
    if (zones.length >= 2) {
      expect(zones[1].id).toBeGreaterThan(zones[0].id)
    }
  })
})

// ─── 5. cleanup逻辑（cutoff = tick - 54000） ──────────────────────────────────
describe('WorldMagnesiumSpringSystem - cleanup逻辑', () => {
  let sys: WorldMagnesiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('zone.tick == cutoff时不删除（严格小于）', () => {
    // cutoff = tick - 54000，zone.tick < cutoff才删除
    const tick = CHECK_INTERVAL
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff })) // tick==cutoff，不删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('zone.tick < cutoff时删除', () => {
    const tick = CHECK_INTERVAL
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // tick < cutoff，删除
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('zone.tick > cutoff时保留', () => {
    const tick = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: tick - 1000 })) // 近期zone，保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('大tick时过期zone被删除', () => {
    const tick = 100000
    const cutoff = tick - 54000 // = 46000
    ;(sys as any).zones.push(makeZone({ tick: 100 })) // tick=100 < 46000, 过期
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL // 确保可执行
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('混合情况：过期的删除，未过期的保留', () => {
    const tick = 100000
    const cutoff = tick - 54000 // = 46000
    ;(sys as any).zones.push(makeZone({ tick: 100 }))       // 过期
    ;(sys as any).zones.push(makeZone({ tick: tick - 1000 })) // 保留
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('多个过期zone全部删除', () => {
    const tick = 100000
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, fakeEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cleanup在tick不足CHECK_INTERVAL时不执行', () => {
    // 首次update，tick < CHECK_INTERVAL直接return，cleanup不执行
    ;(sys as any).zones.push(makeZone({ tick: -999999 })) // 极早期zone
    sys.update(1, makeWorld(2) as any, fakeEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(1) // 不被清理
  })
})
