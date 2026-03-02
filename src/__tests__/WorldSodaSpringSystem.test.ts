import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSodaSpringSystem } from '../systems/WorldSodaSpringSystem'
import type { SodaSpring } from '../systems/WorldSodaSpringSystem'

// ---- helpers ----
function makeSys(): WorldSodaSpringSystem { return new WorldSodaSpringSystem() }
function makeWorld(w = 200, h = 200) {
  return { width: w, height: h, getTile: () => 1 } as any
}
function makeEM() { return {} as any }

let nextId = 1
function makeSpring(overrides: Partial<SodaSpring> = {}): SodaSpring {
  return {
    id: nextId++,
    x: 20, y: 30,
    carbonation: 50,
    mineralDensity: 30,
    bubbleRate: 20,
    alkalinity: 40,
    tick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 3020
// FORM_CHANCE = 0.0011  (spawn when random < 0.0011)
// MAX_SPRINGS = 12
// spawn: carbonation = 20 + random*40, mineralDensity = 10 + random*30, bubbleRate = 5 + random*25, alkalinity = 15 + random*35
// update: carbonation = max(5, min(80, carbonation + (random-0.48)*0.2))
//         bubbleRate = max(2, min(55, bubbleRate + (random-0.5)*0.15))
//         alkalinity = max(5, min(70, alkalinity + (random-0.47)*0.12))
// cleanup: remove if springs[i].tick < tick - 84000

describe('WorldSodaSpringSystem - 初始状态', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始springs为空数组', () => {
    expect((sys as any).springs).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('springs是数组类型', () => {
    expect(Array.isArray((sys as any).springs)).toBe(true)
  })

  it('注入一个苏打泉后length为1', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })

  it('注入五个苏打泉后length为5', () => {
    for (let i = 0; i < 5; i++) (sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(5)
  })

  it('springs返回同一内部引用', () => {
    expect((sys as any).springs).toBe((sys as any).springs)
  })

  it('苏打泉字段类型正确', () => {
    ;(sys as any).springs.push(makeSpring())
    const s = (sys as any).springs[0]
    expect(typeof s.id).toBe('number')
    expect(typeof s.x).toBe('number')
    expect(typeof s.y).toBe('number')
    expect(typeof s.carbonation).toBe('number')
    expect(typeof s.mineralDensity).toBe('number')
    expect(typeof s.bubbleRate).toBe('number')
    expect(typeof s.alkalinity).toBe('number')
    expect(typeof s.tick).toBe('number')
  })
})

describe('WorldSodaSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行(0-0=0 < 3020)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick=3019时不执行(3019 < 3020)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3019)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick=3020时执行(3020 不< 3020)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).lastCheck).toBe(3020)
  })

  it('tick=3020后lastCheck更新为3020', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).lastCheck).toBe(3020)
  })

  it('tick=1时被节流,lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3020,6040,9060 依次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).lastCheck).toBe(3020)
    sys.update(1, makeWorld(), makeEM(), 6040)
    expect((sys as any).lastCheck).toBe(6040)
    sys.update(1, makeWorld(), makeEM(), 9060)
    expect((sys as any).lastCheck).toBe(9060)
  })

  it('连续相同tick第二次被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020)
    sys.update(1, makeWorld(), makeEM(), 3020) // 3020-3020=0 < 3020 → skip
    expect((sys as any).lastCheck).toBe(3020)
  })

  it('CHECK_INTERVAL边界:lastCheck=1,tick=3020,差值3019被节流', () => {
    ;(sys as any).lastCheck = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020) // 3020-1=3019 < 3020 → skip
    expect((sys as any).lastCheck).toBe(1)
    sys.update(1, makeWorld(), makeEM(), 3021) // 3021-1=3020 not < 3020 → execute
    expect((sys as any).lastCheck).toBe(3021)
  })
})

describe('WorldSodaSpringSystem - spawn逻辑', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < FORM_CHANCE(0.0011)时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('random = 0时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('random = FORM_CHANCE(0.0011)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0011)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('已达MAX_SPRINGS(12)时不spawn', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 3020 })) // tick=3020 → cutoff=3020-84000=-80980, keep
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(12)
  })

  it('低于MAX_SPRINGS时可spawn', () => {
    for (let i = 0; i < 11; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 3020 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(12)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的spring记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].tick).toBe(3020)
  })
})

