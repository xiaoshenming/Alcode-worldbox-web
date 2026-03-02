import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSinkholePlainSystem } from '../systems/WorldSinkholePlainSystem'
import type { SinkholePlain } from '../systems/WorldSinkholePlainSystem'

// CHECK_INTERVAL=2700, FORM_CHANCE=0.002, MAX_PLAINS=22
// tile条件: GRASS(3) || FOREST(4)
// cleanup: tick < (currentTick - 90000)
// radius: 3+floor(random*5), depth: 5+random*25
// waterLevel: random*40, collapseRisk: 5+random*30, vegetationRing: 10+random*40
// update: depth=min(50,d+0.002), waterLevel=max(0,min(d*0.8,wl+(rand-0.45)*0.3))
// collapseRisk=max(1,min(60,cr+(rand-0.5)*0.1)), vegetationRing=min(80,vr+0.01)

function makeSys(): WorldSinkholePlainSystem { return new WorldSinkholePlainSystem() }

function makeWorld(tile: number = 3, w = 200, h = 200) {
  return { width: w, height: h, getTile: (_x: number, _y: number) => tile } as any
}

function makeEM() { return {} as any }

let nextId = 1
function makePlain(overrides: Partial<SinkholePlain> = {}): SinkholePlain {
  return {
    id: nextId++,
    x: 20, y: 30,
    radius: 5,
    depth: 10,
    waterLevel: 3,
    collapseRisk: 20,
    vegetationRing: 30,
    tick: 0,
    ...overrides
  }
}

// ===== describe 1: 初始状态 =====
describe('WorldSinkholePlainSystem - 初始状态', () => {
  let sys: WorldSinkholePlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始plains为空数组', () => {
    expect((sys as any).plains).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('plains是Array实例', () => {
    expect(Array.isArray((sys as any).plains)).toBe(true)
  })

  it('不同实例互不干扰', () => {
    const sys2 = makeSys()
    ;(sys as any).plains.push(makePlain())
    expect((sys2 as any).plains).toHaveLength(0)
  })

  it('手动注入一个平原后长度为1', () => {
    ;(sys as any).plains.push(makePlain())
    expect((sys as any).plains).toHaveLength(1)
  })

  it('手动注入多个平原', () => {
    ;(sys as any).plains.push(makePlain(), makePlain(), makePlain())
    expect((sys as any).plains).toHaveLength(3)
  })

  it('plains引用稳定', () => {
    const ref = (sys as any).plains
    expect(ref).toBe((sys as any).plains)
  })
})

// ===== describe 2: CHECK_INTERVAL节流 =====
describe('WorldSinkholePlainSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSinkholePlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时执行(lastCheck=0,diff=0,不满足<)', () => {
    sys.update(1, makeWorld(3), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick<2700时不执行', () => {
    sys.update(1, makeWorld(3), makeEM(), 2699)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2700时执行', () => {
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('tick=2701时执行', () => {
    sys.update(1, makeWorld(3), makeEM(), 2701)
    expect((sys as any).lastCheck).toBe(2701)
  })

  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, makeWorld(3), makeEM(), 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第一次执行后需再过2700tick才执行第二次', () => {
    sys.update(1, makeWorld(3), makeEM(), 2700)
    sys.update(1, makeWorld(3), makeEM(), 5000)
    expect((sys as any).lastCheck).toBe(2700)
  })

  it('差值恰好=2700时执行第二次', () => {
    sys.update(1, makeWorld(3), makeEM(), 2700)
    sys.update(1, makeWorld(3), makeEM(), 5400)
    expect((sys as any).lastCheck).toBe(5400)
  })

  it('大tick直接跳跃也能执行', () => {
    sys.update(1, makeWorld(3), makeEM(), 999999)
    expect((sys as any).lastCheck).toBe(999999)
  })
})

// ===== describe 3: spawn逻辑 =====
describe('WorldSinkholePlainSystem - spawn逻辑', () => {
  let sys: WorldSinkholePlainSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('random<0.002时在GRASS(3)上spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.002时在FOREST(4)上spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), makeEM(), 2700)
    expect((sys as any).plains.length).toBeGreaterThanOrEqual(1)
  })

  it('random>=0.002时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('tile=SAND(2)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('已达MAX_PLAINS(22)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 22; i++) (sys as any).plains.push(makePlain())
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(22)
  })

  it('21个时仍可spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 21; i++) (sys as any).plains.push(makePlain())
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains.length).toBeGreaterThanOrEqual(22)
  })
})

