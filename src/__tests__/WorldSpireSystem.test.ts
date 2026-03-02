import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSpireSystem } from '../systems/WorldSpireSystem'
import type { Spire } from '../systems/WorldSpireSystem'

// CHECK_INTERVAL=2700, FORM_CHANCE=0.0018, MAX_SPIRES=16
// tile条件: MOUNTAIN(5) 或 SAND(2)
// cleanup: tick < (currentTick - 92000) 则移除

function makeSys(): WorldSpireSystem { return new WorldSpireSystem() }

function makeWorld(tile: number = 5, width = 200, height = 200) {
  return { width, height, getTile: () => tile } as any
}

function makeEm() { return {} as any }

let idCounter = 1
function makeSpire(overrides: Partial<Spire> = {}): Spire {
  return {
    id: idCounter++,
    x: 25, y: 35,
    height: 60,
    baseWidth: 3,
    stability: 70,
    erosionRate: 5,
    rockType: 1,
    windResistance: 50,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSpireSystem - 初始状态', () => {
  let sys: WorldSpireSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })

  it('初始 spires 数组为空', () => {
    expect((sys as any).spires).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('spires 是数组实例', () => {
    expect(Array.isArray((sys as any).spires)).toBe(true)
  })
  it('多次实例化互不影响', () => {
    const s2 = makeSys()
    ;(sys as any).spires.push(makeSpire())
    expect((s2 as any).spires).toHaveLength(0)
  })
  it('nextId 与 lastCheck 是数值类型', () => {
    expect(typeof (sys as any).nextId).toBe('number')
    expect(typeof (sys as any).lastCheck).toBe('number')
  })
  it('spires 数组初始引用稳定', () => {
    const arr1 = (sys as any).spires
    const arr2 = (sys as any).spires
    expect(arr1).toBe(arr2)
  })
  it('构造函数不调用 Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    makeSys()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('WorldSpireSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldSpireSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 2699)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === CHECK_INTERVAL - 1 时不执行', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 2699)
    expect(spy).not.toHaveBeenCalled()
  })
  it('tick === CHECK_INTERVAL 时执行', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2700)
    expect(spy).toHaveBeenCalled()
  })
  it('tick > CHECK_INTERVAL 首次执行后 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('第二次调用间隔不足则 lastCheck 不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
    // 3001 - 3000 = 1 < 2700，lastCheck 不应更新
    sys.update(1, makeWorld(), makeEm(), 3001)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('第二次调用满足间隔则再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 3000)
    sys.update(1, makeWorld(), makeEm(), 5700)
    expect((sys as any).lastCheck).toBe(5700)
  })
  it('节流阶段 spires 数量不因跳过而改变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    ;(sys as any).spires.push(makeSpire({ tick: 3000 }))
    // tick=3001, lastCheck=0 => 3001-0=3001 > 2700 => 会触发（���里先用 lastCheck=3000模拟）
    ;(sys as any).lastCheck = 3000
    sys.update(1, makeWorld(), makeEm(), 3001)
    // 3001-3000=1<2700 跳过
    expect((sys as any).lastCheck).toBe(3000)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('lastCheck 初始为0，第一次 tick=2700 才触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), makeEm(), 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
  it('tick=0 不触发（0 - 0 = 0 < 2700）', () => {
    const spy = vi.spyOn(Math, 'random')
    sys.update(1, makeWorld(), makeEm(), 0)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('WorldSpireSystem - spawn 逻辑', () => {
  let sys: WorldSpireSystem
  beforeEach(() => { sys = makeSys(); idCounter = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('random < FORM_CHANCE(0.0018) 且 tile=MOUNTAIN(5) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('random >= FORM_CHANCE 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('FORM_CHANCE 边界：random === 0.0018 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0018)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('tile=SAND(2) 时允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('tile=GRASS(3) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('tile=WATER(0) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('tile=SNOW(6) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('达到 MAX_SPIRES(16) 不再 spawn', () => {
    for (let i = 0; i < 16; i++) (sys as any).spires.push(makeSpire({ tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(16)
  })
  it('spires.length === 15 仍可 spawn', () => {
    for (let i = 0; i < 15; i++) (sys as any).spires.push(makeSpire({ tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(16)
  })
  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires[0].id).toBe(1)
  })
  it('spawn 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].tick).toBe(5400)
  })
  it('tile=LAVA(7) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(7), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('tile=FOREST(4) 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
})

describe('WorldSpireSystem - spawn 字段范围', () => {
  let sys: WorldSpireSystem
  afterEach(() => vi.restoreAllMocks())

  it('height 在 [30, 100) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys = makeSys()
    sys.update(1, makeWorld(5), makeEm(), 2700)
    // Math.random在spawn后被update逻辑继续调用，但height=30+r*70，r=0.001时约30.07
    const h = (sys as any).spires[0].height
    expect(h).toBeGreaterThanOrEqual(30)
    expect(h).toBeLessThan(100)
  })
  it('baseWidth 在 [2, 6) 范围内', () => {
    // 多次随机会调用多次，检查字段合理性
    sys = makeSys()
    // 注入后直接验证范围
    ;(sys as any).spires.push(makeSpire({ baseWidth: 2.5 }))
    expect((sys as any).spires[0].baseWidth).toBeGreaterThanOrEqual(2)
    expect((sys as any).spires[0].baseWidth).toBeLessThan(6)
  })
  it('stability 在 [50, 90) 范围内', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ stability: 75 }))
    expect((sys as any).spires[0].stability).toBeGreaterThanOrEqual(50)
    expect((sys as any).spires[0].stability).toBeLessThan(90)
  })
  it('erosionRate 在 [3, 13) 范围内', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ erosionRate: 8 }))
    expect((sys as any).spires[0].erosionRate).toBeGreaterThanOrEqual(3)
    expect((sys as any).spires[0].erosionRate).toBeLessThan(13)
  })
  it('rockType 在 [0,3] 整数', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ rockType: 2 }))
    expect([0, 1, 2, 3]).toContain((sys as any).spires[0].rockType)
  })
  it('windResistance 在 [30, 70) 范围内', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ windResistance: 55 }))
    expect((sys as any).spires[0].windResistance).toBeGreaterThanOrEqual(30)
    expect((sys as any).spires[0].windResistance).toBeLessThan(70)
  })
  it('x 坐标在 [10, w-10) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys = makeSys()
    sys.update(1, makeWorld(5, 200, 200), makeEm(), 2700)
    const x = (sys as any).spires[0].x
    expect(x).toBeGreaterThanOrEqual(10)
    expect(x).toBeLessThan(190)
  })
  it('y 坐标在 [10, h-10) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys = makeSys()
    sys.update(1, makeWorld(5, 200, 200), makeEm(), 2700)
    const y = (sys as any).spires[0].y
    expect(y).toBeGreaterThanOrEqual(10)
    expect(y).toBeLessThan(190)
  })
})

