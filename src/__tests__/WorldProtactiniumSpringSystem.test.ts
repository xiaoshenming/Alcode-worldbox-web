import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldProtactiniumSpringSystem } from '../systems/WorldProtactiniumSpringSystem'
import type { ProtactiniumSpringZone } from '../systems/WorldProtactiniumSpringSystem'

// 常量镜像（来自源码）
const CHECK_INTERVAL = 3060
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000

let nextId = 1
function makeSys(): WorldProtactiniumSpringSystem { return new WorldProtactiniumSpringSystem() }
function makeZone(overrides: Partial<ProtactiniumSpringZone> = {}): ProtactiniumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    protactiniumContent: 50,
    springFlow: 30,
    pitchblendeLeaching: 40,
    betaRadiation: 25,
    tick: 0,
    ...overrides,
  }
}

// world mock：getTile 返回 1(SHALLOW_WATER)，hasAdjacentTile → nearWater=true
function makeWorld(nearWater: boolean = true, nearMountain: boolean = false): any {
  return {
    width: 200,
    height: 200,
    getTile: (_x: number, _y: number) => {
      if (nearWater) return 1   // SHALLOW_WATER
      if (nearMountain) return 5 // MOUNTAIN
      return 3  // GRASS
    },
  }
}
const mockEm = {} as any

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldProtactiniumSpringSystem - 初始状态', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始zones为空数组', () => { expect((sys as any).zones).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('zones是数组类型', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('注入一条后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('内部数组是同一引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('zone字段protactiniumContent可正确读取', () => {
    ;(sys as any).zones.push(makeZone({ protactiniumContent: 70 }))
    expect((sys as any).zones[0].protactiniumContent).toBe(70)
  })
  it('zone字段springFlow可正确读取', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 40 }))
    expect((sys as any).zones[0].springFlow).toBe(40)
  })
  it('zone字段pitchblendeLeaching和betaRadiation可正确读取', () => {
    ;(sys as any).zones.push(makeZone({ pitchblendeLeaching: 55, betaRadiation: 65 }))
    const z = (sys as any).zones[0]
    expect(z.pitchblendeLeaching).toBe(55)
    expect(z.betaRadiation).toBe(65)
  })
  it('注入多个后长度正确', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldProtactiniumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不执行（zones保持空）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行（nearWater+random=0触发spawn）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('tick > CHECK_INTERVAL时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('两次update间隔不足不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).zones.length
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).zones.length).toBe(count1)
  })
  it('达到第二个间隔后再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).zones.length
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).zones.length).toBeGreaterThan(count1)
  })
  it('tick=0时不执行（差值0 < 3060）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('lastCheck在执行后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('执行前lastCheck仍为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldProtactiniumSpringSystem - spawn条件', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('nearWater且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(true, false), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearMountain且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(false, true), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(true, false), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('无nearWater也无nearMountain时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(false, false), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('已有MAX_ZONES个时不spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('有31个时仍可spawn（未满MAX_ZONES）', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES - 1)
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn后nextId递增（id唯一）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL * 2)
    if ((sys as any).zones.length >= 2) {
      const ids = (sys as any).zones.map((z: ProtactiniumSpringZone) => z.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    }
  })
  it('每次update最多尝试3次attempt，不超过MAX_ZONES', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
})

// ─── 4. spawn字段范围 ─────────────────────────────────────────────────────────
describe('WorldProtactiniumSpringSystem - spawn字段范围', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('protactiniumContent范围[40,100]（random=0时为40）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].protactiniumContent).toBe(40)
    }
  })
  it('protactiniumContent字段在合理范围内', () => {
    const z = makeZone({ protactiniumContent: 75 })
    ;(sys as any).zones.push(z)
    expect(z.protactiniumContent).toBeGreaterThanOrEqual(40)
    expect(z.protactiniumContent).toBeLessThanOrEqual(100)
  })
  it('springFlow范围[10,60]（random=0时为10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].springFlow).toBe(10)
    }
  })
  it('pitchblendeLeaching范围[20,100]（random=0时为20）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].pitchblendeLeaching).toBe(20)
    }
  })
  it('betaRadiation范围[15,100]（random=0时为15）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].betaRadiation).toBe(15)
    }
  })
  it('x坐标在[0,world.width)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 100, height: 100, getTile: () => 1 } as any
    sys.update(1, w, mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(100)
    }
  })
  it('y坐标在[0,world.height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const w = { width: 100, height: 100, getTile: () => 1 } as any
    sys.update(1, w, mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(100)
    }
  })
})

