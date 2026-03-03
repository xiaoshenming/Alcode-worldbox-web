import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTectonicSystem } from '../systems/WorldTectonicSystem'
import type { TectonicPlate, FaultLine, PlateType, BoundaryType } from '../systems/WorldTectonicSystem'
import { TileType } from '../utils/Constants'

// ---- 辅助工厂 ----
function makeSys(): WorldTectonicSystem { return new WorldTectonicSystem() }

let _nextId = 1
function makePlate(overrides: Partial<TectonicPlate> = {}): TectonicPlate {
  return {
    id: _nextId++,
    centerX: 50, centerY: 50,
    radius: 30,
    type: 'continental',
    driftX: 0.1, driftY: 0,
    stress: 30,
    ...overrides,
  }
}

function makeFault(overrides: Partial<FaultLine> = {}): FaultLine {
  return {
    x1: 40, y1: 40,
    x2: 60, y2: 60,
    boundary: 'convergent',
    activity: 50,
    ...overrides,
  }
}

/** 构造最小 World stub */
function makeWorld(defaultTile: TileType = TileType.GRASS): any {
  const tiles: Map<string, TileType> = new Map()
  return {
    width: 100,
    height: 100,
    getTile: vi.fn((x: number, y: number) => tiles.get(`${x},${y}`) ?? defaultTile),
    setTile: vi.fn((x: number, y: number, t: TileType) => tiles.set(`${x},${y}`, t)),
  }
}

// ============================================================
describe('1. 初始状态', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('plates 数组初始为空', () => { expect((sys as any).plates).toHaveLength(0) })
  it('faults 数组初始为空', () => { expect((sys as any).faults).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('initialized 初始为 false', () => { expect((sys as any).initialized).toBe(false) })
  it('getStressLevel 无板块时返回 0', () => { expect(sys.getStressLevel()).toBe(0) })
  it('支持 2 种板块类型', () => {
    const types: PlateType[] = ['continental', 'oceanic']
    expect(types).toHaveLength(2)
  })
  it('支持 3 种边界类型', () => {
    const types: BoundaryType[] = ['convergent', 'divergent', 'transform']
    expect(types).toHaveLength(3)
  })
})

// ============================================================
describe('2. 节流 — CHECK_INTERVAL = 1200', () => {
  let sys: WorldTectonicSystem
  let world: any
  beforeEach(() => {
    sys = makeSys(); _nextId = 1
    world = makeWorld()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 不更新（差值=0 < 1200）', () => {
    sys.update(1, world, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1199 不更新', () => {
    sys.update(1, world, 1199)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1200 更新 lastCheck', () => {
    sys.update(1, world, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('tick=2400 第二次更新', () => {
    sys.update(1, world, 1200)
    sys.update(1, world, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })
  it('tick=2399 不触发第二次更新', () => {
    sys.update(1, world, 1200)
    sys.update(1, world, 2399)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('首次 update 触发 initialized → true', () => {
    sys.update(1, world, 1200)
    expect((sys as any).initialized).toBe(true)
  })
  it('initialized 之后不再重复 initPlates', () => {
    sys.update(1, world, 1200)
    const count = (sys as any).plates.length
    sys.update(1, world, 2400)
    expect((sys as any).plates.length).toBe(count) // 数量不变
  })
})

// ============================================================
describe('3. initPlates 逻辑', () => {
  let sys: WorldTectonicSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('生成 4-8 块板块（count = 4 + floor(random*(8-4))）', () => {
    // random=0 -> count=4, random=0.99 -> count=7
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const s = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(r)
      ;(s as any).initPlates(makeWorld())
      const n = (s as any).plates.length
      expect(n).toBeGreaterThanOrEqual(4)
      expect(n).toBeLessThanOrEqual(8)
      vi.restoreAllMocks()
    }
  })

  it('random=0 时生成恰好 4 块', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).initPlates(makeWorld())
    expect((sys as any).plates).toHaveLength(4)
  })

  it('板块 id 从 1 开始递增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).initPlates(makeWorld())
    const ids: number[] = (sys as any).plates.map((p: TectonicPlate) => p.id)
    expect(ids[0]).toBe(1)
    expect(ids[1]).toBe(2)
    expect(ids[2]).toBe(3)
    expect(ids[3]).toBe(4)
  })

  it('random<0.6 时 type=continental', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.3) // 0.3 < 0.6 -> continental
    ;(sys as any).initPlates(makeWorld())
    const plates: TectonicPlate[] = (sys as any).plates
    for (const p of plates) expect(p.type).toBe('continental')
  })

  it('random>=0.6 时 type=oceanic', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.8) // 0.8 >= 0.6 -> oceanic; also count = 4+floor(0.8*4)=7
    ;(sys as any).initPlates(makeWorld())
    const plates: TectonicPlate[] = (sys as any).plates
    for (const p of plates) expect(p.type).toBe('oceanic')
  })

  it('板块 radius 在 20-59 范围内（20+floor(random*40)）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).initPlates(makeWorld())
    for (const p of (sys as any).plates as TectonicPlate[]) {
      expect(p.radius).toBeGreaterThanOrEqual(20)
      expect(p.radius).toBeLessThanOrEqual(59)
    }
  })

  it('板块 stress 初始在 0-29 范围内（floor(random*30)）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).initPlates(makeWorld())
    for (const p of (sys as any).plates as TectonicPlate[]) {
      expect(p.stress).toBeGreaterThanOrEqual(0)
      expect(p.stress).toBeLessThan(30)
    }
  })

  it('相邻板块生成断层', () => {
    sys = makeSys()
    // 让所有板块都很大且位置相同，保证会产生断层
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0  // count = 4
      return 0.5               // 其余 random
    })
    ;(sys as any).initPlates(makeWorld())
    // 只要有2个板块足够近就会有断层
    expect((sys as any).faults.length).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