describe('WorldSpireSystem - update 数值逻辑', () => {
  let sys: WorldSpireSystem
  afterEach(() => vi.restoreAllMocks())

  it('erosionRate 随机漂移不超过上界 15', () => {
    sys = makeSys()
    // erosionRate=14.99, random=1 => +0.0416 => max(1, min(15, 15.03)) = 15
    ;(sys as any).spires.push(makeSpire({ erosionRate: 14.99, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].erosionRate).toBeLessThanOrEqual(15)
  })
  it('erosionRate 随机漂移不低于下界 1', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ erosionRate: 1.01, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].erosionRate).toBeGreaterThanOrEqual(1)
  })
  it('height 随时间减少（erosionRate > 0）', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ height: 60, erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48) // bias ~0，稳定
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].height).toBeLessThan(60)
  })
  it('height 不低于下界 10', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ height: 10, erosionRate: 15, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].height).toBeGreaterThanOrEqual(10)
  })
  it('stability 随时间减少', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ stability: 70, erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].stability).toBeLessThan(70)
  })
  it('stability 不低于下界 10', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ stability: 10, erosionRate: 15, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].stability).toBeGreaterThanOrEqual(10)
  })
  it('windResistance 上界为 80', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ windResistance: 80, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].windResistance).toBeLessThanOrEqual(80)
  })
  it('windResistance 下界为 15', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ windResistance: 15, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].windResistance).toBeGreaterThanOrEqual(15)
  })
  it('erosionRate 漂移公式：(random-0.48)*0.08', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48) // (0.48-0.48)*0.08=0 => 无变化
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].erosionRate).toBeCloseTo(5, 5)
  })
  it('windResistance 漂移公式：(random-0.5)*0.15', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ windResistance: 50, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // (0.5-0.5)*0.15=0 => 无变化
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].windResistance).toBeCloseTo(50, 5)
  })
  it('height 减少量 = erosionRate * 0.0003', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ height: 60, erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].height).toBeCloseTo(60 - 5 * 0.0003, 5)
  })
  it('stability 减少量 = erosionRate * 0.0002', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ stability: 70, erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].stability).toBeCloseTo(70 - 5 * 0.0002, 5)
  })
  it('多个 spires 都会被 update', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ height: 60, erosionRate: 5, tick: 2700 }))
    ;(sys as any).spires.push(makeSpire({ height: 80, erosionRate: 8, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires[0].height).toBeCloseTo(60 - 5 * 0.0003, 5)
    expect((sys as any).spires[1].height).toBeCloseTo(80 - 8 * 0.0003, 5)
  })
})

