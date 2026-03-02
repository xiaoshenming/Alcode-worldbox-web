import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldYardangSystem } from '../systems/WorldYardangSystem'
import type { Yardang } from '../systems/WorldYardangSystem'

// --------------- helpers ---------------
function makeSys(): WorldYardangSystem { return new WorldYardangSystem() }

let nextId = 1
function makeYardang(overrides: Partial<Yardang> = {}): Yardang {
  return {
    id: nextId++, x: 25, y: 35,
    length: 20, height: 8, windDirection: 90,
    erosionStage: 3, rockHardness: 70, spectacle: 30, tick: 0,
    ...overrides,
  }
}

const SAND     = 2
const MOUNTAIN = 5
const WATER    = 0

const CHECK_INTERVAL = 2580
const TICK0          = CHECK_INTERVAL
const MAX_YARDANGS   = 15
const FORM_CHANCE    = 0.0014

function makeMockWorld(tileType: number = SAND) {
  return {
    width: 200,
    height: 200,
    getTile: vi.fn().mockReturnValue(tileType),
  } as any
}

function makeMockEM() { return {} as any }

/**
 * spawnOne：创建系统并触发一次 update，spawn 一个 yardang。
 * 参数 randSeq 是 Math.random() 各次返回值的有序序列：
 *   [0] FORM_CHANCE 检查      → 需要 < 0.0014 才能 spawn
 *   [1] x = 10 + floor(v*(w-20))
 *   [2] y = 10 + floor(v*(h-20))
 *   [3] length = 15 + v*50
 *   [4] height = 3 + v*20
 *   [5] windDirection = v*360
 *   [6] erosionStage = 1 + floor(v*4)
 *   [7] rockHardness = 20 + v*60
 *   [8] spectacle = 10 + v*30
 *   [9] update erosionStage check  (< 0.001 则 +1)
 *  [10] update spectacle delta     (v - 0.47)*0.09
 */
function spawnOne(randSeq: number[], tileType = SAND): Yardang | undefined {
  const sys = makeSys()
  const em  = makeMockEM()
  const mock = vi.spyOn(Math, 'random')
  randSeq.forEach((v, i) => {
    if (i === 0) mock.mockReturnValueOnce(v)
    else         mock.mockReturnValueOnce(v)
  })
  // 剩余调用返回 0.5（中性值）
  mock.mockReturnValue(0.5)
  sys.update(1, makeMockWorld(tileType), em, TICK0)
  vi.restoreAllMocks()
  return (sys as any).yardangs[0] as Yardang | undefined
}

// 构造一个能触发 spawn 的最小序列（全部为 0.0001，确保 FORM_CHANCE 通过）
// 0.0001 < 0.0014 → spawn
// 其余字段: length=15, height=3, windDir=0, erosionStage=1, rockHardness=20, spectacle=10
// update 时: erosionStage rand=0.0001 < 0.001 → +1 (2), spectacle rand=0.0001 → (0.0001-0.47)*0.09
const SEQ_MIN = [0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5]