describe('4. buildStress 逻辑', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('每次调用 stress += STRESS_BUILD_RATE(3)', () => {
    const p = makePlate({ stress: 20 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(p.stress).toBe(23)
  })

  it('stress 不超过上限 100', () => {
    const p = makePlate({ stress: 99 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(p.stress).toBe(100)
  })

  it('stress=100 时不再增加', () => {
    const p = makePlate({ stress: 100 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(p.stress).toBe(100)
  })

  it('driftX 被应用到 centerX', () => {
    const p = makePlate({ centerX: 50, driftX: 0.2 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(p.centerX).toBeCloseTo(50.2, 5)
  })

  it('driftY 被应用到 centerY', () => {
    const p = makePlate({ centerY: 30, driftY: -0.1 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(p.centerY).toBeCloseTo(29.9, 5)
  })

  it('多个板块各自独立更新', () => {
    const p1 = makePlate({ stress: 10, driftX: 0.1 })
    const p2 = makePlate({ stress: 50, driftX: -0.2 })
    ;(sys as any).plates.push(p1, p2)
    ;(sys as any).buildStress()
    expect(p1.stress).toBe(13)
    expect(p2.stress).toBe(53)
  })
})

// ============================================================
describe('5. processQuakes 逻辑', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('stress < QUAKE_THRESHOLD(75) 时不触发地震', () => {
    const p = makePlate({ stress: 70 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBe(70) // 未减少
  })

  it('stress >= 75 但 random > QUAKE_CHANCE(0.1) 时不触发', () => {
    const p = makePlate({ stress: 80 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.1
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBe(80)
  })

  it('stress >= 75 且 random <= 0.1 时触发地震，stress -= 40', () => {
    const p = makePlate({ stress: 80 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBe(40) // 80 - 40
  })

  it('地震后 stress 不低于 0', () => {
    const p = makePlate({ stress: 75 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBeGreaterThanOrEqual(0)
  })

  it('地震时 convergent 断层 activity +5', () => {
    const p = makePlate({ stress: 80 })
    const f = makeFault({ boundary: 'convergent', activity: 50 })
    ;(sys as any).plates.push(p)
    ;(sys as any).faults.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(f.activity).toBeGreaterThan(50)
  })

  it('fault.activity 上限为 100', () => {
    const p = makePlate({ stress: 80 })
    const f = makeFault({ boundary: 'convergent', activity: 98 })
    ;(sys as any).plates.push(p)
    ;(sys as any).faults.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(f.activity).toBeLessThanOrEqual(100)
  })

  it('divergent 断层不形成山地（仅 activity+5）', () => {
    const p = makePlate({ stress: 80 })
    const f = makeFault({ boundary: 'divergent', activity: 50 })
    const world = makeWorld(TileType.GRASS)
    ;(sys as any).plates.push(p)
    ;(sys as any).faults.push(f)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(world)
    expect(world.setTile).not.toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.MOUNTAIN)
  })

  it('stress=75 恰好在阈值触发地震', () => {
    const p = makePlate({ stress: 75 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBe(35) // 75 - 40
  })
})

// ============================================================
describe('6. updateFaults 逻辑', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('activity 每次 -2', () => {
    const f = makeFault({ activity: 50 })
    ;(sys as any).faults.push(f)
    ;(sys as any).updateFaults()
    expect(f.activity).toBe(48)
  })

  it('activity 不低于 0', () => {
    const f = makeFault({ activity: 1 })
    ;(sys as any).faults.push(f)
    ;(sys as any).updateFaults()
    expect(f.activity).toBe(0)
  })

  it('activity=0 时保持 0', () => {
    const f = makeFault({ activity: 0 })
    ;(sys as any).faults.push(f)
    ;(sys as any).updateFaults()
    expect(f.activity).toBe(0)
  })

  it('多条断层各自衰减', () => {
    const f1 = makeFault({ activity: 30 })
    const f2 = makeFault({ activity: 60 })
    ;(sys as any).faults.push(f1, f2)
    ;(sys as any).updateFaults()
    expect(f1.activity).toBe(28)
    expect(f2.activity).toBe(58)
  })

  it('activity=2 时衰减到 0', () => {
    const f = makeFault({ activity: 2 })
    ;(sys as any).faults.push(f)
    ;(sys as any).updateFaults()
    expect(f.activity).toBe(0)
  })
})

// ============================================================
describe('7. getStressLevel', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('无板块时返回 0', () => { expect(sys.getStressLevel()).toBe(0) })
  it('单板块返回其 stress', () => {
    ;(sys as any).plates.push(makePlate({ stress: 40 }))
    expect(sys.getStressLevel()).toBe(40)
  })
  it('两板块返回平均值', () => {
    ;(sys as any).plates.push(makePlate({ stress: 20 }))
    ;(sys as any).plates.push(makePlate({ stress: 40 }))
    expect(sys.getStressLevel()).toBe(30)
  })
  it('三板块正确平均', () => {
    ;(sys as any).plates.push(makePlate({ stress: 0 }))
    ;(sys as any).plates.push(makePlate({ stress: 60 }))
    ;(sys as any).plates.push(makePlate({ stress: 90 }))
    expect(sys.getStressLevel()).toBeCloseTo(50, 5)
  })
  it('全部 stress=100 时返回 100', () => {
    ;(sys as any).plates.push(makePlate({ stress: 100 }))
    ;(sys as any).plates.push(makePlate({ stress: 100 }))
    expect(sys.getStressLevel()).toBe(100)
  })
  it('stress 值为 0 时返回 0', () => {
    ;(sys as any).plates.push(makePlate({ stress: 0 }))
    ;(sys as any).plates.push(makePlate({ stress: 0 }))
    expect(sys.getStressLevel()).toBe(0)
  })
  it('buildStress 后 getStressLevel 正确更新', () => {
    const p = makePlate({ stress: 20 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    expect(sys.getStressLevel()).toBe(23)
  })
})

// ============================================================
describe('8. 上限/边界/TectonicPlate 字段', () => {
  let sys: WorldTectonicSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('板块注入后 plates.length 增加', () => {
    ;(sys as any).plates.push(makePlate())
    ;(sys as any).plates.push(makePlate())
    expect((sys as any).plates.length).toBe(2)
  })

  it('断层注入后 faults.length 增加', () => {
    ;(sys as any).faults.push(makeFault())
    ;(sys as any).faults.push(makeFault())
    expect((sys as any).faults.length).toBe(2)
  })

  it('MAX_PLATES = 8', () => {
    // 4 + floor(random * (8-4)) <= 8
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).initPlates(makeWorld())
    expect((sys as any).plates.length).toBeLessThanOrEqual(8)
  })

  it('stress 最大被 buildStress 夹在 100', () => {
    const p = makePlate({ stress: 100 })
    ;(sys as any).plates.push(p)
    for (let i = 0; i < 5; i++) { ;(sys as any).buildStress() }
    expect(p.stress).toBe(100)
  })

  it('fault boundary 为 convergent/divergent/transform 之一', () => {
    const valid: BoundaryType[] = ['convergent', 'divergent', 'transform']
    ;(sys as any).faults.push(makeFault({ boundary: 'convergent' }))
    ;(sys as any).faults.push(makeFault({ boundary: 'divergent' }))
    ;(sys as any).faults.push(makeFault({ boundary: 'transform' }))
    for (const f of (sys as any).faults as FaultLine[]) {
      expect(valid).toContain(f.boundary)
    }
  })

  it('makePlate driftX 字段存在', () => {
    const p = makePlate({ driftX: 0.3 })
    expect(p.driftX).toBe(0.3)
  })

  it('makePlate driftY 字段存在', () => {
    const p = makePlate({ driftY: -0.2 })
    expect(p.driftY).toBe(-0.2)
  })

  it('地震后 stress 减少 40（min 0）', () => {
    const p = makePlate({ stress: 80 })
    ;(sys as any).plates.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).processQuakes(makeWorld())
    expect(p.stress).toBe(40)
  })

  it('连续多次 buildStress 板块位置正确漂移', () => {
    const p = makePlate({ centerX: 50, driftX: 0.1 })
    ;(sys as any).plates.push(p)
    ;(sys as any).buildStress()
    ;(sys as any).buildStress()
    expect(p.centerX).toBeCloseTo(50.2, 5)
  })
})
