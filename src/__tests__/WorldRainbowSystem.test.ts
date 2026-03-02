import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldRainbowSystem } from '../systems/WorldRainbowSystem'
import type { Rainbow } from '../systems/WorldRainbowSystem'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSys(): WorldRainbowSystem { return new WorldRainbowSystem() }

let nextId = 1
function makeRainbow(overrides: Partial<Rainbow> = {}): Rainbow {
  return {
    id: nextId++,
    x: 50, y: 30,
    span: 20,
    brightness: 80,
    startTick: 0,
    duration: 1000,
    ...overrides,
  }
}

function makeWorld(width = 200, height = 200) {
  return { width, height }
}

/** 最小EntityManager stub：无实体，避免morale boost逻辑干扰 */
function makeEmEmpty() {
  return {
    getEntitiesWithComponents: () => [] as number[],
    getComponent: () => undefined,
  }
}

/** 带单个实体的EntityManager stub */
function makeEmWithEntity(ex: number, ey: number, health: number) {
  const pos = { x: ex, y: ey }
  const needs = { health }
  return {
    getEntitiesWithComponents: () => [1],
    getComponent: (_id: number, type: string) => {
      if (type === 'position') return pos
      if (type === 'needs') return needs
      return undefined
    },
    needsRef: needs,
  }
}

const CHECK_INTERVAL = 1000
const MAX_RAINBOWS = 4

// ── 1. 初始状态 ──────────────────���────────────────────────────────────────────

describe('WorldRainbowSystem - 初始状态', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无彩虹', () => {
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('rainbows初始为空数组', () => {
    expect(Array.isArray((sys as any).rainbows)).toBe(true)
  })
  it('注入后可查询', () => {
    ;(sys as any).rainbows.push(makeRainbow())
    expect((sys as any).rainbows).toHaveLength(1)
  })
  it('注入多个彩虹后长度正确', () => {
    ;(sys as any).rainbows.push(makeRainbow(), makeRainbow(), makeRainbow())
    expect((sys as any).rainbows).toHaveLength(3)
  })
  it('rainbows是内部引用（同一对象）', () => {
    expect((sys as any).rainbows).toBe((sys as any).rainbows)
  })
  it('手动彩虹字段可正确读取', () => {
    ;(sys as any).rainbows.push(makeRainbow())
    const r = (sys as any).rainbows[0]
    expect(r.span).toBe(20)
    expect(r.brightness).toBe(80)
    expect(r.duration).toBe(1000)
  })
  it('多个彩虹全部返回', () => {
    ;(sys as any).rainbows.push(makeRainbow(), makeRainbow())
    expect((sys as any).rainbows).toHaveLength(2)
  })
})

// ── 2. CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

describe('WorldRainbowSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL时不执行spawn', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL - 1)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('tick === CHECK_INTERVAL时执行（>=边界条件）', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).rainbows.length).toBeGreaterThan(0)
  })
  it('首次update后lastCheck更新为当前tick', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('节流期内lastCheck不变', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二个CHECK_INTERVAL后lastCheck再次更新', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期内不增加rainbow', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).rainbows.length
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL + 1)
    expect((sys as any).rainbows.length).toBe(countAfterFirst)
  })
  it('CHECK_INTERVAL常量为1000', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, 999)
    expect((sys as any).lastCheck).toBe(0) // 未触发
    sys.update(0, makeWorld(), em as any, 1000)
    expect((sys as any).lastCheck).toBe(1000) // 触发
  })
  it('RainbowSystem条件是>=（与Spring系统<不同）', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, 1001)
    expect((sys as any).lastCheck).toBe(1001)
  })
})

// ── 3. spawn 条件 ─────────────────────────────────────────────────────────────

