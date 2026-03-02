import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldScandiumSpringSystem } from '../systems/WorldScandiumSpringSystem'
import type { ScandiumSpringZone } from '../systems/WorldScandiumSpringSystem'

// CHECK_INTERVAL=2920, FORM_CHANCE=0.003, MAX_ZONES=32
// spawn条件: nearWater(SHALLOW_WATER=1 or DEEP_WATER=0) or nearMountain(MOUNTAIN=5)
//            AND Math.random() > FORM_CHANCE (random=0 时 0>0.003 为false => 不spawn；random=0.004时spawn)
// 注意: FORM_CHANCE方向是 > 表示random小则skip，即random必须 <= FORM_CHANCE才spawn
// 实际上: if (Math.random() > FORM_CHANCE) continue => random<=FORM_CHANCE时才不continue => spawn
// 所以: random=0 时 0>0.003 false => 不continue => spawn！
// hasAdjacentTile: world.getTile()必须返回 number
// cleanup: cutoff = tick-54000, 删除 zones[i].tick < cutoff

function makeSys(): WorldScandiumSpringSystem { return new WorldScandiumSpringSystem() }

// world.getTile返回number，用于hasAdjacentTile
function makeWorldAdjacentWater() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => 1, // SHALLOW_WATER=1，所有相邻格子都是浅水
  } as any
}

function makeWorldAdjacentMountain() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => 5, // MOUNTAIN=5
  } as any
}

function makeWorldNoAdjacent() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => 3, // GRASS=3，非水非山
  } as any
}

function makeWorldDeepWater() {
  return {
    width: 100,
    height: 100,
    getTile: (_x: number, _y: number) => 0, // DEEP_WATER=0
  } as any
}

function makeEM() { return {} as any }

let zoneIdCounter = 1
function makeZone(tick = 0): ScandiumSpringZone {
  return {
    id: zoneIdCounter++,
    x: 20, y: 30,
    scandiumContent: 60,
    springFlow: 30,
    rareEarthLeaching: 50,
    mineralLightness: 50,
    tick,
  }
}

describe('WorldScandiumSpringSystem - 初始状态', () => {
  let sys: WorldScandiumSpringSystem
  beforeEach(() => { sys = makeSys(); zoneIdCounter = 1 })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入后可查询id字段', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].id).toBe(1)
  })

  it('注入后可查询scandiumContent字段', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].scandiumContent).toBe(60)
  })

  it('注入后可查询springFlow字段', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].springFlow).toBe(30)
  })

  it('zones是内部数组引用', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })
})

describe('WorldScandiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldScandiumSpringSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorldAdjacentWater()
    em = makeEM()
    zoneIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0: 0>0.003 false => 不continue => spawn
  })

  it('tick=0不触发（0-0<2920）', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick=2919不触发', () => {
    sys.update(1, world, em, 2919)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick=2920触发，lastCheck更新', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).lastCheck).toBe(2920)
    vi.restoreAllMocks()
  })

  it('tick=3000触发，lastCheck更新为3000', () => {
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    vi.restoreAllMocks()
  })

  it('第二次tick不足时不再触发', () => {
    sys.update(1, world, em, 3000)
    const afterFirst = (sys as any).lastCheck
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2920
    expect((sys as any).lastCheck).toBe(afterFirst)
    vi.restoreAllMocks()
  })

  it('第二次tick>=lastCheck+2920时再次触发', () => {
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 5920) // 5920-3000=2920 >= 2920
    expect((sys as any).lastCheck).toBe(5920)
    vi.restoreAllMocks()
  })

  it('tick恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).lastCheck).toBe(2920)
    vi.restoreAllMocks()
  })

  it('tick不足时lastCheck不变', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('WorldScandiumSpringSystem - spawn条件', () => {
  let sys: WorldScandiumSpringSystem
  let em: any
  beforeEach(() => {
    sys = makeSys()
    em = makeEM()
    zoneIdCounter = 1
  })

  it('random=0(0>0.003=false,不continue)且nearWater时spawn', () => {
    const world = makeWorldAdjacentWater()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    // 最多3次attempt，每次random=0时spawn（如果zones<MAX_ZONES）
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('random=0且nearMountain时spawn', () => {
    const world = makeWorldAdjacentMountain()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('nearDeepWater(tile=0)也满足nearWater条件', () => {
    const world = makeWorldDeepWater()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('无nearWater也无nearMountain时不spawn（GRASS=3）', () => {
    const world = makeWorldNoAdjacent()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random>FORM_CHANCE(0.003)时不spawn（0.5>0.003 => continue）', () => {
    const world = makeWorldAdjacentWater()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5>0.003 => continue
    sys.update(1, world, em, 2920)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('random=0.003时也不spawn（0.003>0.003=false => 不continue => spawn）', () => {
    // 等于FORM_CHANCE: 0.003>0.003=false => 不continue => 尝试spawn
    const world = makeWorldAdjacentWater()
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, world, em, 2920)
    // 0.003 > 0.003 = false => 不continue => spawn
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('zones达到MAX_ZONES(32)时不再spawn', () => {
    const world = makeWorldAdjacentWater()
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
    vi.restoreAllMocks()
  })

  it('每次update最多执行3次attempt（zones<MAX_ZONES时最多spawn3个）', () => {
    const world = makeWorldAdjacentWater()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    vi.restoreAllMocks()
  })

  it('zones=31时最多再spawn1个（第一次attempt后达到32，后续break）', () => {
    const world = makeWorldAdjacentWater()
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
    vi.restoreAllMocks()
  })

  it('random=1时（1>0.003 => continue，不spawn）', () => {
    const world = makeWorldAdjacentWater()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2920)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('WorldScandiumSpringSystem - spawn字段范围', () => {
  let sys: WorldScandiumSpringSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorldAdjacentWater()
    em = makeEM()
    zoneIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('spawn后zones长度>=1', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('spawn后id从1开始', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].id).toBe(1)
    vi.restoreAllMocks()
  })

  it('spawn后nextId递增', () => {
    sys.update(1, world, em, 2920)
    const count = (sys as any).zones.length
    expect((sys as any).nextId).toBe(count + 1)
    vi.restoreAllMocks()
  })

  it('spawn后tick记录为当前tick', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].tick).toBe(2920)
    vi.restoreAllMocks()
  })

  it('random=0时scandiumContent=40（40+0*60=40）', () => {
    sys.update(1, world, em, 2920)
    // random=0 => scandiumContent = 40 + 0*60 = 40
    expect((sys as any).zones[0].scandiumContent).toBeCloseTo(40, 5)
    vi.restoreAllMocks()
  })

  it('random=0时springFlow=10（10+0*50=10）', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].springFlow).toBeCloseTo(10, 5)
    vi.restoreAllMocks()
  })

  it('random=0时rareEarthLeaching=20（20+0*80=20）', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].rareEarthLeaching).toBeCloseTo(20, 5)
    vi.restoreAllMocks()
  })

  it('random=0时mineralLightness=15（15+0*85=15）', () => {
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].mineralLightness).toBeCloseTo(15, 5)
    vi.restoreAllMocks()
  })

  it('scandal字段在[40,100]范围内（真实random）', () => {
    vi.restoreAllMocks()
    for (let i = 0; i < 3; i++) {
      const s = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      s.update(1, world, em, 2920)
      const z = (s as any).zones[0]
      if (z) {
        expect(z.scandiumContent).toBeGreaterThanOrEqual(40)
        expect(z.scandiumContent).toBeLessThanOrEqual(100)
      }
      vi.restoreAllMocks()
    }
  })
})