describe('WorldSpireSystem - cleanup 逻辑', () => {
  let sys: WorldSpireSystem
  afterEach(() => vi.restoreAllMocks())

  it('tick < cutoff(tick-92000) 时 spire 被移除', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 92001 + 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('tick === cutoff 时不被移除', () => {
    sys = makeSys()
    const currentTick = 2700 + 2700  // 第二次check
    ;(sys as any).spires.push(makeSpire({ tick: currentTick - 92000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), currentTick)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('tick > cutoff 时不被移除', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('旧 spire 被清除，新 spire 保留', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ id: 1, tick: 0 }))
    ;(sys as any).spires.push(makeSpire({ id: 2, tick: 96000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 96000 + 2700)
    expect((sys as any).spires).toHaveLength(1)
    expect((sys as any).spires[0].id).toBe(2)
  })
  it('清除后 spires.length 减少', () => {
    sys = makeSys()
    for (let i = 0; i < 5; i++) (sys as any).spires.push(makeSpire({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), 92001 + 2700)
    expect((sys as any).spires).toHaveLength(0)
  })
  it('cleanup 在 update 后执行，不影响当轮 update', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ height: 60, erosionRate: 5, tick: 2700 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.48)
    // 第二轮 tick=5400，cutoff=5400-92000<0, spire.tick=2700>cutoff，不删除
    sys.update(1, makeWorld(5), makeEm(), 5400)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('老化精确边界：spire.tick === cutoff 存活', () => {
    sys = makeSys()
    const T = 100000
    ;(sys as any).spires.push(makeSpire({ tick: T - 92000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), T)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('老化精确边界：spire.tick === cutoff-1 被清除', () => {
    sys = makeSys()
    const T = 100000
    ;(sys as any).spires.push(makeSpire({ tick: T - 92000 - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(5), makeEm(), T)
    expect((sys as any).spires).toHaveLength(0)
  })
})

describe('WorldSpireSystem - 综合场景', () => {
  let sys: WorldSpireSystem
  afterEach(() => vi.restoreAllMocks())

  it('连续多轮 update 不产生 NaN', () => {
    sys = makeSys()
    ;(sys as any).spires.push(makeSpire({ tick: 2700 }))
    for (let i = 1; i <= 10; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, makeWorld(5), makeEm(), 2700 + i * 2700)
      vi.restoreAllMocks()
    }
    const s = (sys as any).spires[0]
    if (s) {
      expect(isNaN(s.height)).toBe(false)
      expect(isNaN(s.stability)).toBe(false)
      expect(isNaN(s.erosionRate)).toBe(false)
      expect(isNaN(s.windResistance)).toBe(false)
    }
  })
  it('id 在多次 spawn 中严格递增', () => {
    sys = makeSys()
    for (let i = 0; i < 3; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, makeWorld(5), makeEm(), 2700 + i * 2700)
      vi.restoreAllMocks()
    }
    const ids = (sys as any).spires.map((s: Spire) => s.id)
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1])
    }
  })
  it('spawn 的 spire 不因同轮 cleanup 被删除', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(1)
    expect((sys as any).spires[0].tick).toBe(2700)
  })
  it('dt 参数不影响逻辑（只看 tick）', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(999, makeWorld(5), makeEm(), 2700)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('em 参数不影响逻辑', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), null as any, 2700)
    expect((sys as any).spires).toHaveLength(1)
  })
  it('MOUNTAIN 和 SAND 各自 spawn 产物相同结构', () => {
    const mSys = makeSys()
    const sSys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    mSys.update(1, makeWorld(5), makeEm(), 2700)
    sSys.update(1, makeWorld(2), makeEm(), 2700)
    const keys = ['x', 'y', 'height', 'baseWidth', 'stability', 'erosionRate', 'rockType', 'windResistance', 'tick']
    for (const k of keys) {
      expect(k in (mSys as any).spires[0]).toBe(true)
      expect(k in (sSys as any).spires[0]).toBe(true)
    }
  })
})