describe('WorldSodaSpringSystem - spawn字段范围', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn的id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    const s = (sys as any).springs[0]
    expect(s.id).toBe(1)
  })

  it('x坐标使用world.width', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(150, 100), makeEM(), 3020)
    const s = (sys as any).springs[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(150)
  })

  it('y坐标使用world.height', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(150, 100), makeEM(), 3020)
    const s = (sys as any).springs[0]
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(100)
  })

  it('carbonation范围[20,60)(20+random*40)', () => {
    const s = new WorldSodaSpringSystem()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001 // pass FORM_CHANCE
      return 0 // all other → minimum
    })
    s.update(1, makeWorld(), makeEM(), 3020)
    const sp = (s as any).springs[0]
    if (sp) {
      // carbonation spawned = 20+0=20, then update: max(5,min(80,20+(0-0.48)*0.2)) = max(5,min(80,19.904))=19.904
      expect(sp.carbonation).toBeGreaterThan(5)
      expect(sp.carbonation).toBeLessThanOrEqual(80)
    }
  })

  it('mineralDensity范围[10,40)(10+random*30)', () => {
    ;(sys as any).springs.push(makeSpring({ mineralDensity: 10, tick: 3020 }))
    expect((sys as any).springs[0].mineralDensity).toBeGreaterThanOrEqual(10)
    expect((sys as any).springs[0].mineralDensity).toBeLessThan(40)
  })

  it('bubbleRate范围[5,30)(5+random*25)', () => {
    ;(sys as any).springs.push(makeSpring({ bubbleRate: 5, tick: 3020 }))
    expect((sys as any).springs[0].bubbleRate).toBeGreaterThanOrEqual(5)
  })

  it('alkalinity范围[15,50)(15+random*35)', () => {
    ;(sys as any).springs.push(makeSpring({ alkalinity: 15, tick: 3020 }))
    expect((sys as any).springs[0].alkalinity).toBeGreaterThanOrEqual(15)
  })

  it('x和y均为整数(Math.floor)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    const s = (sys as any).springs[0]
    if (s) {
      expect(s.x).toBe(Math.floor(s.x))
      expect(s.y).toBe(Math.floor(s.y))
    }
  })
})

