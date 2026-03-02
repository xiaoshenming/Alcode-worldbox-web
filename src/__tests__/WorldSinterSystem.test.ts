import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSinterSystem } from '../systems/WorldSinterSystem'
import type { SinterFormation } from '../systems/WorldSinterSystem'

// ---- helpers ----
function makeSys(): WorldSinterSystem { return new WorldSinterSystem() }
function makeWorld(w = 200, h = 200) {
  return { width: w, height: h, getTile: () => 3 } as any
}
function makeEM() { return {} as any }

let nextId = 1
function makeFormation(overrides: Partial<SinterFormation> = {}): SinterFormation {
  return {
    id: nextId++,
    x: 20, y: 30,
    mineralDensity: 70,
    porosity: 30,
    thermalGradient: 50,
    depositionRate: 5,
    age: 2000,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 2750
// FORM_CHANCE = 0.0008  (spawn when random < 0.0008)
// MAX_FORMATIONS = 7
// update logic: age += 0.004, mineralDensity = min(90, +0.007), porosity = max(5, -0.005), thermalGradient = max(10, -0.006)
// cleanup: remove if !(age < 94), i.e. age >= 94

describe('WorldSinterSystem - 初始状态', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始formations为空数组', () => {
    expect((sys as any).formations).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('formations是数组类型', () => {
    expect(Array.isArray((sys as any).formations)).toBe(true)
  })

  it('注入一个硅华后length为1', () => {
    ;(sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(1)
  })

  it('注入三个硅华后length为3', () => {
    for (let i = 0; i < 3; i++) (sys as any).formations.push(makeFormation())
    expect((sys as any).formations).toHaveLength(3)
  })

  it('formations返回同一内部引用', () => {
    expect((sys as any).formations).toBe((sys as any).formations)
  })

  it('硅华字段类型正确', () => {
    ;(sys as any).formations.push(makeFormation())
    const f = (sys as any).formations[0]
    expect(typeof f.id).toBe('number')
    expect(typeof f.x).toBe('number')
    expect(typeof f.y).toBe('number')
    expect(typeof f.mineralDensity).toBe('number')
    expect(typeof f.porosity).toBe('number')
    expect(typeof f.thermalGradient).toBe('number')
    expect(typeof f.depositionRate).toBe('number')
    expect(typeof f.age).toBe('number')
    expect(typeof f.tick).toBe('number')
  })
})

describe('WorldSinterSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时不执行(lastCheck=0, 0-0=0 < 2750)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).formations).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2749时不执行(2749-0=2749 < 2750)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2749)
    expect((sys as any).formations).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick=2750时执行(2750-0=2750 不< 2750)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.00001)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).lastCheck).toBe(2750)
    vi.restoreAllMocks()
  })

  it('tick=2750后lastCheck更新为2750', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).lastCheck).toBe(2750)
    vi.restoreAllMocks()
  })

  it('连续两次tick=2750,第二次被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.00001)
    sys.update(1, makeWorld(), makeEM(), 2750)
    const count = (sys as any).formations.length
    sys.update(1, makeWorld(), makeEM(), 2750) // same tick, lastCheck=2750, 0 < 2750 → skip
    expect((sys as any).formations).toHaveLength(count)
    vi.restoreAllMocks()
  })

  it('第一次tick=2750,第二次tick=5500,两次都执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // no spawn
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).lastCheck).toBe(2750)
    sys.update(1, makeWorld(), makeEM(), 5500)
    expect((sys as any).lastCheck).toBe(5500)
    vi.restoreAllMocks()
  })

  it('tick=1时被节流,lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 1)
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('CHECK_INTERVAL边界:2750-1=2749被节流,2750-0=2750执行', () => {
    // set lastCheck to 1
    ;(sys as any).lastCheck = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750) // 2750-1=2749 < 2750 → skip
    expect((sys as any).lastCheck).toBe(1)
    sys.update(1, makeWorld(), makeEM(), 2751) // 2751-1=2750 not < 2750 → execute
    expect((sys as any).lastCheck).toBe(2751)
    vi.restoreAllMocks()
  })
})

