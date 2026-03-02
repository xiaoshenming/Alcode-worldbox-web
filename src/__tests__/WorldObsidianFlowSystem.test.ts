import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldObsidianFlowSystem } from '../systems/WorldObsidianFlowSystem'
import type { ObsidianFlow } from '../systems/WorldObsidianFlowSystem'
import { TileType } from '../utils/Constants'

// --- 常量（与源码保持一致）---
const CHECK_INTERVAL = 2700
const MAX_FLOWS = 20
const FORM_CHANCE = 0.002
const CUTOFF_AGE = 88000

// --- 工具函数 ---
function makeSys(): WorldObsidianFlowSystem { return new WorldObsidianFlowSystem() }

let nextId = 1

function makeFlow(overrides: Partial<ObsidianFlow> = {}): ObsidianFlow {
  return {
    id: nextId++,
    x: 30, y: 40,
    radius: 10,
    glassThickness: 5,
    sharpness: 90,
    reflectance: 80,
    fractureDensity: 30,
    coolingRate: 40,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number | null = TileType.MOUNTAIN) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const em = {} as any

// ============================================================
// describe 1: 初始状态
// ============================================================
describe('WorldObsidianFlowSystem 初始状态', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 flows 为空数组', () => {
    expect((sys as any).flows).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).flows).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时执行检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('构造函数产生的实例相互独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).flows.push(makeFlow())
    expect((s2 as any).flows).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).flows.push(makeFlow())
    expect((sys as any).flows).toHaveLength(1)
  })
})

// ============================================================
// describe 2: CHECK_INTERVAL 节流
// ============================================================
describe('WorldObsidianFlowSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行（0-0=0 < 2700）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次调用间隔不足时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('满足间隔后 lastCheck 更新为新 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('节流期间注入的 flow 在下次触发时被 update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).flows.push(makeFlow({ glassThickness: 5, sharpness: 90, tick: CHECK_INTERVAL }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // glassThickness 在 update 时增加 0.001
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(5.001, 5)
  })

  it('两次满足间隔的调用会执行两次 update 逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).flows.push(makeFlow({ glassThickness: 5, tick: CHECK_INTERVAL }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    // 两次 update，每次 +0.001
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(5.002, 5)
  })

  it('间隔为 CHECK_INTERVAL-1 不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    ;(sys as any).flows.push(makeFlow({ glassThickness: 5, tick: 0 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).flows[0].glassThickness).toBe(5)
  })
})