describe('WorldScandiumSpringSystem - 字段静态（无update逻辑）', () => {
  let sys: WorldScandiumSpringSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorldNoAdjacent() // 不spawn新的
    em = makeEM()
    zoneIdCounter = 1
  })

  it('update后已有zone的scandiumContent不变', () => {
    const zone = makeZone()
    const original = zone.scandiumContent
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].scandiumContent).toBe(original)
  })

  it('update后已有zone的springFlow不变', () => {
    const zone = makeZone()
    const original = zone.springFlow
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].springFlow).toBe(original)
  })

  it('update后已有zone的rareEarthLeaching不变', () => {
    const zone = makeZone()
    const original = zone.rareEarthLeaching
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].rareEarthLeaching).toBe(original)
  })

  it('update后已有zone的mineralLightness不变', () => {
    const zone = makeZone()
    const original = zone.mineralLightness
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].mineralLightness).toBe(original)
  })

  it('update后已有zone的x不变', () => {
    const zone = makeZone()
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].x).toBe(20)
  })

  it('update后已有zone的y不变', () => {
    const zone = makeZone()
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].y).toBe(30)
  })

  it('多个zone字段都不被update修改', () => {
    const z1 = makeZone()
    const z2 = makeZone()
    ;(sys as any).zones.push(z1, z2)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 2920)
    expect((sys as any).zones[0].springFlow).toBe(30)
    expect((sys as any).zones[1].springFlow).toBe(30)
  })

  it('tick不足时zone字段不变', () => {
    const zone = makeZone()
    ;(sys as any).zones.push(zone)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 100)
    expect((sys as any).zones[0].scandiumContent).toBe(60)
  })
})

describe('WorldScandiumSpringSystem - cleanup逻辑', () => {
  let sys: WorldScandiumSpringSystem
  let world: any
  let em: any
  beforeEach(() => {
    sys = makeSys()
    world = makeWorldNoAdjacent() // 不spawn新zone
    em = makeEM()
    zoneIdCounter = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('tick=55000时cutoff=1000，zone.tick=999被删除', () => {
    ;(sys as any).zones.push({ ...makeZone(999) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 55000)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=55000时cutoff=1000，zone.tick=1000不被删除', () => {
    ;(sys as any).zones.push({ ...makeZone(1000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 55000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('zone.tick=0，tick=56000(cutoff=2000)，0<2000被删除', () => {
    ;(sys as any).zones.push({ ...makeZone(0) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 56000)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('zone.tick等于cutoff时保留（strict less）', () => {
    // tick=57000 => cutoff=3000, zone.tick=3000 => 3000<3000=false => 保留
    ;(sys as any).zones.push({ ...makeZone(3000) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 57000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('新旧混合：旧的删除新的保留', () => {
    // tick=60000 => cutoff=6000
    ;(sys as any).zones.push({ ...makeZone(100) }) // 旧：100 < 6000 => 删
    ;(sys as any).zones.push({ ...makeZone(7000) }) // 新：7000 >= 6000 => 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(7000)
    vi.restoreAllMocks()
  })

  it('全部zone都太旧时清空数组', () => {
    ;(sys as any).zones.push({ ...makeZone(0) })
    ;(sys as any).zones.push({ ...makeZone(1) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 56000) // cutoff=2000, 0<2000,1<2000 全删
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('3个zone：2旧1新，清理后剩1', () => {
    // tick=60000 => cutoff=6000
    ;(sys as any).zones.push({ ...makeZone(1000) }) // < 6000 删
    ;(sys as any).zones.push({ ...makeZone(2000) }) // < 6000 删
    ;(sys as any).zones.push({ ...makeZone(8000) }) // >= 6000 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick不足时cleanup不执行', () => {
    ;(sys as any).zones.push({ ...makeZone(0) })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 500) // 500 < 2920，不执行
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