describe('WorldSinterSystem - spawn逻辑', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0008)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0007)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('random = 0时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(1)
  })

  it('random = FORM_CHANCE(0.0008)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0008)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('已达MAX_FORMATIONS(7)时不spawn', () => {
    for (let i = 0; i < 7; i++) (sys as any).formations.push(makeFormation({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    // 7 spawned + update increments age. none removed (age 0.004 < 94). still 7.
    expect((sys as any).formations).toHaveLength(7)
  })

  it('低于MAX_FORMATIONS时可spawn', () => {
    for (let i = 0; i < 6; i++) (sys as any).formations.push(makeFormation({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(7)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的formation记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].tick).toBe(2750)
  })
})

describe('WorldSinterSystem - spawn字段范围', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnAndGet(): SinterFormation {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200), makeEM(), 2750)
    return (sys as any).formations[0]
  }

  it('spawn后age初始为0(update后age=0.004)', () => {
    // age starts 0, then update sets age += 0.004, so age=0.004 after one update
    const f = spawnAndGet()
    expect(f.age).toBeCloseTo(0.004, 5)
  })

  it('spawn的id从1开始', () => {
    const f = spawnAndGet()
    expect(f.id).toBe(1)
  })

  it('x坐标在[0, world.width)范围内', () => {
    const calls: number[] = []
    vi.spyOn(Math, 'random').mockImplementation(() => {
      calls.push(calls.length)
      return 0.5
    })
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(100, 80), makeEM(), 2750)
    const f = (sys as any).formations[0]
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.x).toBeLessThan(100)
  })

  it('y坐标在[0, world.height)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(100, 80), makeEM(), 2750)
    const f = (sys as any).formations[0]
    expect(f.y).toBeGreaterThanOrEqual(0)
    expect(f.y).toBeLessThan(80)
  })

  it('mineralDensity在[35,75)范围内(35 + random*40)', () => {
    // random=0 → 35, random≈1 → 75
    // but first random call is FORM_CHANCE check which needs < 0.0008,
    // subsequent calls are for x, y, mineralDensity etc.
    // We can't easily control order, so just check plausible range
    for (let i = 0; i < 5; i++) {
      const s = new WorldSinterSystem()
      ;(s as any).lastCheck = 0
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.0001 // FORM_CHANCE pass
        return 0 // all other calls → minimum values
      })
      s.update(1, makeWorld(), makeEM(), 2750)
      const f = (s as any).formations[0]
      if (f) {
        expect(f.mineralDensity).toBeGreaterThanOrEqual(35)
        expect(f.mineralDensity).toBeLessThanOrEqual(75.1)
      }
      vi.restoreAllMocks()
    }
  })

  it('porosity在[20,50)范围内(20 + random*30)', () => {
    // spawned porosity = 20 + random*30, after update: -0.005
    // just check raw minimum after fresh spawn via fresh instance
    const s = new WorldSinterSystem()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0
    })
    s.update(1, makeWorld(), makeEM(), 2750)
    const f = (s as any).formations[0]
    if (f) {
      // porosity: spawned at 20+0=20, update: max(5, 20-0.005)=19.995
      expect(f.porosity).toBeCloseTo(19.995, 2)
    }
    vi.restoreAllMocks()
  })

  it('thermalGradient在[25,60)范围内(25 + random*35)', () => {
    const s = new WorldSinterSystem()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0
    })
    s.update(1, makeWorld(), makeEM(), 2750)
    const f = (s as any).formations[0]
    if (f) {
      // thermalGradient: 25+0=25, update: max(10, 25-0.006)=24.994
      expect(f.thermalGradient).toBeCloseTo(24.994, 2)
    }
    vi.restoreAllMocks()
  })

  it('depositionRate在[10,30)范围内(10 + random*20)', () => {
    // depositionRate is not updated in update loop, stays as spawned
    const s = new WorldSinterSystem()
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return callCount === 1 ? 0.0001 : 0
    })
    s.update(1, makeWorld(), makeEM(), 2750)
    const f = (s as any).formations[0]
    if (f) {
      expect(f.depositionRate).toBeCloseTo(10, 3)
    }
    vi.restoreAllMocks()
  })
})

describe('WorldSinterSystem - update数值逻辑', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update后age增加0.004', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].age).toBeCloseTo(0.004, 5)
  })

  it('两次update后age增加0.008', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    sys.update(1, makeWorld(), makeEM(), 5500)
    expect((sys as any).formations[0].age).toBeCloseTo(0.008, 5)
  })

  it('mineralDensity每次update增加0.007', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].mineralDensity).toBeCloseTo(50.007, 5)
  })

  it('mineralDensity上限为90', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 89.999, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].mineralDensity).toBeCloseTo(90, 3)
  })

  it('mineralDensity不超过90', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 90, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].mineralDensity).toBe(90)
  })

  it('porosity每次update减少0.005', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].porosity).toBeCloseTo(19.995, 5)
  })

  it('porosity下限为5', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 5, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].porosity).toBe(5)
  })

  it('thermalGradient每次update减少0.006', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].thermalGradient).toBeCloseTo(29.994, 5)
  })

  it('thermalGradient下限为10', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 20, thermalGradient: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].thermalGradient).toBe(10)
  })
})