// ===== describe 4: spawn字段范围 =====
describe('WorldSinkholePlainSystem - spawn字段范围', () => {
  let sys: WorldSinkholePlainSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('新spawn的id从1开始', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.id).toBe(1)
  })

  it('nextId在spawn后递增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).nextId).toBe(2)
  })

  it('radius>=3(spawn时3+floor(random*5))', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.radius).toBeGreaterThanOrEqual(3)
  })

  it('radius<=7(spawn时3+floor(0.99*5)=7)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.radius).toBeLessThanOrEqual(7)
  })

  it('depth>=5(spawn时5+random*25)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.depth).toBeGreaterThanOrEqual(5)
  })

  it('waterLevel>=0(spawn时random*40)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.waterLevel).toBeGreaterThanOrEqual(0)
  })

  it('tick字段等于当前tick', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.tick).toBe(2700)
  })

  it('collapseRisk>=1(spawn时5+random*30,update后下界1)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    // update在同帧执行，collapseRisk可能略低于spawn值，但下界为1
    expect(p.collapseRisk).toBeGreaterThanOrEqual(1)
  })

  it('vegetationRing>=10(spawn时10+random*40)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    expect(p.vegetationRing).toBeGreaterThanOrEqual(10)
  })
})

// ===== describe 5: update数值逻辑 =====
describe('WorldSinkholePlainSystem - update数值逻辑', () => {
  let sys: WorldSinkholePlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('depth每次+0.002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ depth: 10, waterLevel: 3, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.depth).toBeCloseTo(10 + 0.002, 8)
  })

  it('depth不超过上限50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ depth: 49.999, waterLevel: 3, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.depth).toBeLessThanOrEqual(50)
  })

  it('vegetationRing每次+0.01', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ vegetationRing: 30, depth: 10, waterLevel: 3, collapseRisk: 20 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.vegetationRing).toBeCloseTo(30 + 0.01, 8)
  })

  it('vegetationRing不超过上限80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ vegetationRing: 79.999, depth: 10, waterLevel: 3, collapseRisk: 20 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.vegetationRing).toBeLessThanOrEqual(80)
  })

  it('waterLevel不超过depth*0.8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const p = makePlain({ waterLevel: 9, depth: 10, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.waterLevel).toBeLessThanOrEqual(p.depth * 0.8 + 0.001)
  })

  it('waterLevel不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const p = makePlain({ waterLevel: 0, depth: 10, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.waterLevel).toBeGreaterThanOrEqual(0)
  })

  it('collapseRisk不超过上限60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const p = makePlain({ collapseRisk: 59.99, depth: 10, waterLevel: 3, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.collapseRisk).toBeLessThanOrEqual(60)
  })

  it('collapseRisk不低于下限1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const p = makePlain({ collapseRisk: 1.01, depth: 10, waterLevel: 3, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.collapseRisk).toBeGreaterThanOrEqual(1)
  })

  it('多个平原全部被update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p1 = makePlain({ depth: 10, waterLevel: 3, collapseRisk: 20, vegetationRing: 30 })
    const p2 = makePlain({ depth: 20, waterLevel: 5, collapseRisk: 30, vegetationRing: 40 })
    ;(sys as any).plains.push(p1, p2)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p1.depth).toBeCloseTo(10 + 0.002, 8)
    expect(p2.depth).toBeCloseTo(20 + 0.002, 8)
  })

  it('节流期间不更新depth', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ depth: 10, waterLevel: 3, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700) // executes
    const depthAfter = p.depth
    sys.update(1, makeWorld(3), makeEM(), 4000) // skipped
    expect(p.depth).toBe(depthAfter)
  })
})