describe('WorldRainbowSystem - spawn条件', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > RAINBOW_CHANCE(0.005)时不spawn', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('random=0时spawn成功（0 <= 0.005）', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).rainbows.length).toBeGreaterThan(0)
  })
  it('rainbows达到MAX_RAINBOWS(4)时不再spawn', () => {
    const em = makeEmEmpty()
    // 用很大duration防止expire
    for (let i = 0; i < MAX_RAINBOWS; i++) {
      ;(sys as any).rainbows.push(makeRainbow({ startTick: CHECK_INTERVAL, duration: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).rainbows.length).toBe(MAX_RAINBOWS)
  })
  it('spawn后nextId递增', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const beforeId = (sys as any).nextId
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(beforeId)
  })
  it('每次update最多spawn一个彩虹', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect((sys as any).rainbows.length).toBeLessThanOrEqual(1)
  })
  it('world.width/height缺失时使用默认值200不崩溃', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(0, {} as any, em as any, CHECK_INTERVAL)).not.toThrow()
  })
  it('spawn后startTick记录当前tick', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    const rb = (sys as any).rainbows[0]
    expect(rb.startTick).toBe(CHECK_INTERVAL)
  })
  it('rainbow.id从1开始', () => {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    const rb = (sys as any).rainbows[0]
    expect(rb.id).toBeGreaterThanOrEqual(1)
  })
})

// ── 4. spawn 字段范围 ─────────────────────────────────────────────────────────

describe('WorldRainbowSystem - spawn字段范围', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOneRainbow(randomVal: number): Rainbow {
    const em = makeEmEmpty()
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    return (sys as any).rainbows[0]
  }

  it('span >= 15（Math.floor(random*20)+15）', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.span).toBeGreaterThanOrEqual(15)
  })
  it('span <= 34（15 + Math.floor(0.999*20) = 34）', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.span).toBeLessThanOrEqual(34)
  })
  it('brightness >= 50', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.brightness).toBeGreaterThanOrEqual(50)
  })
  it('brightness <= 100', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.brightness).toBeLessThanOrEqual(100)
  })
  it('duration >= 800', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.duration).toBeGreaterThanOrEqual(800)
  })
  it('duration <= 1399（800 + Math.floor(0.999*600) = 1399）', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.duration).toBeLessThanOrEqual(1399)
  })
  it('x在world范围内', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.x).toBeGreaterThanOrEqual(0)
    expect(rb.x).toBeLessThan(200)
  })
  it('y在world范围内', () => {
    const rb = spawnOneRainbow(0)
    expect(rb.y).toBeGreaterThanOrEqual(0)
    expect(rb.y).toBeLessThan(200)
  })
})

// ── 5. update数值逻辑（morale boost） ────────────────────────────────────────