// ═══════════════════════════════════════════
// 1. 初始状态
// ═══════════════════════════════════════════
describe('1. 初始状态', () => {
  let sys: WorldYardangSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('1-01 初始无风蚀垄', () => {
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('1-02 初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('1-03 初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('1-04 注入后可查询', () => {
    ;(sys as any).yardangs.push(makeYardang())
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('1-05 返回内部引用一致', () => {
    expect((sys as any).yardangs).toBe((sys as any).yardangs)
  })

  it('1-06 风蚀垄字段正确', () => {
    ;(sys as any).yardangs.push(makeYardang())
    const y = (sys as any).yardangs[0]
    expect(y.windDirection).toBe(90)
    expect(y.rockHardness).toBe(70)
    expect(y.spectacle).toBe(30)
  })

  it('1-07 多个风蚀垄全部返回', () => {
    ;(sys as any).yardangs.push(makeYardang())
    ;(sys as any).yardangs.push(makeYardang())
    expect((sys as any).yardangs).toHaveLength(2)
  })

  it('1-08 yardangs 数组类型正确', () => {
    expect(Array.isArray((sys as any).yardangs)).toBe(true)
  })
})

// ═══════════════════════════════════════════
// 2. CHECK_INTERVAL 节流
// ═══════════════════════════════════════════
describe('2. CHECK_INTERVAL 节流', () => {
  let sys: WorldYardangSystem
  let world: any
  let em: any

  beforeEach(() => {
    sys   = makeSys()
    world = makeMockWorld(SAND)
    em    = makeMockEM()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
  })

  afterEach(() => vi.restoreAllMocks())

  it('2-01 tick=0 时不触发（< CHECK_INTERVAL）', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('2-02 tick < CHECK_INTERVAL 不���发', () => {
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('2-03 tick === CHECK_INTERVAL 恰好触发', () => {
    sys.update(1, world, em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('2-04 触发后 lastCheck 更新为当前 tick', () => {
    sys.update(1, world, em, TICK0)
    expect((sys as any).lastCheck).toBe(TICK0)
  })

  it('2-05 触发后立即再次调用（相同 tick）不再触发', () => {
    sys.update(1, world, em, TICK0)
    sys.update(1, world, em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('2-06 第二次触发需满足再次间隔（差 1 不够）', () => {
    sys.update(1, world, em, TICK0)
    sys.update(1, world, em, TICK0 + CHECK_INTERVAL - 1)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('2-07 第二次 CHECK_INTERVAL 后再次触发', () => {
    sys.update(1, world, em, TICK0)
    sys.update(1, world, em, TICK0 + CHECK_INTERVAL)
    expect((sys as any).yardangs).toHaveLength(2)
  })

  it('2-08 lastCheck 始终跟踪最新触发 tick', () => {
    const t2 = TICK0 + CHECK_INTERVAL
    sys.update(1, world, em, TICK0)
    sys.update(1, world, em, t2)
    expect((sys as any).lastCheck).toBe(t2)
  })
})

// ═══════════════════════════════════════════
// 3. spawn 条件
// ═══════════════════════════════════════════
describe('3. spawn 条件', () => {
  let sys: WorldYardangSystem
  let em: any

  beforeEach(() => { sys = makeSys(); em = makeMockEM(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('3-01 SAND tile 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('3-02 MOUNTAIN tile 允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeMockWorld(MOUNTAIN), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('3-03 WATER tile 禁止 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeMockWorld(WATER), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('3-04 random >= FORM_CHANCE 不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('3-05 random 恰好等于 FORM_CHANCE 不 spawn（严格 <）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('3-06 random 略小于 FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('3-07 tile=3（草地）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeMockWorld(3), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('3-08 已满 MAX_YARDANGS 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < MAX_YARDANGS; i++) {
      ;(sys as any).yardangs.push(makeYardang())
    }
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(MAX_YARDANGS)
  })

  it('3-09 未满时可继续 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < MAX_YARDANGS - 1; i++) {
      ;(sys as any).yardangs.push(makeYardang())
    }
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(MAX_YARDANGS)
  })
})

// ═══════════════════════════════════════════
// 4. spawn 后字段值范围
// ═══════════════════════════════════════════
describe('4. spawn 后字段值范围', () => {
  afterEach(() => vi.restoreAllMocks())

  // 每个字段读取的是 Math.random 第几次调用（0-based）:
  // 0: FORM_CHANCE check
  // 1: x coord
  // 2: y coord
  // 3: length
  // 4: height
  // 5: windDirection
  // 6: erosionStage
  // 7: rockHardness
  // 8: spectacle
  // 9: update erosionStage (< 0.001)
  // 10: update spectacle delta (v-0.47)*0.09

  function makeSeq(fieldIdx: number, fieldVal: number, erosionUpdate = 0.5, spectacleUpdate = 0.5): number[] {
    const seq = new Array(11).fill(0.0001)
    seq[0] = 0.0001  // FORM_CHANCE: pass
    seq[fieldIdx] = fieldVal
    seq[9]  = erosionUpdate
    seq[10] = spectacleUpdate
    return seq
  }

  it('4-01 length 最小值（rand=0）→ 15', () => {
    const y = spawnOne(makeSeq(3, 0))!
    // seq[3]=0 → length = 15 + 0 * 50 = 15
    expect(y.length).toBeCloseTo(15, 3)
  })

  it('4-02 length 最大值（rand=0.9999）→ 接近 65', () => {
    const y = spawnOne(makeSeq(3, 0.9999))!
    expect(y.length).toBeCloseTo(15 + 0.9999 * 50, 2)
    expect(y.length).toBeLessThan(65)
    expect(y.length).toBeGreaterThanOrEqual(15)
  })

  it('4-03 height 最小值（rand=0）→ 3', () => {
    const y = spawnOne(makeSeq(4, 0))!
    expect(y.height).toBeCloseTo(3, 4)
  })

  it('4-04 height 最大值（rand=0.9999）→ 接近 23', () => {
    const y = spawnOne(makeSeq(4, 0.9999))!
    expect(y.height).toBeCloseTo(3 + 0.9999 * 20, 2)
    expect(y.height).toBeLessThan(23)
    expect(y.height).toBeGreaterThanOrEqual(3)
  })

  it('4-05 windDirection（rand=0）→ 0', () => {
    const y = spawnOne(makeSeq(5, 0))!
    expect(y.windDirection).toBeCloseTo(0, 5)
  })

  it('4-06 windDirection（rand=0.5）→ 180', () => {
    const y = spawnOne(makeSeq(5, 0.5))!
    expect(y.windDirection).toBeCloseTo(180, 2)
  })

  it('4-07 windDirection 在 [0, 360) 范围内', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const y = spawnOne(makeSeq(5, v))!
      expect(y.windDirection).toBeGreaterThanOrEqual(0)
      expect(y.windDirection).toBeLessThan(360)
    }
  })

  it('4-08 erosionStage rand=0 → 1（spawn时）', () => {
    // seq[6]=0 → erosionStage = 1 + floor(0*4) = 1
    // seq[9]=0.5 → update时 0.5 >= 0.001，不+1，保持1
    const y = spawnOne(makeSeq(6, 0, 0.5))!
    expect(y.erosionStage).toBe(1)
  })

  it('4-09 erosionStage rand=0.999 → 4（spawn时）', () => {
    // seq[6]=0.999 → 1 + floor(0.999*4) = 1+3 = 4
    // seq[9]=0.5 → 不+1，保持4
    const y = spawnOne(makeSeq(6, 0.999, 0.5))!
    expect(y.erosionStage).toBe(4)
  })

  it('4-10 erosionStage spawn 范围 [1,4]', () => {
    for (const v of [0, 0.249, 0.25, 0.499, 0.5, 0.749, 0.75, 0.999]) {
      const y = spawnOne(makeSeq(6, v, 0.5))!
      const stage = y.erosionStage
      expect(stage).toBeGreaterThanOrEqual(1)
      expect(stage).toBeLessThanOrEqual(4)
    }
  })

  it('4-11 rockHardness 最小（rand=0）→ 20', () => {
    const y = spawnOne(makeSeq(7, 0))!
    expect(y.rockHardness).toBeCloseTo(20, 4)
  })

  it('4-12 rockHardness 最大（rand=0.9999）→ 接近 80', () => {
    const y = spawnOne(makeSeq(7, 0.9999))!
    expect(y.rockHardness).toBeCloseTo(20 + 0.9999 * 60, 2)
    expect(y.rockHardness).toBeLessThan(80)
    expect(y.rockHardness).toBeGreaterThanOrEqual(20)
  })

  it('4-13 spectacle spawn 后在 [5, 55] 范围内（含 update 一次后）', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const y = spawnOne(makeSeq(8, v, 0.5, 0.5))!
      expect(y.spectacle).toBeGreaterThanOrEqual(5)
      expect(y.spectacle).toBeLessThanOrEqual(55)
    }
  })

  it('4-14 spawn 后 tick 等于传入 tick', () => {
    const y = spawnOne(SEQ_MIN)!
    expect(y.tick).toBe(TICK0)
  })

  it('4-15 spawn 后 id 从 1 开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const sys = makeSys()
    const em  = makeMockEM()
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    sys.update(1, makeMockWorld(SAND), em, TICK0 + CHECK_INTERVAL)
    const ids = (sys as any).yardangs.map((y: Yardang) => y.id)
    expect(ids).toContain(1)
    expect(ids).toContain(2)
  })
})

// ═══════════════════════════════════════════
// 5. update 字段变更
// ═══════════════════════════════════════════
describe('5. update 字段变更', () => {
  let sys: WorldYardangSystem
  let em: any

  beforeEach(() => {
    sys   = makeSys()
    em    = makeMockEM()
    nextId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  function insertAndRun(yardang: Yardang, rand: number, tick = TICK0): Yardang {
    ;(sys as any).yardangs.push(yardang)
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(rand)
    sys.update(1, makeMockWorld(WATER), em, tick)
    return (sys as any).yardangs[0] as Yardang
  }

  it('5-01 height 每次��新减少 0.00001', () => {
    const base = makeYardang({ height: 5, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.height).toBeCloseTo(5 - 0.00001, 8)
  })

  it('5-02 height 不低于 1（地板）', () => {
    const base = makeYardang({ height: 1, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.height).toBe(1)
  })

  it('5-03 rockHardness 每次更新减少 0.00002', () => {
    const base = makeYardang({ rockHardness: 50, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.rockHardness).toBeCloseTo(50 - 0.00002, 8)
  })

  it('5-04 rockHardness 不低于 10（地板）', () => {
    const base = makeYardang({ rockHardness: 10, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.rockHardness).toBe(10)
  })

  it('5-05 erosionStage 在 rand < 0.001 时 +1', () => {
    const base = makeYardang({ erosionStage: 2, tick: TICK0 })
    const y = insertAndRun(base, 0.0009)
    expect(y.erosionStage).toBe(3)
  })

  it('5-06 erosionStage 在 rand >= 0.001 时不变', () => {
    const base = makeYardang({ erosionStage: 2, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.erosionStage).toBe(2)
  })

  it('5-07 erosionStage 上限为 5', () => {
    const base = makeYardang({ erosionStage: 5, tick: TICK0 })
    const y = insertAndRun(base, 0.0001)
    expect(y.erosionStage).toBe(5)
  })

  it('5-08 erosionStage 下限为 1（不会低于 1）', () => {
    const base = makeYardang({ erosionStage: 1, tick: TICK0 })
    const y = insertAndRun(base, 0.5)
    expect(y.erosionStage).toBeGreaterThanOrEqual(1)
  })

  it('5-09 spectacle rand=0 时减少（(0-0.47)*0.09）', () => {
    const base = makeYardang({ spectacle: 30, tick: TICK0 })
    const y = insertAndRun(base, 0)
    expect(y.spectacle).toBeCloseTo(30 + (0 - 0.47) * 0.09, 5)
  })

  it('5-10 spectacle rand=1 时增加（(1-0.47)*0.09）', () => {
    const base = makeYardang({ spectacle: 30, tick: TICK0 })
    const y = insertAndRun(base, 1)
    expect(y.spectacle).toBeCloseTo(30 + (1 - 0.47) * 0.09, 5)
  })

  it('5-11 spectacle 上限为 55', () => {
    const base = makeYardang({ spectacle: 55, tick: TICK0 })
    const y = insertAndRun(base, 1)
    expect(y.spectacle).toBe(55)
  })

  it('5-12 spectacle 下限为 5', () => {
    const base = makeYardang({ spectacle: 5, tick: TICK0 })
    const y = insertAndRun(base, 0)
    expect(y.spectacle).toBe(5)
  })

  it('5-13 多个风蚀垄各自独立更新 height', () => {
    const y1 = makeYardang({ height: 10, tick: TICK0 })
    const y2 = makeYardang({ height: 20, tick: TICK0 })
    ;(sys as any).yardangs.push(y1, y2)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeMockWorld(WATER), em, TICK0)
    const arr = (sys as any).yardangs as Yardang[]
    expect(arr[0].height).toBeCloseTo(10 - 0.00001, 8)
    expect(arr[1].height).toBeCloseTo(20 - 0.00001, 8)
  })
})

// ═══════════════════════════════════════════
// 6. cleanup 逻辑（tick 过期删除）
// ═══════════════════════════════════════════
describe('6. cleanup 逻辑', () => {
  const LIFETIME = 92000

  let sys: WorldYardangSystem
  let em: any

  beforeEach(() => {
    sys   = makeSys()
    em    = makeMockEM()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => vi.restoreAllMocks())

  function triggerUpdate(currentTick: number) {
    ;(sys as any).lastCheck = 0
    sys.update(1, makeMockWorld(WATER), em, currentTick)
  }

  it('6-01 tick 未超期不删除（差 1 到期）', () => {
    const currentTick = TICK0
    const yardangTick = currentTick - LIFETIME + 1
    ;(sys as any).yardangs.push(makeYardang({ tick: yardangTick }))
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('6-02 tick 恰好等于 cutoff 不删除（严格 < 才删除）', () => {
    const currentTick = TICK0
    const cutoff = currentTick - LIFETIME
    ;(sys as any).yardangs.push(makeYardang({ tick: cutoff }))
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('6-03 tick 比 cutoff 小 1 则删除', () => {
    const currentTick = TICK0
    const cutoff = currentTick - LIFETIME
    ;(sys as any).yardangs.push(makeYardang({ tick: cutoff - 1 }))
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('6-04 过期的删除，未过期的保留', () => {
    const currentTick = TICK0
    const cutoff = currentTick - LIFETIME
    ;(sys as any).yardangs.push(makeYardang({ tick: cutoff - 100 }))
    ;(sys as any).yardangs.push(makeYardang({ tick: currentTick }))
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(1)
    expect((sys as any).yardangs[0].tick).toBe(currentTick)
  })

  it('6-05 多个过期全部删除', () => {
    const currentTick = TICK0
    const cutoff = currentTick - LIFETIME
    for (let i = 0; i < 5; i++) {
      ;(sys as any).yardangs.push(makeYardang({ tick: cutoff - i - 1 }))
    }
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('6-06 tick=0 的风蚀垄在高 tick 时被删除', () => {
    const currentTick = LIFETIME + 1
    ;(sys as any).yardangs.push(makeYardang({ tick: 0 }))
    triggerUpdate(currentTick)
    // cutoff = LIFETIME+1-LIFETIME = 1; yardang.tick=0 < 1 → 删除
    expect((sys as any).yardangs).toHaveLength(0)
  })

  it('6-07 cleanup 后 nextId 不受影响', () => {
    const idBefore = (sys as any).nextId
    const currentTick = TICK0
    ;(sys as any).yardangs.push(makeYardang({ tick: 0 }))
    triggerUpdate(currentTick)
    expect((sys as any).nextId).toBe(idBefore)
  })

  it('6-08 cleanup 从列表尾部往前删（不跳过元素）', () => {
    const currentTick = TICK0
    const cutoff = currentTick - LIFETIME
    // 奇数位过期，偶数位未过期
    ;(sys as any).yardangs.push(makeYardang({ tick: cutoff - 1 }))  // 删
    ;(sys as any).yardangs.push(makeYardang({ tick: currentTick })) // 留
    ;(sys as any).yardangs.push(makeYardang({ tick: cutoff - 1 }))  // 删
    ;(sys as any).yardangs.push(makeYardang({ tick: currentTick })) // 留
    triggerUpdate(currentTick)
    expect((sys as any).yardangs).toHaveLength(2)
    ;(sys as any).yardangs.forEach((y: Yardang) => {
      expect(y.tick).toBe(currentTick)
    })
  })
})

// ═══════════════════════════════════════════
// 7. MAX_YARDANGS ��限
// ═══════════════════════════════════════════
describe('7. MAX_YARDANGS 上限', () => {
  let sys: WorldYardangSystem
  let em: any

  beforeEach(() => {
    sys   = makeSys()
    em    = makeMockEM()
    nextId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  it('7-01 恰好 MAX_YARDANGS 时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < MAX_YARDANGS; i++) {
      ;(sys as any).yardangs.push(makeYardang({ tick: TICK0 }))
    }
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(MAX_YARDANGS)
  })

  it('7-02 低于 MAX_YARDANGS 时允许 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < MAX_YARDANGS - 1; i++) {
      ;(sys as any).yardangs.push(makeYardang({ tick: TICK0 }))
    }
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    expect((sys as any).yardangs).toHaveLength(MAX_YARDANGS)
  })

  it('7-03 手动注入超额时不触发额外 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    for (let i = 0; i < MAX_YARDANGS + 2; i++) {
      ;(sys as any).yardangs.push(makeYardang({ tick: TICK0 }))
    }
    const before = (sys as any).yardangs.length
    sys.update(1, makeMockWorld(SAND), em, TICK0)
    // spawn 被 MAX 守卫拦截，但 cleanup 只按 tick，不删未过期的
    expect((sys as any).yardangs.length).toBe(before)
  })

  it('7-04 MAX_YARDANGS 的值为 15', () => {
    expect(MAX_YARDANGS).toBe(15)
  })

  it('7-05 cleanup 后低于上限，下次触发可重新 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    // 注入 MAX 个已过期 yardang（tick=0）
    for (let i = 0; i < MAX_YARDANGS; i++) {
      ;(sys as any).yardangs.push(makeYardang({ tick: 0 }))
    }
    // highTick 足够让 tick=0 的全部过期: cutoff = highTick - 92000 > 0
    // 同时满足 CHECK_INTERVAL
    // 注意：update 执行顺序是 spawn先 → 再update各字段 → 再cleanup
    // spawn 时 yardangs.length = MAX → 不 spawn
    // cleanup 后 = 0
    // 需要第二次 update 才能 spawn
    const highTick = 92001 + CHECK_INTERVAL
    ;(sys as any).lastCheck = 0
    sys.update(1, makeMockWorld(SAND), em, highTick)
    // 第一次：spawn 被 MAX 挡住（先spawn，后cleanup）→ yardangs=0 after cleanup
    expect((sys as any).yardangs).toHaveLength(0)
    // 第二次触发：此时 yardangs=0 < MAX，可以 spawn
    ;(sys as any).lastCheck = 0
    sys.update(1, makeMockWorld(SAND), em, highTick + CHECK_INTERVAL)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('7-06 连续触发最终达到 MAX 上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    for (let i = 0; i < MAX_YARDANGS + 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, world, em, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).yardangs.length).toBeLessThanOrEqual(MAX_YARDANGS)
  })
})

// ═══════════════════════════════════════════
// 8. 边界验证
// ═══════════════════════════════════════════
describe('8. 边界验证', () => {
  let sys: WorldYardangSystem
  let em: any

  beforeEach(() => {
    sys   = makeSys()
    em    = makeMockEM()
    nextId = 1
  })

  afterEach(() => vi.restoreAllMocks())

  it('8-01 CHECK_INTERVAL 常量值为 2580', () => {
    expect(CHECK_INTERVAL).toBe(2580)
  })

  it('8-02 FORM_CHANCE 常量值为 0.0014', () => {
    expect(FORM_CHANCE).toBeCloseTo(0.0014, 6)
  })

  it('8-03 getTile 被调用时传入 SAND 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    sys.update(1, world, em, TICK0)
    expect(world.getTile).toHaveBeenCalled()
  })

  it('8-04 WATER tile 时 getTile 依然被调用', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(WATER)
    sys.update(1, world, em, TICK0)
    expect(world.getTile).toHaveBeenCalled()
  })

  it('8-05 不触发时（tick 不够）getTile 不被调用', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })

  it('8-06 spawn 后 id 单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, world, em, TICK0 + i * CHECK_INTERVAL)
    }
    const arr = (sys as any).yardangs as Yardang[]
    expect(arr[0].id).toBeLessThan(arr[1].id)
    expect(arr[1].id).toBeLessThan(arr[2].id)
  })

  it('8-07 world.width/height 限制生成坐标范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const smallWorld = { width: 30, height: 30, getTile: vi.fn().mockReturnValue(SAND) } as any
    sys.update(1, smallWorld, em, TICK0)
    const y = (sys as any).yardangs[0] as Yardang
    // x = 10 + floor(0.0001 * 10) = 10
    expect(y.x).toBeGreaterThanOrEqual(10)
    expect(y.x).toBeLessThan(20)
  })

  it('8-08 dt 参数对逻辑无影响（只受 tick 控制）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    sys.update(99999, world, em, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('8-09 em 参数不影响核心逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeMockWorld(SAND), null as any, TICK0)
    expect((sys as any).yardangs).toHaveLength(1)
  })

  it('8-10 连续多次 CHECK_INTERVAL 后状态正确累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    const world = makeMockWorld(SAND)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, world, em, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).yardangs.length).toBe(5)
  })
})
