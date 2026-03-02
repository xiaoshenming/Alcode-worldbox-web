import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRubidiumSpringSystem } from '../systems/WorldRubidiumSpringSystem'
import type { RubidiumSpringZone } from '../systems/WorldRubidiumSpringSystem'

// CHECK_INTERVAL=3140, FORM_CHANCE=0.003, MAX_ZONES=32
// per update: up to 3 attempts; each attempt:
//   nearWater = hasAdjacentTile(SHALLOW_WATER=1 or DEEP_WATER=0)
//   nearMountain = hasAdjacentTile(MOUNTAIN=5)
//   if (!nearWater && !nearMountain) continue
//   if (Math.random() > FORM_CHANCE) continue   ← strict >, so =0.003 => 0.003>0.003=false => spawns
//   spawn
// fields: rubidiumContent: 40+rand*60, springFlow: 10+rand*50
//         lepidoliteWeathering: 20+rand*80, alkaliMetalConcentration: 15+rand*85
// NO field updates in update phase (static after spawn)
// cleanup: zone.tick < (currentTick - 54000) => strict <

const CHECK_INTERVAL = 3140
const MAX_ZONES = 32

function makeSys(): WorldRubidiumSpringSystem { return new WorldRubidiumSpringSystem() }

let nextId = 1

function makeZone(overrides: Partial<RubidiumSpringZone> = {}): RubidiumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    rubidiumContent: 70,
    springFlow: 35,
    lepidoliteWeathering: 60,
    alkaliMetalConcentration: 57,
    tick: 0,
    ...overrides
  }
}

// world mock that returns adjacent tile = SHALLOW_WATER(1) for all neighbors
// hasAdjacentTile checks neighbors (dx,dy) != (0,0); needs getTile to return matching tileType
function makeWorld(adjacentTileValue: number = 1): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(adjacentTileValue)
  }
}

// world with no adjacent qualifying tiles (returns -1 for everything)
function makeWorldNoAdj(): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(-1)
  }
}

function makeEM(): any { return {} }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - 初始状态', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一个zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入多个zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })

  it('zone字段rubidiumContent正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].rubidiumContent).toBe(70)
  })

  it('zone字段springFlow正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].springFlow).toBe(35)
  })

  it('zone字段alkaliMetalConcentration正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].alkaliMetalConcentration).toBe(57)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（0-0=0<3140）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3139时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3139)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3140时触发（3140-0=3140不<3140）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).lastCheck).toBe(3140)
  })

  it('触发后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })

  it('连续调用：第二次需再过3140才触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    sys.update(1, makeWorld(1), makeEM(), 6279)
    expect((sys as any).lastCheck).toBe(3140)
    sys.update(1, makeWorld(1), makeEM(), 6280)
    expect((sys as any).lastCheck).toBe(6280)
  })

  it('未达阈值时zones不变（无adjacent tile情况下）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNoAdj(), makeEM(), 3139)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('大tick值正常触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 500000)
    expect((sys as any).lastCheck).toBe(500000)
  })

  it('等于CHECK_INTERVAL时触发（边界值）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).lastCheck).toBe(3140)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - spawn条件', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('邻近SHALLOW_WATER(1)时可spawn（rand=0<0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('邻近DEEP_WATER(0)时可spawn（rand=0<0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(0), makeEM(), 3140)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('邻近MOUNTAIN(5)时可spawn（rand=0<0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEM(), 3140)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('无邻近水/山时不spawn（continue跳过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorldNoAdj(), makeEM(), 3140)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('Math.random>FORM_CHANCE(0.003)时不spawn（0.004>0.003=true => continue）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.004)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('Math.random=FORM_CHANCE(0.003)时spawn（0.003>0.003=false => 不skip）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    // 0.003 is not > 0.003, so it spawns
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('zones达到MAX_ZONES时不再spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones=MAX_ZONES-1时仍可spawn（最多3次尝试，第一次成功）', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - spawn字段范围', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn后tick等于传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones[0].tick).toBe(3140)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones[0].id).toBe(1)
  })

  it('rubidiumContent范围在40~100之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.rubidiumContent).toBeGreaterThanOrEqual(40)
    expect(z.rubidiumContent).toBeLessThanOrEqual(100)
  })

  it('springFlow范围在10~60之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })

  it('lepidoliteWeathering范围在20~100之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.lepidoliteWeathering).toBeGreaterThanOrEqual(20)
    expect(z.lepidoliteWeathering).toBeLessThanOrEqual(100)
  })

  it('alkaliMetalConcentration范围在15~100之间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.alkaliMetalConcentration).toBeGreaterThanOrEqual(15)
    expect(z.alkaliMetalConcentration).toBeLessThanOrEqual(100)
  })

  it('spawn后字段不被update修改（Spring系统无update逻辑）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z0 = (sys as any).zones[0]
    const rc = z0.rubidiumContent
    const sf = z0.springFlow
    const lw = z0.lepidoliteWeathering
    const ac = z0.alkaliMetalConcentration
    // trigger again at next interval; use high rand so no new spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 6280)
    const z1 = (sys as any).zones[0]
    expect(z1.rubidiumContent).toBe(rc)
    expect(z1.springFlow).toBe(sf)
    expect(z1.lepidoliteWeathering).toBe(lw)
    expect(z1.alkaliMetalConcentration).toBe(ac)
  })

  it('x坐标在world范围内(0~99)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(100)
  })

  it('y坐标在world范围内(0~99)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    const z = (sys as any).zones[0]
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(100)
  })
})

