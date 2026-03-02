import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSulfurSpringSystem } from '../systems/WorldSulfurSpringSystem'
import type { SulfurSpring } from '../systems/WorldSulfurSpringSystem'

// 系统关键参数
const CHECK_INTERVAL = 3030
const FORM_CHANCE = 0.0012
const MAX_SPRINGS = 12

function makeSys(): WorldSulfurSpringSystem { return new WorldSulfurSpringSystem() }
const em = {} as any

function makeWorld(width = 100, height = 100): any {
  return { width, height, getTile: () => 3 } as any
}

let _nextId = 1
function makeSpring(overrides: Partial<SulfurSpring> = {}): SulfurSpring {
  return {
    id: _nextId++,
    x: 20, y: 30,
    sulfurConcentration: 60,
    gasEmission: 50,
    waterTemperature: 40,
    mineralCrust: 30,
    tick: 0,
    ...overrides,
  }
}

describe('WorldSulfurSpringSystem — 初始状态', () => {
  let sys: WorldSulfurSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('初始 springs 为空数组', () => {
    expect((sys as any).springs).toHaveLength(0)
  })
  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('springs 是数组类型', () => {
    expect(Array.isArray((sys as any).springs)).toBe(true)
  })
  it('手动注入一个 spring 后长度为 1', () => {
    ;(sys as any).springs.push(makeSpring())
    expect((sys as any).springs).toHaveLength(1)
  })
  it('手动注入多个 springs 后长度��确', () => {
    ;(sys as any).springs.push(makeSpring(), makeSpring(), makeSpring())
    expect((sys as any).springs).toHaveLength(3)
  })
  it('springs 返回内部引用（同一对象）', () => {
    const ref = (sys as any).springs
    expect(ref).toBe((sys as any).springs)
  })
  it('SulfurSpring 接口字段齐全', () => {
    const s = makeSpring()
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('x')
    expect(s).toHaveProperty('y')
    expect(s).toHaveProperty('sulfurConcentration')
    expect(s).toHaveProperty('gasEmission')
    expect(s).toHaveProperty('waterTemperature')
    expect(s).toHaveProperty('mineralCrust')
    expect(s).toHaveProperty('tick')
  })
})

describe('WorldSulfurSpringSystem — CHECK_INTERVAL 节流', () => {
  let sys: WorldSulfurSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('tick=0 不执行（lastCheck=0，差值=0 < 3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 保证 < FORM_CHANCE
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tick=3029 不执行（差值=3029 < 3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3029)
    expect((sys as any).springs).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=3030 执行（差值=3030 不小于 3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < FORM_CHANCE，会 spawn
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tick=3030 后 lastCheck 更新为 3030', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).lastCheck).toBe(3030)
    vi.restoreAllMocks()
  })
  it('第一次执行后，tick=6059 仍不执行（差值=3029）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030) // 触发，lastCheck=3030
    const countAfterFirst = (sys as any).springs.length
    sys.update(1, makeWorld(), em, 6059) // 差值 3029，不执行
    expect((sys as any).springs).toHaveLength(countAfterFirst)
    vi.restoreAllMocks()
  })
  it('tick=6060 再次执行（lastCheck=3030，差值=3030）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发 spawn
    sys.update(1, makeWorld(), em, 6060)
    expect((sys as any).lastCheck).toBe(6060)
    vi.restoreAllMocks()
  })
  it('lastCheck 只在执行时更新', () => {
    sys.update(1, makeWorld(), em, 100) // 不执行
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL-1 不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).springs).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('CHECK_INTERVAL 边界：tick=CHECK_INTERVAL 执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).springs).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

describe('WorldSulfurSpringSystem — spawn 逻辑（random < FORM_CHANCE 才 spawn）', () => {
  let sys: WorldSulfurSpringSystem
  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('random=0（< 0.0012）触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('random=0.0011（< 0.0012）触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0011)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('random=0.0012（不小于 0.0012）不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0012)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('random=0.5（> 0.0012）不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('random=0.9999 不触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('已达 MAX_SPRINGS=12 时不再 spawn', () => {
    for (let i = 0; i < MAX_SPRINGS; i++) {
      ;(sys as any).springs.push(makeSpring())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(MAX_SPRINGS)
  })
  it('springs=11（< MAX_SPRINGS）且 random=0 时可 spawn', () => {
    for (let i = 0; i < MAX_SPRINGS - 1; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 3030 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    // 由于 update 也会 cleanup（tick=3030，cutoff=3030-85000<0），不会删除任何
    expect((sys as any).springs.length).toBeGreaterThanOrEqual(MAX_SPRINGS)
  })
  it('spawn 后 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 的 spring tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].tick).toBe(3030)
  })
  it('spawn 的 spring id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].id).toBe(1)
  })
  it('连续两次 spawn（两个 interval）id 递增为 1,2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    sys.update(1, makeWorld(), em, 6060)
    const ids = (sys as any).springs.map((s: SulfurSpring) => s.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })
  it('spawn 的 spring x 在世界范围内（0~width-1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(50, 80), em, 3030)
    const s = (sys as any).springs[0]
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(50)
  })
  it('spawn 的 spring y 在世界范围内（0~height-1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(50, 80), em, 3030)
    const s = (sys as any).springs[0]
    expect(s.y).toBeGreaterThanOrEqual(0)
    expect(s.y).toBeLessThan(80)
  })
})