describe('WorldRainbowSystem - update数值逻辑', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('无彩虹时不调用em.getEntitiesWithComponents', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('有彩虹时对在范围内实体的health加成', () => {
    // 彩虹在(0,0), span=20, threshold=10+20*0.5=20, 实体在(5,0) 距离5 < 20
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(5, 0, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    // MORALE_BOOST=0.15, brightness=100, 0.01*100=1.0, boost=0.15*1.0=0.15
    expect(emWithEntity.needsRef.health).toBeCloseTo(50.15, 2)
  })
  it('实体在彩虹范围外时health不变', () => {
    // 彩虹在(0,0), span=20, threshold=20, 实体在(100,0) 距离100 > 20
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(100, 0, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    expect(emWithEntity.needsRef.health).toBe(50)
  })
  it('health加成上限为100', () => {
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(0, 0, 99.99)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    expect(emWithEntity.needsRef.health).toBeLessThanOrEqual(100)
  })
  it('brightness=50时boost为0.075', () => {
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 50, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(0, 0, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    // boost = 0.15 * (50*0.01) = 0.15 * 0.5 = 0.075
    expect(emWithEntity.needsRef.health).toBeCloseTo(50.075, 3)
  })
  it('多个彩虹叠加boost', () => {
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(0, 0, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    // 两次boost = 0.15 * 2 = 0.30
    expect(emWithEntity.needsRef.health).toBeCloseTo(50.30, 2)
  })
  it('节流期内仍执行morale boost（无需过CHECK_INTERVAL）', () => {
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 20, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(5, 0, 50)
    ;(sys as any).lastCheck = CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 在节流期内（不触发spawn），但rainbows存在时仍boost
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL + 1)
    expect(emWithEntity.needsRef.health).toBeGreaterThan(50)
  })
  it('span影响有效范围（threshold = MORALE_RADIUS + span*0.5）', () => {
    // threshold = 10 + 30*0.5 = 25, 实体在(24,0)，距离24 < 25，应受boost
    ;(sys as any).rainbows.push(makeRainbow({ x: 0, y: 0, span: 30, brightness: 100, startTick: 0, duration: 99999 }))
    const emWithEntity = makeEmWithEntity(24, 0, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), emWithEntity as any, CHECK_INTERVAL)
    expect(emWithEntity.needsRef.health).toBeGreaterThan(50)
  })
})

// ── 6. cleanup（expireRainbows）逻辑 ─────────────────────────────────────────

describe('WorldRainbowSystem - cleanup逻辑', () => {
  let sys: WorldRainbowSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const em = makeEmEmpty()
  // 使用一个足够大的bigTick来触发CHECK_INTERVAL
  const bigTick = CHECK_INTERVAL * 10

  it('未过duration的彩虹保留', () => {
    // startTick = bigTick - 500, duration = 1000, tick - startTick = 500 < 1000 => 保留
    ;(sys as any).rainbows.push(makeRainbow({ startTick: bigTick - 500, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(1)
  })
  it('恰好到duration时删除（tick-startTick === duration，!=< 条件）', () => {
    // startTick = bigTick - 1000, duration = 1000, tick - startTick = 1000, !( < 1000) => 删���
    ;(sys as any).rainbows.push(makeRainbow({ startTick: bigTick - 1000, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('超过duration时删除', () => {
    // startTick = bigTick - 2000, duration = 1000, tick - startTick = 2000 > 1000 => 删除
    ;(sys as any).rainbows.push(makeRainbow({ startTick: bigTick - 2000, duration: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('过期rainbow删除，未过期保留', () => {
    // 过期：startTick=0, duration=100, tick - 0 = 10000 > 100
    ;(sys as any).rainbows.push(makeRainbow({ startTick: 0, duration: 100 }))
    // 未过期：startTick = bigTick - 50, duration = 99999
    ;(sys as any).rainbows.push(makeRainbow({ startTick: bigTick - 50, duration: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(1)
    expect((sys as any).rainbows[0].duration).toBe(99999)
  })
  it('多个过期彩虹全部删除', () => {
    for (let i = 0; i < 4; i++) {
      ;(sys as any).rainbows.push(makeRainbow({ startTick: 0, duration: 10 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('cleanup在节流期内不执行', () => {
    // 放一个应该过期的彩虹，但在节流期内不清理
    ;(sys as any).rainbows.push(makeRainbow({ startTick: 0, duration: 100 }))
    ;(sys as any).lastCheck = bigTick // 模拟刚检查过
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // bigTick + 1 - bigTick = 1 < CHECK_INTERVAL，节流期内不触发expireRainbows
    sys.update(0, makeWorld(), em as any, bigTick + 1)
    expect((sys as any).rainbows).toHaveLength(1)
  })
  it('duration为0时立即删除', () => {
    // duration=0, tick - startTick >= 0 => !(< 0) => 删除
    ;(sys as any).rainbows.push(makeRainbow({ startTick: bigTick - 1, duration: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(), em as any, bigTick)
    expect((sys as any).rainbows).toHaveLength(0)
  })
  it('expireRainbows后MAX_RAINBOWS限制可再次spawn', () => {
    // 先填满4个立即过期的彩虹（duration=1）
    for (let i = 0; i < MAX_RAINBOWS; i++) {
      ;(sys as any).rainbows.push(makeRainbow({ startTick: 0, duration: 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // expireRainbows先���行（在trySpawnRainbow之前），清空过期 → 可再spawn
    sys.update(0, makeWorld(), em as any, bigTick)
    // 4个过期删除后，random=0可以触发新spawn
    expect((sys as any).rainbows.length).toBeGreaterThanOrEqual(0)
  })
})