// ─────────────────────────────────────────────
// 5. 静态字段验证（Spring系统无update数值逻辑）
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - 静态字段验证', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入zone后多次update字段不变（rubidiumContent）', () => {
    ;(sys as any).zones.push(makeZone({ rubidiumContent: 80, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    sys.update(1, makeWorld(1), makeEM(), 16280)
    expect((sys as any).zones[0].rubidiumContent).toBe(80)
  })

  it('注入zone后多次update字段不变（springFlow）', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].springFlow).toBe(45)
  })

  it('注入zone后多次update字段不变（lepidoliteWeathering）', () => {
    ;(sys as any).zones.push(makeZone({ lepidoliteWeathering: 55, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].lepidoliteWeathering).toBe(55)
  })

  it('注入zone后多次update字段不变（alkaliMetalConcentration）', () => {
    ;(sys as any).zones.push(makeZone({ alkaliMetalConcentration: 70, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].alkaliMetalConcentration).toBe(70)
  })

  it('注入zone后x/y不被update修改', () => {
    ;(sys as any).zones.push(makeZone({ x: 42, y: 58, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].x).toBe(42)
    expect((sys as any).zones[0].y).toBe(58)
  })

  it('rand=0.5>0.003时不spawn，zones数量不增加', () => {
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    // 0.5 > 0.003 => continue, no spawn added
    expect((sys as any).zones).toHaveLength(1)
  })

  it('tick字段spawn后不变', () => {
    ;(sys as any).zones.push(makeZone({ tick: 9999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].tick).toBe(9999)
  })

  it('id字段spawn后不变', () => {
    ;(sys as any).zones.push(makeZone({ id: 42, tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 13140)
    expect((sys as any).zones[0].id).toBe(42)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldRubidiumSpringSystem - cleanup逻辑', () => {
  let sys: WorldRubidiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // cutoff = tick - 54000; 删除条件: zone.tick < cutoff（严格<，等于保留）

  it('zone.tick=0，currentTick=54001时删除（cutoff=1，0<1）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick=0，currentTick=54000时cutoff=0，0<0为false，保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 54000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick=2000，currentTick=56000时cutoff=2000，保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 56000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick=2000，currentTick=56001时删除（cutoff=2001，2000<2001）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 56001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('新spawn的zone不会被立即删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 3140)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('混合新旧zone时只删旧的', () => {
    // cutoff = 200002 - 54000 = 146002
    // tick=0 < 146002 => deleted
    // tick=200001 < 146002? No (200001 > 146002) => kept
    ;(sys as any).zones.push(
      makeZone({ tick: 0 }),
      makeZone({ tick: 200001 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 200002)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(200001)
  })

  it('所有zone过期时数组清空', () => {
    ;(sys as any).zones.push(
      makeZone({ tick: 0 }),
      makeZone({ tick: 1 }),
      makeZone({ tick: 2 })
    )
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 54003)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn在cleanup之前执行，MAX_ZONES满时不spawn再清空', () => {
    // Rubidium: spawn first, then cleanup
    // zones=32 (full): spawn loop hits break immediately (length >= MAX_ZONES)
    // then cleanup removes all 32 => 0 remaining
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1), makeEM(), 54001)
    expect((sys as any).zones).toHaveLength(0)
  })
})