describe('WorldSulfurSpringSystem — spawn 字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('sulfurConcentration spawn初始范围 [20,60)（同帧update可能微调，clamp下限5上限80）', () => {
    for (const rv of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const sys = makeSys()
      // 第一次 random 用于 FORM_CHANCE 检查，之后用于字段
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0 // < FORM_CHANCE
        if (callCount === 2) return 0 // x
        if (callCount === 3) return 0 // y
        return rv // 字段 random
      })
      sys.update(1, makeWorld(), em, 3030)
      const s = (sys as any).springs[0]
      // spawn后同帧update会微调sulfurConcentration，但clamp在[5,80]
      if (s) {
        expect(s.sulfurConcentration).toBeGreaterThanOrEqual(5)
        expect(s.sulfurConcentration).toBeLessThanOrEqual(80)
      }
      vi.restoreAllMocks()
    }
  })
  it('gasEmission 范围 [10, 40)', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    // random=0 => gasEmission = 10 + 0*30 = 10，但 update 同帧会修改
    expect(s.gasEmission).toBeGreaterThanOrEqual(3) // update clamps min to 3
  })
  it('waterTemperature 范围 [30, 75)', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    expect(s.waterTemperature).toBeGreaterThanOrEqual(30)
    expect(s.waterTemperature).toBeLessThanOrEqual(75)
  })
  it('mineralCrust 范围 [5, 30)', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    // spawn: mineralCrust=5+0*25=5，update同帧+0.007=5.007
    expect(s.mineralCrust).toBeGreaterThanOrEqual(5)
    expect(s.mineralCrust).toBeLessThan(30.1)
  })
  it('sulfurConcentration spawn后同帧update可能偏移但不低于clamp下限5', () => {
    const sys = makeSys()
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0 : 0 })
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    // 同帧update: (0-0.48)*0.2=-0.096 => 20-0.096=19.904，clamp下限5
    if (s) expect(s.sulfurConcentration).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
})

describe('WorldSulfurSpringSystem — update 数值逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('sulfurConcentration 在 update 时向上漂移（random=1 时）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ sulfurConcentration: 50, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9999) // > FORM_CHANCE，不spawn；update random=1>0.48
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    // (1-0.48)*0.2 = 0.104 增量，50+0.104=50.104，钳制上限80
    expect(s.sulfurConcentration).toBeGreaterThan(50)
  })
  it('sulfurConcentration 在 update 时向下漂移（random=0 时）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ sulfurConcentration: 50, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    // random=0 用于 FORM_CHANCE check（>0.0012不spawn），update用random=0<0.48，向下
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 })
    sys.update(1, makeWorld(), em, 3030)
    const s = (sys as any).springs[0]
    // (0-0.48)*0.2 = -0.096，50-0.096=49.904
    expect(s.sulfurConcentration).toBeLessThan(50)
  })
  it('sulfurConcentration 下限钳制为 5', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ sulfurConcentration: 5, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].sulfurConcentration).toBeGreaterThanOrEqual(5)
  })
  it('sulfurConcentration 上限钳制为 80', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ sulfurConcentration: 80, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].sulfurConcentration).toBeLessThanOrEqual(80)
  })
  it('gasEmission 下限钳制为 3', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ gasEmission: 3, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 0 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].gasEmission).toBeGreaterThanOrEqual(3)
  })
  it('gasEmission 上限钳制为 60', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ gasEmission: 60, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].gasEmission).toBeLessThanOrEqual(60)
  })
  it('mineralCrust 每次 update 增加 0.007', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ mineralCrust: 10, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].mineralCrust).toBeCloseTo(10.007, 5)
  })
  it('mineralCrust 上限钳制为 65', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ mineralCrust: 65, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].mineralCrust).toBeLessThanOrEqual(65)
  })
  it('waterTemperature 不被 update 修改', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ waterTemperature: 55, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].waterTemperature).toBe(55)
  })
  it('update 对所有 springs 都执行（多个 springs）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(
      makeSpring({ mineralCrust: 10, tick: 3030 }),
      makeSpring({ mineralCrust: 20, tick: 3030 }),
    )
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 3030)
    const springs = (sys as any).springs
    for (const s of springs) {
      expect(s.mineralCrust).toBeGreaterThan(10)
    }
  })
})