// ============================================================
// describe 3: spawn 条件
// ============================================================
describe('WorldObsidianFlowSystem spawn 条件', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机值 < FORM_CHANCE 且 tile=MOUNTAIN(5) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001) // form check
      .mockReturnValueOnce(0.5)                  // x
      .mockReturnValueOnce(0.5)                  // y
      .mockReturnValue(0.5)                      // other randoms
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(1)
  })

  it('随机值 < FORM_CHANCE 且 tile=SAND(2) 时 spawn', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.SAND), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(1)
  })

  it('随机值 >= FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('tile=LAVA(7) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(FORM_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.LAVA), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(FORM_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.GRASS), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('tile=null 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(FORM_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(null), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('flows 数量达到 MAX_FLOWS 时不 spawn', () => {
    for (let i = 0; i < MAX_FLOWS; i++) {
      ;(sys as any).flows.push(makeFlow({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValueOnce(FORM_CHANCE - 0.0001).mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(MAX_FLOWS)
  })

  it('flows 数量为 MAX_FLOWS-1 时可以 spawn', () => {
    for (let i = 0; i < MAX_FLOWS - 1; i++) {
      ;(sys as any).flows.push(makeFlow({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows).toHaveLength(MAX_FLOWS)
  })

  it('spawn 后 id 递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn 坐标在 10~(w-10) 范围内', () => {
    const w = makeWorld(TileType.MOUNTAIN)
    // x = 10 + floor(random * (100-20)) = 10 + floor(0.5 * 80) = 10 + 40 = 50
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValue(0.5)
    sys.update(1, w, em, CHECK_INTERVAL)
    const f = (sys as any).flows[0]
    expect(f.x).toBe(50)
    expect(f.y).toBe(50)
  })
})

// ============================================================
// describe 4: spawn 字段范围
// ============================================================
describe('WorldObsidianFlowSystem spawn 字段范围', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('radius 最小值约 3（random=0 → floor(0*5)=0 → 3+0=3）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0)    // radius random → floor(0*5)=0 → 3
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    const f = (sys as any).flows[0]
    // after update: glassThickness增加,但radius不变
    expect(f.radius).toBe(3)
  })

  it('radius 最大值约 7（random接近1 → floor(0.99*5)=4 → 3+4=7）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.99) // radius random → floor(0.99*5)=4 → 7
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].radius).toBe(7)
  })

  it('glassThickness 范围 [2, 14]（spawn 时）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.5)  // radius
      .mockReturnValueOnce(0)    // glassThickness random → 2+0=2
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    // spawn 后立即 update: glassThickness = min(25, 2 + 0.001) = 2.001
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(2.001, 5)
  })

  it('coolingRate 范围 [20, 70]（spawn 时）', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.5)  // radius
      .mockReturnValueOnce(0.5)  // glassThickness
      .mockReturnValueOnce(0.5)  // sharpness
      .mockReturnValueOnce(0.5)  // reflectance
      .mockReturnValueOnce(0.5)  // fractureDensity
      .mockReturnValueOnce(0)    // coolingRate random → 20+0=20
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    // spawn 后 update: coolingRate = max(5, 20 - 0.01) = 19.99
    expect((sys as any).flows[0].coolingRate).toBeCloseTo(19.99, 3)
  })

  it('spawn 时 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].tick).toBe(CHECK_INTERVAL)
  })

  it('sharpness spawn 范围 [60, 90]', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.5)  // radius
      .mockReturnValueOnce(0.5)  // glassThickness
      .mockReturnValueOnce(0)    // sharpness random → 60+0=60
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    // after update: sharpness = max(30, 60 - 0.003) = 59.997
    expect((sys as any).flows[0].sharpness).toBeCloseTo(59.997, 5)
  })

  it('reflectance spawn 范围 [40, 80]', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE - 0.0001)
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.5)  // radius
      .mockReturnValueOnce(0.5)  // glassThickness
      .mockReturnValueOnce(0.5)  // sharpness
      .mockReturnValueOnce(0)    // reflectance random → 40+0=40
      .mockReturnValue(0.5)      // reflectance update random → 0.5, delta=0
    sys.update(1, makeWorld(TileType.MOUNTAIN), em, CHECK_INTERVAL)
    // reflectance after: max(20, min(90, 40 + (0.5-0.5)*0.15)) = max(20, min(90,40)) = 40
    expect((sys as any).flows[0].reflectance).toBeCloseTo(40, 3)
  })
})