// ===== describe 6: cleanup逻辑 =====
describe('WorldSinkholePlainSystem - cleanup逻辑', () => {
  let sys: WorldSinkholePlainSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff(=currentTick-90000)时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ tick: 0 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 90001)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('tick=cutoff时不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ tick: 0 })
    ;(sys as any).plains.push(p)
    // currentTick=90000, cutoff=90000-90000=0, p.tick=0, 0<0 false -> kept
    sys.update(1, makeWorld(3), makeEM(), 90000)
    expect((sys as any).plains).toHaveLength(1)
  })

  it('tick=cutoff+1时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ tick: 0 })
    ;(sys as any).plains.push(p)
    // cutoff=90001-90000=1, p.tick=0 < 1 -> removed
    sys.update(1, makeWorld(3), makeEM(), 90001)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('新spawn平原不会被cleanup', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains.length).toBeGreaterThanOrEqual(1)
  })

  it('只清除过期的保留新鲜的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const old = makePlain({ tick: 0 })
    const fresh = makePlain({ tick: 200000 })
    ;(sys as any).plains.push(old, fresh)
    // currentTick=200000, cutoff=200000-90000=110000
    // old.tick=0 < 110000 -> removed; fresh.tick=200000 >= 110000 -> kept
    sys.update(1, makeWorld(3), makeEM(), 200000)
    expect((sys as any).plains).toHaveLength(1)
    expect((sys as any).plains[0].tick).toBe(200000)
  })

  it('多个过期平原全部清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 5; i++) (sys as any).plains.push(makePlain({ tick: i }))
    sys.update(1, makeWorld(3), makeEM(), 200000)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('清除后nextId不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const idAfterSpawn = (sys as any).nextId
    ;(sys as any).plains.forEach((p: SinkholePlain) => { p.tick = 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.002 -> no spawn
    sys.update(1, makeWorld(3), makeEM(), 100000)
    expect((sys as any).nextId).toBe(idAfterSpawn)
  })

  it('混合新旧平原时仅删除旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p1 = makePlain({ tick: 1000 })
    const p2 = makePlain({ tick: 200000 })
    const p3 = makePlain({ tick: 5000 })
    ;(sys as any).plains.push(p1, p2, p3)
    // cutoff=200000-90000=110000
    sys.update(1, makeWorld(3), makeEM(), 200000)
    expect((sys as any).plains).toHaveLength(1)
    expect((sys as any).plains[0].id).toBe(p2.id)
  })
})

// ===== describe 7: 边界与综合场景 =====
describe('WorldSinkholePlainSystem - 边界与综合场景', () => {
  let sys: WorldSinkholePlainSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('LAVA(7)上不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(7), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('SNOW(6)上不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('SAND(2)上不spawn(只允许GRASS/FOREST)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(0)
  })

  it('世界极小时x/y坐标合法', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3, 25, 25)
    sys.update(1, makeWorld(3, 25, 25), makeEM(), 2700)
    const p = (sys as any).plains[0]
    if (p) {
      expect(p.x).toBeGreaterThanOrEqual(10)
      expect(p.y).toBeGreaterThanOrEqual(10)
    }
  })

  it('radius是整数(使用Math.floor)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    if (p) {
      expect(p.radius).toBe(Math.floor(p.radius))
    }
  })

  it('vegetationRing上界约束在80', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ vegetationRing: 80, depth: 10, waterLevel: 3, collapseRisk: 20 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.vegetationRing).toBeLessThanOrEqual(80)
  })

  it('depth上界约束在50', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const p = makePlain({ depth: 50, waterLevel: 3, collapseRisk: 20, vegetationRing: 30 })
    ;(sys as any).plains.push(p)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect(p.depth).toBeLessThanOrEqual(50)
  })

  it('spawn后平原字段均不为undefined', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2700)
    const p = (sys as any).plains[0]
    if (p) {
      expect(p.id).toBeDefined()
      expect(p.x).toBeDefined()
      expect(p.radius).toBeDefined()
      expect(p.collapseRisk).toBeDefined()
      expect(p.vegetationRing).toBeDefined()
    }
  })

  it('MAX_PLAINS=22: 恰好22个时不新增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 22; i++) (sys as any).plains.push(makePlain())
    sys.update(1, makeWorld(3), makeEM(), 2700)
    expect((sys as any).plains).toHaveLength(22)
  })
})
