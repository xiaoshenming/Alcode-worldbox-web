import { describe, it, expect, beforeEach, vi } from 'vitest'
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
})