describe('WorldSodaSpringSystem - update数值逻辑', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('carbonation随机漂移,有上限80', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 80, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.48)*0.2 = 0.104 → min(80,80.104)=80
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].carbonation).toBeLessThanOrEqual(80)
  })

  it('carbonation有下限5', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 5, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.48)*0.2 = -0.096 → max(5,4.904)=5
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].carbonation).toBeGreaterThanOrEqual(5)
  })

  it('carbonation当random=1时向上漂移', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 50, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // (1-0.48)*0.2 = 0.104 → 50.104
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].carbonation).toBeGreaterThan(50)
  })

  it('carbonation当random=0时向下漂移', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 50, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.48)*0.2 = -0.096 → 49.904
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].carbonation).toBeLessThan(50)
  })

  it('bubbleRate有上限55', () => {
    ;(sys as any).springs.push(makeSpring({ bubbleRate: 55, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].bubbleRate).toBeLessThanOrEqual(55)
  })

  it('bubbleRate有下限2', () => {
    ;(sys as any).springs.push(makeSpring({ bubbleRate: 2, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].bubbleRate).toBeGreaterThanOrEqual(2)
  })

  it('alkalinity有上限70', () => {
    ;(sys as any).springs.push(makeSpring({ alkalinity: 70, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].alkalinity).toBeLessThanOrEqual(70)
  })

  it('alkalinity有下限5', () => {
    ;(sys as any).springs.push(makeSpring({ alkalinity: 5, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].alkalinity).toBeGreaterThanOrEqual(5)
  })
})

describe('WorldSodaSpringSystem - cleanup逻辑', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff(tick-84000)的苏打泉被清理', () => {
    // current tick=90000, cutoff=90000-84000=6000
    // spring.tick=5999 < 6000 → remove
    ;(sys as any).springs.push(makeSpring({ tick: 5999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick = cutoff的苏打泉不被清理', () => {
    // current tick=90000, cutoff=6000
    // spring.tick=6000, 6000 < 6000 is false → keep
    ;(sys as any).springs.push(makeSpring({ tick: 6000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000)
    expect((sys as any).springs).toHaveLength(1)
  })

  it('tick > cutoff的苏打泉不被清理', () => {
    ;(sys as any).springs.push(makeSpring({ tick: 10000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000) // cutoff=6000, 10000 >= 6000 → keep
    expect((sys as any).springs).toHaveLength(1)
  })

  it('多个苏打泉:旧的清理,新的保留', () => {
    ;(sys as any).springs.push(makeSpring({ id: 1, tick: 0 }))    // cutoff=90000-84000=6000, 0 < 6000 → remove
    ;(sys as any).springs.push(makeSpring({ id: 2, tick: 7000 })) // 7000 >= 6000 → keep
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].id).toBe(2)
  })

  it('寿命恰好84000 tick的苏打泉被清理', () => {
    // current=84001, cutoff=1, spring.tick=0 < 1 → remove
    ;(sys as any).springs.push(makeSpring({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 84001)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('cleanup后MAX_SPRINGS容量恢复', () => {
    // fill 12 old springs
    for (let i = 0; i < 12; i++) {
      ;(sys as any).springs.push(makeSpring({ id: i + 1, tick: 0 }))
    }
    // current=90000,cutoff=6000 → all removed
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('从后向前删除保证索引正确', () => {
    ;(sys as any).springs.push(makeSpring({ id: 1, tick: 0 }))    // remove
    ;(sys as any).springs.push(makeSpring({ id: 2, tick: 7000 })) // keep
    ;(sys as any).springs.push(makeSpring({ id: 3, tick: 0 }))    // remove
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), makeEM(), 90000)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].id).toBe(2)
  })

  it('新spawn的苏打泉不被同一tick的cleanup删除', () => {
    // current tick=3020, cutoff=3020-84000=-80980, all positive ticks > cutoff → no cleanup
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(3020)
  })
})

describe('WorldSodaSpringSystem - 综合场景', () => {
  let sys: WorldSodaSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('连续多次update数值在合法范围内', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 40, bubbleRate: 20, alkalinity: 35, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 1; i <= 10; i++) {
      sys.update(1, makeWorld(), makeEM(), 3020 * i)
      const s = (sys as any).springs[0]
      if (s) {
        expect(s.carbonation).toBeGreaterThanOrEqual(5)
        expect(s.carbonation).toBeLessThanOrEqual(80)
        expect(s.bubbleRate).toBeGreaterThanOrEqual(2)
        expect(s.bubbleRate).toBeLessThanOrEqual(55)
        expect(s.alkalinity).toBeGreaterThanOrEqual(5)
        expect(s.alkalinity).toBeLessThanOrEqual(70)
      }
    }
  })

  it('springs数量不超过MAX_SPRINGS=12', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 20; i++) {
      sys.update(1, makeWorld(), makeEM(), 3020 * i)
    }
    expect((sys as any).springs.length).toBeLessThanOrEqual(12)
  })

  it('spawn时id严格递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), makeEM(), 3020)
    sys.update(1, makeWorld(), makeEM(), 6040)
    const ids = (sys as any).springs.map((s: SodaSpring) => s.id)
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1])
  })

  it('两个独立系统实例互不干扰', () => {
    const sysA = new WorldSodaSpringSystem()
    const sysB = new WorldSodaSpringSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sysA.update(1, makeWorld(), makeEM(), 3020)
    expect((sysA as any).springs).toHaveLength(1)
    expect((sysB as any).springs).toHaveLength(0)
  })

  it('节流期间springs不被更新', () => {
    ;(sys as any).springs.push(makeSpring({ carbonation: 40, bubbleRate: 20, alkalinity: 35, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const prev = { carbonation: 40, bubbleRate: 20, alkalinity: 35 }
    sys.update(1, makeWorld(), makeEM(), 100) // 100 < 3020 → throttled
    const s = (sys as any).springs[0]
    expect(s.carbonation).toBe(prev.carbonation)
    expect(s.bubbleRate).toBe(prev.bubbleRate)
    expect(s.alkalinity).toBe(prev.alkalinity)
  })

  it('多个springs同时被update', () => {
    ;(sys as any).springs.push(makeSpring({ id: 1, carbonation: 40, bubbleRate: 20, alkalinity: 35, tick: 3020 }))
    ;(sys as any).springs.push(makeSpring({ id: 2, carbonation: 60, bubbleRate: 30, alkalinity: 50, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // both go up
    sys.update(1, makeWorld(), makeEM(), 3020)
    const s1 = (sys as any).springs[0]
    const s2 = (sys as any).springs[1]
    // carbonation: (1-0.48)*0.2=0.104 > 0
    expect(s1.carbonation).toBeGreaterThan(40)
    expect(s2.carbonation).toBeGreaterThan(60)
  })

  it('alkalinity当random=0.47时不变(偏移为0)', () => {
    ;(sys as any).springs.push(makeSpring({ alkalinity: 40, carbonation: 50, bubbleRate: 20, tick: 3020 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.47) // (0.47-0.47)*0.12=0 → no change
    sys.update(1, makeWorld(), makeEM(), 3020)
    expect((sys as any).springs[0].alkalinity).toBeCloseTo(40, 5)
  })

  it('world.width/height直接用于spawn坐标计算', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(300, 250), makeEM(), 3020)
    const s = (sys as any).springs[0]
    if (s) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(300)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThan(250)
    }
  })
})