// ============================================================
// describe 5: update 数值逻辑
// ============================================================
describe('WorldObsidianFlowSystem update 数值逻辑', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('glassThickness 每次 update 增加 0.001', () => {
    ;(sys as any).flows.push(makeFlow({ glassThickness: 10, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)  // 不 spawn
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(10.001, 5)
  })

  it('glassThickness 上限为 25', () => {
    ;(sys as any).flows.push(makeFlow({ glassThickness: 25, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].glassThickness).toBe(25)
  })

  it('sharpness 每次 update 减少 0.003', () => {
    ;(sys as any).flows.push(makeFlow({ sharpness: 70, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].sharpness).toBeCloseTo(69.997, 5)
  })

  it('sharpness 下限为 30', () => {
    ;(sys as any).flows.push(makeFlow({ sharpness: 30, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].sharpness).toBe(30)
  })

  it('fractureDensity 每次 update 增加 0.005', () => {
    ;(sys as any).flows.push(makeFlow({ fractureDensity: 30, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].fractureDensity).toBeCloseTo(30.005, 5)
  })

  it('fractureDensity 上限为 80', () => {
    ;(sys as any).flows.push(makeFlow({ fractureDensity: 80, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].fractureDensity).toBe(80)
  })

  it('coolingRate 每次 update 减少 0.01', () => {
    ;(sys as any).flows.push(makeFlow({ coolingRate: 40, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].coolingRate).toBeCloseTo(39.99, 3)
  })

  it('coolingRate 下限为 5', () => {
    ;(sys as any).flows.push(makeFlow({ coolingRate: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].coolingRate).toBe(5)
  })

  it('reflectance 保持在 [20, 90] 范围内', () => {
    ;(sys as any).flows.push(makeFlow({ reflectance: 90, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)  // delta = (0.002-0.5)*0.15 < 0
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].reflectance).toBeLessThanOrEqual(90)
    expect((sys as any).flows[0].reflectance).toBeGreaterThanOrEqual(20)
  })

  it('reflectance 下限为 20', () => {
    ;(sys as any).flows.push(makeFlow({ reflectance: 20, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(FORM_CHANCE)  // spawn check
      .mockReturnValueOnce(0)            // reflectance delta: (0-0.5)*0.15=-0.075 → max(20, min(90,19.925))=20
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].reflectance).toBe(20)
  })

  it('多个 flow 同时被 update', () => {
    ;(sys as any).flows.push(makeFlow({ glassThickness: 5, tick: CHECK_INTERVAL }))
    ;(sys as any).flows.push(makeFlow({ glassThickness: 8, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(5.001, 5)
    expect((sys as any).flows[1].glassThickness).toBeCloseTo(8.001, 5)
  })
})

// ============================================================
// describe 6: cleanup 逻辑（tick 过期）
// ============================================================
describe('WorldObsidianFlowSystem cleanup 逻辑', () => {
  let sys: WorldObsidianFlowSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 在 cutoff 之前的 flow 被删除（tick < cutoff）', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE  // = CHECK_INTERVAL
    ;(sys as any).flows.push(makeFlow({ tick: cutoff - 1 }))  // tick < cutoff → removed
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('tick 等于 cutoff 的 flow 被删除（tick < cutoff 为 false，即不删除）', () => {
    // 源码：if (this.flows[i].tick < cutoff) → 严格小于
    // tick == cutoff 时不满足 < cutoff，所以不删除
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE  // = CHECK_INTERVAL
    ;(sys as any).flows.push(makeFlow({ tick: cutoff }))  // tick == cutoff → 不删除
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(1)
  })

  it('tick 在 cutoff 之后的 flow 保留', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE
    ;(sys as any).flows.push(makeFlow({ tick: cutoff + 1 }))  // tick > cutoff → 保留
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(1)
  })

  it('部分过期的 flow 被清理，其余保留', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE
    ;(sys as any).flows.push(makeFlow({ tick: cutoff - 1000 }))  // 过期
    ;(sys as any).flows.push(makeFlow({ tick: cutoff + 1 }))     // 有效
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(1)
  })

  it('所有 flow 都过期时全部删除', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE
    ;(sys as any).flows.push(makeFlow({ tick: 0 }))
    ;(sys as any).flows.push(makeFlow({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(0)
  })

  it('cleanup 后不影响 nextId', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    ;(sys as any).flows.push(makeFlow({ tick: 0 }))
    ;(sys as any).nextId = 5
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).nextId).toBe(5)
  })

  it('cleanup 在 update 之后执行，update 仍有效', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    const cutoff = currentTick - CUTOFF_AGE
    // 有效的 flow
    ;(sys as any).flows.push(makeFlow({ tick: cutoff + 1, glassThickness: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    // flow 未被删除且 update 了
    expect((sys as any).flows).toHaveLength(1)
    expect((sys as any).flows[0].glassThickness).toBeCloseTo(5.001, 5)
  })

  it('tick=0 的 flow 在 cutoff>0 时被删除', () => {
    const currentTick = CUTOFF_AGE + CHECK_INTERVAL
    ;(sys as any).flows.push(makeFlow({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(), em, currentTick)
    expect((sys as any).flows).toHaveLength(0)
  })
})