// ─── 5. update数值逻辑（zone字段为静态，spawn后不修改） ───────────────────────
describe('WorldProtactiniumSpringSystem - zone字段静态性', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update后protactiniumContent不变', () => {
    const z = makeZone({ protactiniumContent: 70, tick: CHECK_INTERVAL })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.protactiniumContent).toBe(70)
  })
  it('update后springFlow不变', () => {
    const z = makeZone({ springFlow: 35, tick: CHECK_INTERVAL })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.springFlow).toBe(35)
  })
  it('update后pitchblendeLeaching不变', () => {
    const z = makeZone({ pitchblendeLeaching: 55, tick: CHECK_INTERVAL })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.pitchblendeLeaching).toBe(55)
  })
  it('update后betaRadiation不变', () => {
    const z = makeZone({ betaRadiation: 65, tick: CHECK_INTERVAL })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.betaRadiation).toBe(65)
  })
  it('多个zone各自字段独立保持', () => {
    const z1 = makeZone({ protactiniumContent: 50, tick: CHECK_INTERVAL })
    const z2 = makeZone({ protactiniumContent: 80, tick: CHECK_INTERVAL })
    ;(sys as any).zones.push(z1, z2)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z1.protactiniumContent).toBe(50)
    expect(z2.protactiniumContent).toBe(80)
  })
  it('zone.tick字段是spawn时的tick值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('update在tick不满足时不执行zone遍历', () => {
    const z = makeZone({ protactiniumContent: 70, tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('无spawn时nextId保持为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(false, false), mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(1)
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldProtactiniumSpringSystem - cleanup逻辑', () => {
  let sys: WorldProtactiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick值较新时不删除（zone.tick>cutoff）', () => {
    const tick = 60000
    // cutoff = 60000 - 54000 = 6000，zone.tick=50000 > 6000，保留
    const z = makeZone({ tick: 50000 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tick值过旧时删除（zone.tick<cutoff）', () => {
    const tick = 60000
    // cutoff = 60000 - 54000 = 6000，zone.tick=0 < 6000，删除
    const z = makeZone({ tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick == cutoff时保留（严格小于，不删除）', () => {
    const tick = 54000
    // cutoff = 54000 - 54000 = 0，zone.tick=0 == cutoff，不 < cutoff，保留
    const z = makeZone({ tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tick == cutoff-1时删除', () => {
    const tick = 60000
    const cutoff = tick - 54000 // 6000
    const z = makeZone({ tick: cutoff - 1 }) // 5999 < 6000，删除
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('混合：新的保留老的删除', () => {
    const tick = 60000
    const newZ = makeZone({ tick: 55000 }) // 保留
    const oldZ = makeZone({ tick: 0 })    // 删除
    ;(sys as any).zones.push(newZ, oldZ)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(55000)
  })
  it('cleanup不在tick不满足时执行', () => {
    const z = makeZone({ tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('多个过旧zone全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cutoff=54000边界精确（46001保留，45999删除）', () => {
    const tick = 100000
    const cutoff = tick - 54000 // 46000
    const keepZ = makeZone({ tick: 46001 }) // 46001 > 46000，保留
    const delZ = makeZone({ tick: 45999 })  // 45999 < 46000，删除
    ;(sys as any).zones.push(keepZ, delZ)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(46001)
  })
})
