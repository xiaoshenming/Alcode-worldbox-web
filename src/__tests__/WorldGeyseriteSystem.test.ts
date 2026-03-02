import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeyseriteSystem } from '../systems/WorldGeyseriteSystem'
import type { GeyseriteDeposit } from '../systems/WorldGeyseriteSystem'

const CHECK_INTERVAL = 2780
const MAX_DEPOSITS = 6

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldGeyseriteSystem { return new WorldGeyseriteSystem() }
let nextId = 1
function makeDeposit(overrides: Partial<GeyseriteDeposit> = {}): GeyseriteDeposit {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    silicaContent: 60,
    layerThickness: 10,
    crystallinity: 20,
    thermalProximity: 50,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

describe('WorldGeyseriteSystem', () => {
  let sys: WorldGeyseriteSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 基础状态 ---
  it('初始无硅华沉积', () => {
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // --- CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL 时跳过执行，lastCheck 不变', () => {
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('连续调用：第二次在间隔内则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用：第二次达到间隔时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- spawn 阻断 ---
  it('random=0.9 时不 spawn（大于 FORM_CHANCE=0.0007）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('random=0 时 spawn 一个 deposit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
  })

  // --- MAX_DEPOSITS 上限 ---
  it('达到 MAX_DEPOSITS 时不再新增', () => {
    for (let i = 0; i < MAX_DEPOSITS; i++) {
      ;(sys as any).deposits.push(makeDeposit({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits.length).toBe(MAX_DEPOSITS)
  })

  it('deposits 数量小于 MAX_DEPOSITS 时允许 spawn', () => {
    for (let i = 0; i < MAX_DEPOSITS - 1; i++) {
      ;(sys as any).deposits.push(makeDeposit({ age: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits.length).toBe(MAX_DEPOSITS)
  })

  // --- spawn 字段范围 ---
  it('spawn 后 silicaContent 在 [40,75] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.silicaContent).toBeGreaterThanOrEqual(40)
    expect(d.silicaContent).toBeLessThanOrEqual(75)
  })

  it('spawn 后 layerThickness 在 [5,20] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.layerThickness).toBeGreaterThanOrEqual(5)
    expect(d.layerThickness).toBeLessThanOrEqual(20)
  })

  it('spawn 后 crystallinity 在 [10,35] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.crystallinity).toBeGreaterThanOrEqual(10)
    expect(d.crystallinity).toBeLessThanOrEqual(35)
  })

  // spawn 后同一 update 周期内 thermalProximity 立即 decay -0.004，Math.max(10,...) 保底
  // 所以实际可观测下界是 10（保底值），上界是 70
  it('spawn 后 thermalProximity 在 [10,70] 范围内（decay 后）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.thermalProximity).toBeGreaterThanOrEqual(10)
    expect(d.thermalProximity).toBeLessThanOrEqual(70)
  })

  // spawn 后同一 update 周期内 age 立即 += 0.003，所以观测值为 0.003 而非 0
  it('spawn 后 age 初始为 0，update 后变为 0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.age).toBeCloseTo(0.003, 4)
  })

  it('spawn 后 id 为 1（nextId 从 1 开始）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const d: GeyseriteDeposit = (sys as any).deposits[0]
    expect(d.id).toBe(1)
  })

  // --- cleanup 逻辑（age >= 96 删除） ---
  it('age >= 96 时记录被删除', () => {
    ;(sys as any).deposits.push(makeDeposit({ age: 96 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // age 先增 0.003 -> 96.003，触发 !(age < 96) -> 删除
    expect((sys as any).deposits).toHaveLength(0)
  })

  it('age < 96 时记录保留', () => {
    ;(sys as any).deposits.push(makeDeposit({ age: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('混合情况：高 age 删除，低 age 保留', () => {
    ;(sys as any).deposits.push(makeDeposit({ age: 96, id: 100 }))
    ;(sys as any).deposits.push(makeDeposit({ age: 10, id: 101 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const deposits: GeyseriteDeposit[] = (sys as any).deposits
    expect(deposits).toHaveLength(1)
    expect(deposits[0].id).toBe(101)
  })

  it('多个过期记录全部删除', () => {
    ;(sys as any).deposits.push(makeDeposit({ age: 97 }))
    ;(sys as any).deposits.push(makeDeposit({ age: 98 }))
    ;(sys as any).deposits.push(makeDeposit({ age: 99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).deposits).toHaveLength(0)
  })

  // --- 动态字段更新 ---
  it('每次 update age 增加 0.003', () => {
    const d = makeDeposit({ age: 10 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.age).toBeCloseTo(10.003, 4)
  })

  it('每次 update layerThickness 增加 0.008（上限 75）', () => {
    const d = makeDeposit({ layerThickness: 10, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.layerThickness).toBeCloseTo(10.008, 4)
  })

  it('layerThickness 不超过上限 75', () => {
    const d = makeDeposit({ layerThickness: 75, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.layerThickness).toBe(75)
  })

  it('每次 update crystallinity 增加 0.006（上限 85）', () => {
    const d = makeDeposit({ crystallinity: 20, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.crystallinity).toBeCloseTo(20.006, 4)
  })

  it('crystallinity 不超过上限 85', () => {
    const d = makeDeposit({ crystallinity: 85, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.crystallinity).toBe(85)
  })

  it('每次 update thermalProximity 减少 0.004（下限 10）', () => {
    const d = makeDeposit({ thermalProximity: 50, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.thermalProximity).toBeCloseTo(49.996, 4)
  })

  it('thermalProximity 不低于下限 10', () => {
    const d = makeDeposit({ thermalProximity: 10, age: 0 })
    ;(sys as any).deposits.push(d)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(d.thermalProximity).toBe(10)
  })

  // --- 注入查询 ---
  it('注入后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(1)
  })

  it('多个硅华沉积全部返回', () => {
    ;(sys as any).deposits.push(makeDeposit())
    ;(sys as any).deposits.push(makeDeposit())
    expect((sys as any).deposits).toHaveLength(2)
  })
})