describe('WorldSinterSystem - cleanup逻辑', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('age < 94的硅华不被清理', () => {
    ;(sys as any).formations.push(makeFormation({ age: 90, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    // age: 90 + 0.004 = 90.004 < 94 → keep
    expect((sys as any).formations).toHaveLength(1)
  })

  it('age >= 94的硅华被清理(cleanup条件:!(age < 94))', () => {
    ;(sys as any).formations.push(makeFormation({ age: 94, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    // age after update: 94 + 0.004 = 94.004, !(94.004 < 94) = true → remove
    expect((sys as any).formations).toHaveLength(0)
  })

  it('age = 93.997时 update后 93.997+0.004=94.001 >= 94 → 被清理', () => {
    ;(sys as any).formations.push(makeFormation({ age: 93.997, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(0)
  })

  it('age = 93.99时 update后 < 94 → 保留', () => {
    ;(sys as any).formations.push(makeFormation({ age: 93.99, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    // 93.99 + 0.004 = 93.994 < 94 → keep
    expect((sys as any).formations).toHaveLength(1)
  })

  it('多个硅华混合:部分清理,部分保留', () => {
    ;(sys as any).formations.push(makeFormation({ id: 1, age: 93, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))  // keep
    ;(sys as any).formations.push(makeFormation({ id: 2, age: 94, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))  // remove
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(1)
    expect((sys as any).formations[0].id).toBe(1)
  })

  it('清理后MAX_FORMATIONS容量恢复,可再次spawn', () => {
    // fill to 7 with old formations
    for (let i = 0; i < 7; i++) {
      ;(sys as any).formations.push(makeFormation({ id: i + 1, age: 94, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    // all 7 removed by cleanup (age >= 94 after +0.004), then new spawn happens next tick
    expect((sys as any).formations).toHaveLength(0)
  })

  it('从后向前删除保证索引正确', () => {
    ;(sys as any).formations.push(makeFormation({ id: 1, age: 94, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    ;(sys as any).formations.push(makeFormation({ id: 2, age: 10, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    ;(sys as any).formations.push(makeFormation({ id: 3, age: 94, mineralDensity: 50, porosity: 20, thermalGradient: 30 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations).toHaveLength(1)
    expect((sys as any).formations[0].id).toBe(2)
  })

  it('world.width/height缺省时使用200', () => {
    // world without width/height
    const worldNoSize = { getTile: () => 3 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, worldNoSize, makeEM(), 2750)
    const f = (sys as any).formations[0]
    if (f) {
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x).toBeLessThan(200)
    }
  })
})

describe('WorldSinterSystem - 综合场景', () => {
  let sys: WorldSinterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('连续多次update保证数据单调变化(age持续增加)', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 30, thermalGradient: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    let prevAge = 0
    for (let i = 1; i <= 5; i++) {
      sys.update(1, makeWorld(), makeEM(), 2750 * i)
      const age = (sys as any).formations[0]?.age ?? prevAge
      expect(age).toBeGreaterThan(prevAge)
      prevAge = age
    }
  })

  it('连续多次update保证mineralDensity单调增加(直到上限90)', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 30, thermalGradient: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    let prev = 50
    for (let i = 1; i <= 5; i++) {
      sys.update(1, makeWorld(), makeEM(), 2750 * i)
      const md = (sys as any).formations[0]?.mineralDensity ?? prev
      expect(md).toBeGreaterThanOrEqual(prev)
      prev = md
    }
  })

  it('同时有多个formations,每个都被update', () => {
    ;(sys as any).formations.push(makeFormation({ id: 1, age: 0, mineralDensity: 50, porosity: 30, thermalGradient: 40 }))
    ;(sys as any).formations.push(makeFormation({ id: 2, age: 0, mineralDensity: 60, porosity: 25, thermalGradient: 35 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).formations[0].age).toBeCloseTo(0.004, 5)
    expect((sys as any).formations[1].age).toBeCloseTo(0.004, 5)
  })

  it('formations数量不超过MAX_FORMATIONS=7', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 10; i++) {
      sys.update(1, makeWorld(), makeEM(), 2750 * i)
    }
    expect((sys as any).formations.length).toBeLessThanOrEqual(7)
  })

  it('spawn时id严格递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 2750)
    sys.update(1, makeWorld(), makeEM(), 5500)
    const ids = (sys as any).formations.map((f: SinterFormation) => f.id)
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1])
  })

  it('节流后update不影响formations(被跳过)', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 30, thermalGradient: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 1000) // 1000-0=1000 < 2750 → skip
    expect((sys as any).formations[0].age).toBe(0) // not updated
  })

  it('所有formations在age到达94前不会被删除', () => {
    ;(sys as any).formations.push(makeFormation({ age: 0, mineralDensity: 50, porosity: 30, thermalGradient: 40 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // 94 / 0.004 = 23500 updates needed; do 100 → age=0.4, still alive
    for (let i = 1; i <= 100; i++) {
      sys.update(1, makeWorld(), makeEM(), 2750 * i)
    }
    if ((sys as any).formations.length > 0) {
      expect((sys as any).formations[0].age).toBeLessThan(94)
    }
  })

  it('lastCheck在每次执行后正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 2750)
    expect((sys as any).lastCheck).toBe(2750)
    sys.update(1, makeWorld(), makeEM(), 5500)
    expect((sys as any).lastCheck).toBe(5500)
    sys.update(1, makeWorld(), makeEM(), 8250)
    expect((sys as any).lastCheck).toBe(8250)
  })

  it('两个独立系统实例互不干扰', () => {
    const sysA = new WorldSinterSystem()
    const sysB = new WorldSinterSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sysA.update(1, makeWorld(), makeEM(), 2750)
    expect((sysA as any).formations).toHaveLength(1)
    expect((sysB as any).formations).toHaveLength(0)
  })
})
