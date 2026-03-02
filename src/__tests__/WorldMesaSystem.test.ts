import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMesaSystem } from '../systems/WorldMesaSystem'
import type { Mesa } from '../systems/WorldMesaSystem'

// CHECK_INTERVAL=2800, MAX_MESAS=15, FORM_CHANCE=0.0018
// spawn tile: MOUNTAIN(5) or SAND(2)
// cleanup: mesa.tick < tick - 96000

function makeSys(): WorldMesaSystem { return new WorldMesaSystem() }

let nextId = 1
function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: nextId++,
    x: 50, y: 50,
    radius: 6,
    elevation: 80,
    capRockThickness: 20,
    erosionRate: 10,
    plateauArea: 30,
    stratification: 5,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = 5, w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
  } as any
}

const em = {} as any

// ─────────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────────
describe('WorldMesaSystem 初始状态', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 mesas 数组为空', () => {
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入一条后 length 为 1', () => {
    ;(sys as any).mesas.push(makeMesa())
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('mesas 返回同一内部引用', () => {
    const ref = (sys as any).mesas
    expect(ref).toBe((sys as any).mesas)
  })

  it('Mesa 接口必需字段均存在', () => {
    const m = makeMesa()
    const keys = ['id','x','y','radius','elevation','capRockThickness','erosionRate','plateauArea','stratification','tick']
    for (const k of keys) expect(m).toHaveProperty(k)
  })

  it('多个台地全部保留', () => {
    ;(sys as any).mesas.push(makeMesa(), makeMesa())
    expect((sys as any).mesas).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────
describe('WorldMesaSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=2799 时不执行，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 2799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2800 时执行，lastCheck 更新为 2800', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // skip spawn
    sys.update(0, makeWorld(), em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('tick=2801 时执行，lastCheck 更新为 2801', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2801)
    expect((sys as any).lastCheck).toBe(2801)
  })

  it('tick=0 时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('第二次 tick < lastCheck+2800 时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2800)   // lastCheck=2800
    sys.update(0, makeWorld(), em, 5599)   // 5599-2800=2799 < 2800, skip
    expect((sys as any).lastCheck).toBe(2800)
  })

  it('第二次 tick = lastCheck+2800 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeWorld(), em, 2800)
    sys.update(0, makeWorld(), em, 5600)   // 5600-2800=2800, execute
    expect((sys as any).lastCheck).toBe(5600)
  })
})

// ─────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────
describe('WorldMesaSystem spawn 条件', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('Math.random > FORM_CHANCE(0.0018) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(0, makeWorld(5), em, 2800)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(3), em, 2800)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(0), em, 2800)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1) 时不 spawn', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(1), em, 2800)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5) 时 spawn 成功', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(5), em, 2800)
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('tile=SAND(2) 时 spawn 成功', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 0.001 : 0.5)
    sys.update(0, makeWorld(2), em, 2800)
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('mesas=MAX_MESAS(15) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 15; i++) (sys as any).mesas.push(makeMesa())
    sys.update(0, makeWorld(5), em, 2800)
    expect((sys as any).mesas).toHaveLength(15)
  })

  it('Math.random = FORM_CHANCE(0.0018) 时 spawn（< 边界）', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = call++
      if (v === 0) return 0.0018   // NOT < 0.0018 => skip
      return 0.5
    })
    sys.update(0, makeWorld(5), em, 2800)
    // 0.0018 is NOT < 0.0018, so no spawn
    expect((sys as any).mesas).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────────
describe('WorldMesaSystem spawn 字段范围', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnMesa(seq: number[]): Mesa {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = seq[call] ?? 0.5
      call++
      return v
    })
    sys.update(0, makeWorld(5), em, 2800)
    return (sys as any).mesas[0] as Mesa
  }

  it('spawn 后 id 为 1', () => {
    // seq: [FORM_CHANCE, x, y, radius, elevation, capRock, erosionRate, plateauArea, stratification]
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(m.id).toBe(1)
  })

  it('spawn 后 radius 在 4-8 (4+floor(random*5))', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    // After update, erosionRate changes but radius doesn't
    expect(m.radius).toBeGreaterThanOrEqual(4)
    expect(m.radius).toBeLessThanOrEqual(8)
  })

  it('spawn 后 elevation 初始范围 60-140', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    // elevation=60+random*80, after update -0.001 => range (60-0.001) to (140-0.001)
    // With Math.min/max(30,...), should be >=30
    expect(m.elevation).toBeGreaterThanOrEqual(30)
    expect(m.elevation).toBeLessThanOrEqual(140)
  })

  it('spawn 后 stratification 在 3-8 (3+floor(random*6))', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(m.stratification).toBeGreaterThanOrEqual(3)
    expect(m.stratification).toBeLessThanOrEqual(8)
  })

  it('spawn 后 tick 等于当前 tick', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    expect(m.tick).toBe(2800)
  })

  it('spawn 后 capRockThickness 范围 10-35', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    // initial=10+random*25, after update -= erosionRate*0.0002
    expect(m.capRockThickness).toBeGreaterThan(3)
    expect(m.capRockThickness).toBeLessThanOrEqual(36)
  })

  it('spawn 后 plateauArea 范围 20-60', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    // initial=20+random*40, after update -= erosionRate*0.0001
    expect(m.plateauArea).toBeGreaterThanOrEqual(10)
    expect(m.plateauArea).toBeLessThanOrEqual(61)
  })

  it('spawn 后 erosionRate 范围 5-20', () => {
    const m = spawnMesa([0.001, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    // initial=5+random*15, after update += (random-0.48)*0.1
    expect(m.erosionRate).toBeGreaterThanOrEqual(2)
    expect(m.erosionRate).toBeLessThanOrEqual(25)
  })
})

