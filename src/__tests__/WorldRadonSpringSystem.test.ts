import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRadonSpringSystem } from '../systems/WorldRadonSpringSystem'
import type { RadonSpringZone } from '../systems/WorldRadonSpringSystem'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSys(): WorldRadonSpringSystem { return new WorldRadonSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<RadonSpringZone> = {}): RadonSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    radonContent: 40,
    springFlow: 50,
    radiumDecay: 60,
    gasConcentration: 70,
    tick: 0,
    ...overrides,
  } as RadonSpringZone
}

/**
 * hasAdjacentTile() compares world.getTile() === tileType (a number).
 * So getTile must return the number directly, not an object.
 */
function makeWorld(tileType: number = 1) {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => tileType,
  }
}

const em: any = null

const CHECK_INTERVAL = 3110
const MAX_ZONES = 32

// ── 1. 初始状态 ───────────────────────────────────────────────────────────────

describe('WorldRadonSpringSystem - 初始状态', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Radon泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('zones初始为空数组', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })
  it('注入zone后长度增加', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('注入多个zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
  it('zones是内部引用（同一对象）', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })
  it('手动zone字段可正确读取', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.radonContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.radiumDecay).toBe(60)
    expect(z.gasConcentration).toBe(70)
  })
})

// ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

describe('WorldRadonSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL时不执行spawn', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick === CHECK_INTERVAL时执行（边界条件）', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('首次update后lastCheck更新为当前tick', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('节流期内lastCheck不变', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    sys.update(0, world as any, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二个CHECK_INTERVAL后lastCheck再次更新', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    sys.update(0, world as any, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期内不增加zone', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).zones.length
    sys.update(0, world as any, em, CHECK_INTERVAL + 1)
    expect((sys as any).zones.length).toBe(countAfterFirst)
  })
  it('CHECK_INTERVAL常量为3110', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, 3109)
    expect((sys as any).lastCheck).toBe(0) // 未触发
    sys.update(0, world as any, em, 3110)
    expect((sys as any).lastCheck).toBe(3110) // 触发
  })
})

// ── 3. spawn 条件 ─────────────────────────────────────────────────────────────

