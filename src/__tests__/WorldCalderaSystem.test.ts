import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCalderaSystem } from '../systems/WorldCalderaSystem'
import type { Caldera } from '../systems/WorldCalderaSystem'

const CHECK_INTERVAL = 2750
const MAX_CALDERAS = 6
const FORM_CHANCE = 0.0008

// CalderaSystem spawn 不检查 tile，getTile 无影响
const world = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

function makeSys(): WorldCalderaSystem { return new WorldCalderaSystem() }
let nextId = 1
function makeCaldera(overrides: Partial<Caldera> = {}): Caldera {
  return {
    id: nextId++,
    x: 50, y: 50,
    diameter: 20,
    lakeDepth: 10,
    resurgentDome: 5,
    geothermalActivity: 80,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldCalderaSystem', () => {
  let sys: WorldCalderaSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无破火山口', () => {
    expect((sys as any).calderas).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).calderas.push(makeCaldera())
    expect((sys as any).calderas).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).calderas).toBe((sys as any).calderas)
  })

  it('破火山口字段正确', () => {
    ;(sys as any).calderas.push(makeCaldera())
    const c = (sys as any).calderas[0]
    expect(c.diameter).toBe(20)
    expect(c.geothermalActivity).toBe(80)
    expect(c.lakeDepth).toBe(10)
    expect(c.resurgentDome).toBe(5)
    expect(c.age).toBe(0)
  })

  it('多个破火山口全部返回', () => {
    ;(sys as any).calderas.push(makeCaldera())
    ;(sys as any).calderas.push(makeCaldera())
    expect((sys as any).calderas).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).calderas).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn：random < FORM_CHANCE ───────────────────────────────

  it('random=0.9（> FORM_CHANCE）时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(0)
  })

  it('random=0.0001（< FORM_CHANCE）时 spawn 一个破火山口', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(1)
  })

  it('spawn 的破火山口 lakeDepth 初始为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    // lakeDepth 初始化为 0，然后 +0.01 = 0.01
    expect((sys as any).calderas[0].lakeDepth).toBeCloseTo(0.01, 5)
  })

  it('spawn 的破火山口 age 初始经 update 后为 0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].age).toBeCloseTo(0.005, 5)
  })

  // ── 字段更新 ─────────────────────────────────────────────────

  it('update 后 age += 0.005', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 1.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].age).toBeCloseTo(1.005, 5)
  })

  it('update 后 lakeDepth += 0.01（未达上限 80）', () => {
    ;(sys as any).calderas.push(makeCaldera({ lakeDepth: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].lakeDepth).toBeCloseTo(10.01, 5)
  })

  it('lakeDepth 达到 80 时不再增加（Math.min 上限）', () => {
    ;(sys as any).calderas.push(makeCaldera({ lakeDepth: 80 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].lakeDepth).toBe(80)
  })

  it('update 后 geothermalActivity -= 0.005（未达下限 5）', () => {
    ;(sys as any).calderas.push(makeCaldera({ geothermalActivity: 80 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].geothermalActivity).toBeCloseTo(79.995, 5)
  })

  it('geothermalActivity 降至 5 时不再减少（Math.max 下限）', () => {
    ;(sys as any).calderas.push(makeCaldera({ geothermalActivity: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].geothermalActivity).toBe(5)
  })

  it('update 后 resurgentDome += 0.003（未达上限 100）', () => {
    ;(sys as any).calderas.push(makeCaldera({ resurgentDome: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].resurgentDome).toBeCloseTo(10.003, 5)
  })

  it('resurgentDome 达到 100 时不再增加（Math.min 上限）', () => {
    ;(sys as any).calderas.push(makeCaldera({ resurgentDome: 100 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].resurgentDome).toBe(100)
  })

  // ── cleanup：age >= 100 时删除 ────────────────────────────────

  it('age=99.995 的 caldera 经 update (+0.005) 后 age=100 被清理', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 99.995 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(0)
  })

  it('age=0 的 caldera 经 update (+0.005) 后 age=0.005 保留', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(1)
  })

  it('同时有 age>=100 和 age<100 的，只删前者', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 99.995 })) // 更新后=100 → 删除
    ;(sys as any).calderas.push(makeCaldera({ age: 50 }))     // 更新后=50.005 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(1)
    expect((sys as any).calderas[0].age).toBeCloseTo(50.005, 5)
  })

  // ── MAX_CALDERAS 上限 ─────────────────────────────────────────

  it('注入 MAX_CALDERAS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_CALDERAS; i++) {
      ;(sys as any).calderas.push(makeCaldera({ age: 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < FORM_CHANCE
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, CHECK_INTERVAL)
    // age 1+0.005=1.005 < 100, 全部保留，且上限阻止 spawn
    expect((sys as any).calderas).toHaveLength(MAX_CALDERAS)
  })

  // ── 追加扩展测试 ──────────────────────────────────────────────
  it('追加-calderas数组是Array', () => {
    expect(Array.isArray((sys as any).calderas)).toBe(true)
  })
  it('追加-nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('追加-lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('追加-spawn的破火山口nextId自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('追加-age=99持续更新未被删除', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 99 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(1)
    expect((sys as any).calderas[0].age).toBeCloseTo(99.005, 5)
  })
  it('追加-3个同时过期的calderas全被删除', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 99.995 }))
    ;(sys as any).calderas.push(makeCaldera({ age: 99.995 }))
    ;(sys as any).calderas.push(makeCaldera({ age: 99.995 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toHaveLength(0)
  })
  it('追加-多次注入后length正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).calderas.push(makeCaldera())
    }
    expect((sys as any).calderas).toHaveLength(5)
  })
  it('追加-lakeDepth初始为10', () => {
    ;(sys as any).calderas.push(makeCaldera({ lakeDepth: 10 }))
    expect((sys as any).calderas[0].lakeDepth).toBe(10)
  })
  it('追加-diameter字段正确', () => {
    ;(sys as any).calderas.push(makeCaldera({ diameter: 25 }))
    expect((sys as any).calderas[0].diameter).toBe(25)
  })
  it('追加-MAX_CALDERAS-1个时还可继续spawn', () => {
    for (let i = 0; i < MAX_CALDERAS - 1; i++) {
      ;(sys as any).calderas.push(makeCaldera({ age: 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas.length).toBeLessThanOrEqual(MAX_CALDERAS)
  })
  it('追加-update后calderas引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const ref = (sys as any).calderas
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas).toBe(ref)
  })
  it('追加-lakeDepth在[0,80]范围内', () => {
    ;(sys as any).calderas.push(makeCaldera({ lakeDepth: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].lakeDepth).toBeLessThanOrEqual(80)
    expect((sys as any).calderas[0].lakeDepth).toBeGreaterThanOrEqual(0)
  })
  it('追加-geothermalActivity在[5,80]范围内', () => {
    ;(sys as any).calderas.push(makeCaldera({ geothermalActivity: 40 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].geothermalActivity).toBeGreaterThanOrEqual(5)
    expect((sys as any).calderas[0].geothermalActivity).toBeLessThanOrEqual(80)
  })
  it('追加-resurgentDome在[0,100]范围内', () => {
    ;(sys as any).calderas.push(makeCaldera({ resurgentDome: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].resurgentDome).toBeGreaterThanOrEqual(0)
    expect((sys as any).calderas[0].resurgentDome).toBeLessThanOrEqual(100)
  })
  it('追加-spawn时tick字段为当前tick值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].tick).toBe(CHECK_INTERVAL)
  })
  it('追加-tick=0时update不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, 0)
    expect((sys as any).calderas).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('追加-连续触发lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    const lc1 = (sys as any).lastCheck
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('追加-spawn破火山口x坐标在世界范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const c = (sys as any).calderas[0]
    expect(c.x).toBeGreaterThanOrEqual(0)
    expect(c.x).toBeLessThan(200)
  })
  it('追加-spawn破火山口y坐标在世界范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const c = (sys as any).calderas[0]
    expect(c.y).toBeGreaterThanOrEqual(0)
    expect(c.y).toBeLessThan(200)
  })
  it('追加-age字段增量准确', () => {
    ;(sys as any).calderas.push(makeCaldera({ age: 5.0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).calderas[0].age).toBeCloseTo(5.005, 5)
  })
  it('追加-calderas.splice正确', () => {
    ;(sys as any).calderas.push(makeCaldera())
    ;(sys as any).calderas.push(makeCaldera())
    ;(sys as any).calderas.splice(0, 1)
    expect((sys as any).calderas).toHaveLength(1)
  })
  it('追加-caldera id字段为正整数', () => {
    ;(sys as any).calderas.push(makeCaldera())
    expect((sys as any).calderas[0].id).toBeGreaterThan(0)
  })
  it('追加-caldera默认age为0', () => {
    ;(sys as any).calderas.push(makeCaldera())
    expect((sys as any).calderas[0].age).toBe(0)
  })
})

// Final extra tests
describe('WorldCalderaSystem - 最终补充', () => {
  let sys: WorldCalderaSystem
  beforeEach(() => { sys = new WorldCalderaSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })
  const w = { width: 200, height: 200, getTile: () => 0 } as any
  const e = {} as any
  const CI = 2750
  it('补充-spawn两次nextId=3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, w, e, CI)
    ;(sys as any).lastCheck = 0
    sys.update(1, w, e, CI)
    expect((sys as any).nextId).toBe(3)
  })
  it('补充-spawn的破火山口active字段不存在（无active）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, w, e, CI)
    expect((sys as any).calderas[0].active).toBeUndefined()
  })
  it('补充-updatey大量caldera后all均存在', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).calderas.push({ id: i+1, x: 10, y: 10, diameter: 20, lakeDepth: 0, resurgentDome: 10, geothermalActivity: 40, age: 1, tick: 0 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, w, e, CI)
    expect((sys as any).calderas.length).toBe(5)
  })
})