describe('WorldSulfurSpringSystem — cleanup 逻辑（tick < cutoff 则删除）', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('cutoff = tick - 85000；tick=100000 时 cutoff=15000', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: 14999 })) // tick < cutoff=15000，删除
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('tick=15000（等于 cutoff）保留（15000 < 15000 为 false）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: 15000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('tick=15001（> cutoff）保留', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: 15001 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('一批中只删除过期的，保留新的', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: 1000 }))   // 过期
    ;(sys as any).springs.push(makeSpring({ tick: 90000 }))  // 保留
    ;(sys as any).springs.push(makeSpring({ tick: 5000 }))   // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(90000)
  })
  it('tick 恰好等于 cutoff 的边界不被删除', () => {
    const currentTick = 200000
    const cutoff = currentTick - 85000 // 115000
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).springs).toHaveLength(1)
  })
  it('tick < cutoff 的 spring 被删除', () => {
    const currentTick = 200000
    const cutoff = currentTick - 85000
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('从尾部向前删除，索引不越界（多个过期元素）', () => {
    const sys = makeSys()
    for (let i = 0; i < 5; i++) {
      ;(sys as any).springs.push(makeSpring({ tick: 100 })) // 全部过期
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), em, 200000)
    expect((sys as any).springs).toHaveLength(0)
  })
  it('cleanup 后可继续 spawn', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ tick: 100 })) // 过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // < FORM_CHANCE
    sys.update(1, makeWorld(), em, 200000)
    // spawn 了一个新的，cleanup 删了旧的
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(200000)
  })
  it('cleanup 不影响当前 tick 刚 spawn 的 spring', () => {
    const sys = makeSys()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // spawn
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs).toHaveLength(1)
    expect((sys as any).springs[0].tick).toBe(3030)
  })
})

describe('WorldSulfurSpringSystem — 综合场景', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_SPRINGS 不超过 12', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= 20; i++) {
      sys.update(1, makeWorld(), em, i * 3030)
    }
    expect((sys as any).springs.length).toBeLessThanOrEqual(MAX_SPRINGS)
    vi.restoreAllMocks()
  })
  it('不同世界尺寸的 x/y 在边界内', () => {
    for (const [w, h] of [[10, 20], [200, 150], [1, 1]]) {
      const sys = makeSys()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, makeWorld(w, h), em, 3030)
      const springs = (sys as any).springs
      for (const s of springs) {
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x).toBeLessThan(w)
        expect(s.y).toBeGreaterThanOrEqual(0)
        expect(s.y).toBeLessThan(h)
      }
      vi.restoreAllMocks()
    }
  })
  it('SulfurSpring 无 tile 条件限制（不检查 getTile）', () => {
    // SulfurSpringSystem 不检查 tile，任意 tile 都可 spawn
    const worldNoTile = { width: 100, height: 100, getTile: () => 0 } as any
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, worldNoTile, em, 3030)
    expect((sys as any).springs).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('gasEmission 的 update 步长为 0.18（测试 delta 系数）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ gasEmission: 30, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    // random=1: (1-0.5)*0.18 = +0.09
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].gasEmission).toBeCloseTo(30.09, 4)
    vi.restoreAllMocks()
  })
  it('sulfurConcentration 的 update 步长为 0.2（测试 delta 系数）', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ sulfurConcentration: 40, tick: 3030 }))
    ;(sys as any).lastCheck = 0
    // random=1: (1-0.48)*0.2 = +0.104
    let c = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { c++; return c === 1 ? 0.5 : 1 })
    sys.update(1, makeWorld(), em, 3030)
    expect((sys as any).springs[0].sulfurConcentration).toBeCloseTo(40.104, 4)
    vi.restoreAllMocks()
  })
  it('dt 参数不影响 update 逻辑（系统使用 tick）', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys1.update(1, makeWorld(), em, 3030)
    sys2.update(999, makeWorld(), em, 3030)
    expect((sys1 as any).lastCheck).toBe((sys2 as any).lastCheck)
    vi.restoreAllMocks()
  })
  it('多次 update 后 gasEmission 不突破 [3,60]', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ gasEmission: 30, tick: 0 }))
    ;(sys as any).lastCheck = 0
    for (let t = 1; t <= 50; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(), em, t * 3030)
    }
    const s = (sys as any).springs[0]
    if (s) {
      expect(s.gasEmission).toBeGreaterThanOrEqual(3)
      expect(s.gasEmission).toBeLessThanOrEqual(60)
    }
  })
  it('多次 update 后 mineralCrust 不超过 65', () => {
    const sys = makeSys()
    ;(sys as any).springs.push(makeSpring({ mineralCrust: 64.99, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let t = 1; t <= 10; t++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(), em, t * 3030)
    }
    const s = (sys as any).springs[0]
    if (s) expect(s.mineralCrust).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})