describe('WorldRadonSpringSystem - spawn条件', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('无水无山时不spawn（random=0）', () => {
    const world = { width: 100, height: 100, getTile: () => 3 } // GRASS=3
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn（0.9 > 0.003）', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random=0且nearShallowWater时spawn成功', () => {
    const world = makeWorld(1) // SHALLOW_WATER=1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearMountain且random=0时能spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 5 } // MOUNTAIN=5
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearDeepWater且random=0时能spawn', () => {
    const world = { width: 100, height: 100, getTile: () => 0 } // DEEP_WATER=0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('每次update最多spawn3个（3次attempt）', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
  it('zones达到MAX_ZONES后不再spawn', () => {
    const world = makeWorld(1)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBe(MAX_ZONES)
  })
  it('zone数量接近MAX_ZONES时部分attempt被跳过', () => {
    const world = makeWorld(1)
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
  it('spawn后nextId递增', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const beforeId = (sys as any).nextId
    sys.update(0, world as any, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(beforeId)
  })
})

// ── 4. spawn 字段范围 ─────────────────────────────────────────────────────────

describe('WorldRadonSpringSystem - spawn字段范围', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOneZone(randomVal: number): RadonSpringZone {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    return (sys as any).zones[0]
  }

  it('radonContent >= 40', () => {
    const z = spawnOneZone(0)
    expect(z.radonContent).toBeGreaterThanOrEqual(40)
  })
  it('radonContent <= 100', () => {
    const z = spawnOneZone(0)
    expect(z.radonContent).toBeLessThanOrEqual(100)
  })
  it('springFlow >= 10', () => {
    const z = spawnOneZone(0)
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
  })
  it('springFlow <= 60', () => {
    const z = spawnOneZone(0)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })
  it('radiumDecay >= 20', () => {
    const z = spawnOneZone(0)
    expect(z.radiumDecay).toBeGreaterThanOrEqual(20)
  })
  it('radiumDecay <= 100', () => {
    const z = spawnOneZone(0)
    expect(z.radiumDecay).toBeLessThanOrEqual(100)
  })
  it('gasConcentration >= 15', () => {
    const z = spawnOneZone(0)
    expect(z.gasConcentration).toBeGreaterThanOrEqual(15)
  })
  it('gasConcentration <= 100', () => {
    const z = spawnOneZone(0)
    expect(z.gasConcentration).toBeLessThanOrEqual(100)
  })
  it('spawn后tick记录当前tick值', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后id从1开始自增', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.id).toBeGreaterThanOrEqual(1)
  })
})

// ── 5. update数值逻辑（Spring静态：字段spawn后不变） ─────────────────────────

describe('WorldRadonSpringSystem - update数值逻辑', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('两次CHECK_INTERVAL后zones可以继续累积', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    const count1 = (sys as any).zones.length
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL * 2)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(count1)
  })
  it('zone字段在update间不被系统修改（静态存储）', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, world as any, em, CHECK_INTERVAL)
    const zBefore = { ...(sys as any).zones[0] }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, world as any, em, CHECK_INTERVAL * 2)
    const zAfter = (sys as any).zones[0]
    expect(zAfter.radonContent).toBe(zBefore.radonContent)
    expect(zAfter.springFlow).toBe(zBefore.springFlow)
    expect(zAfter.radiumDecay).toBe(zBefore.radiumDecay)
    expect(zAfter.gasConcentration).toBe(zBefore.gasConcentration)
  })
  it('多个zone各自保留独立tick值', () => {
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 200 }))
    expect((sys as any).zones[0].tick).toBe(100)
    expect((sys as any).zones[1].tick).toBe(200)
  })
  it('zones按push顺序存储', () => {
    ;(sys as any).zones.push(makeZone({ id: 999, tick: 100 }))
    ;(sys as any).zones.push(makeZone({ id: 1000, tick: 200 }))
    expect((sys as any).zones[0].id).toBe(999)
    expect((sys as any).zones[1].id).toBe(1000)
  })
  it('不使用em（传null不崩溃）', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, world as any, null as any, CHECK_INTERVAL)).not.toThrow()
  })
  it('多次触发CHECK_INTERVAL，zones数量不超过MAX_ZONES', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 1; t <= 20; t++) {
      sys.update(0, world as any, em, CHECK_INTERVAL * t)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
  it('dt参数不影响系统行为', () => {
    const world = makeWorld(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(999, world as any, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ── 6. cleanup 逻辑 ───────────────────────────────────────────────────────────

describe('WorldRadonSpringSystem - cleanup逻辑', () => {
  let sys: WorldRadonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const CUTOFF_DURATION = 54000
  const bigTick = CHECK_INTERVAL + CUTOFF_DURATION + 10000

  it('zone.tick在cutoff内时保留（不删除）', () => {
    const safeTick = bigTick - CUTOFF_DURATION + 100
    ;(sys as any).zones.push(makeZone({ tick: safeTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('zone.tick < cutoff时删除', () => {
    const oldTick = bigTick - CUTOFF_DURATION - 1
    ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('旧zone删除，新zone保留', () => {
    const oldTick = bigTick - CUTOFF_DURATION - 1
    const newTick = bigTick - 100
    ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    ;(sys as any).zones.push(makeZone({ tick: newTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(newTick)
  })
  it('cutoff边界：zone.tick === cutoff-1时删除', () => {
    const cutoff = bigTick - CUTOFF_DURATION
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cutoff边界：zone.tick === cutoff时不删除（等于cutoff不满足 < 条件）', () => {
    const cutoff = bigTick - CUTOFF_DURATION
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('多个旧zone全部被删除', () => {
    const oldTick = bigTick - CUTOFF_DURATION - 1
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cleanup在节流期内不执行', () => {
    const oldTick = bigTick - CUTOFF_DURATION - 1
    ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    ;(sys as any).lastCheck = bigTick
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick + 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('CUTOFF_DURATION为54000', () => {
    const oldTick = bigTick - 54001
    ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(1) as any, em, bigTick)
    expect((sys as any).zones).toHaveLength(0)
  })
})