// ─────────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────────
describe('WorldMesaSystem update 数值逻辑', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('elevation 每次 update 减少 0.001', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // skip spawn, erosionRate random=1 => +change
    const m = makeMesa({ elevation: 80 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.elevation).toBeCloseTo(80 - 0.001, 5)
  })

  it('elevation 下限为 30（Math.max）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m = makeMesa({ elevation: 30 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.elevation).toBeCloseTo(30, 2)  // max(30, 30-0.001) = 30
  })

  it('capRockThickness 下限为 3（Math.max）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const m = makeMesa({ capRockThickness: 3, erosionRate: 1000 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.capRockThickness).toBe(3)
  })

  it('plateauArea 下限为 10（Math.max）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const m = makeMesa({ plateauArea: 10, erosionRate: 1000 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.plateauArea).toBe(10)
  })

  it('erosionRate 上限为 25（Math.min）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)  // (1-0.48)*0.1=0.052, should clamp to 25
    const m = makeMesa({ erosionRate: 24.99 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.erosionRate).toBeLessThanOrEqual(25)
  })

  it('erosionRate 下限为 2（Math.max）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // (0-0.48)*0.1=-0.048, should clamp to 2
    const m = makeMesa({ erosionRate: 2.01 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)
    expect(m.erosionRate).toBeGreaterThanOrEqual(2)
  })

  it('capRockThickness 随 erosionRate 递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const m = makeMesa({ capRockThickness: 20, erosionRate: 10 })
    ;(sys as any).mesas.push(m)
    const before = m.capRockThickness
    sys.update(0, makeWorld(), em, 2800)
    expect(m.capRockThickness).toBeLessThan(before)
  })

  it('多台地独立更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m1 = makeMesa({ elevation: 80 })
    const m2 = makeMesa({ elevation: 100 })
    ;(sys as any).mesas.push(m1, m2)
    sys.update(0, makeWorld(), em, 2800)
    expect(m1.elevation).toBeCloseTo(80 - 0.001, 5)
    expect(m2.elevation).toBeCloseTo(100 - 0.001, 5)
  })

  it('plateauArea 随 erosionRate 递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const m = makeMesa({ plateauArea: 30, erosionRate: 10 })
    ;(sys as any).mesas.push(m)
    const before = m.plateauArea
    sys.update(0, makeWorld(), em, 2800)
    expect(m.plateauArea).toBeLessThan(before)
  })
})

// ─────────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────────
describe('WorldMesaSystem cleanup 逻辑', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('mesa.tick < tick-96000 时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=99000, cutoff=99000-96000=3000, mesa.tick=0 < 3000 => delete
    const m = makeMesa({ tick: 0 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('mesa.tick === cutoff 时保留（条件是严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=99000, cutoff=3000, mesa.tick=3000: NOT < 3000 => keep
    const m = makeMesa({ tick: 3000 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('mesa.tick = cutoff+1 时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=99000, cutoff=3000, mesa.tick=3001 > 3000 => keep
    const m = makeMesa({ tick: 3001 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('mesa.tick = cutoff-1 时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=99000, cutoff=3000, mesa.tick=2999 < 3000 => delete
    const m = makeMesa({ tick: 2999 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(0)
  })

  it('多条记录只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=99000, cutoff=3000
    const old = makeMesa({ tick: 0 })      // < 3000 => delete
    const fresh = makeMesa({ tick: 5000 }) // > 3000 => keep
    ;(sys as any).mesas.push(old, fresh)
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(1)
    expect((sys as any).mesas[0].tick).toBe(5000)
  })

  it('tick=2800 时 cutoff=2800-96000<0，所有记录保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const m = makeMesa({ tick: 0 })
    ;(sys as any).mesas.push(m)
    sys.update(0, makeWorld(), em, 2800)   // cutoff=2800-96000=-93200, 0 is not < -93200
    expect((sys as any).mesas).toHaveLength(1)
  })

  it('3 条过期记录全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 3; i++) (sys as any).mesas.push(makeMesa({ tick: 0 }))
    sys.update(0, makeWorld(), em, 99000)
    expect((sys as any).mesas).toHaveLength(0)
  })
})
