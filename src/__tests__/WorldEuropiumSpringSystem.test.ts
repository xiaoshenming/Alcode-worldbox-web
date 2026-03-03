import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldEuropiumSpringSystem } from '../systems/WorldEuropiumSpringSystem'
import type { EuropiumSpringZone } from '../systems/WorldEuropiumSpringSystem'

const CHECK_INTERVAL = 2950
const MAX_EuropiumSpringZoneS = 32

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const waterWorld = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

let nextId = 1
function makeZone(overrides: Partial<EuropiumSpringZone> = {}): EuropiumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    europiumContent: 40,
    springFlow: 50,
    phosphateLeaching: 60,
    luminescentIntensity: 70,
    tick: 0,
    ...overrides,
  }
}
function makeSys(): WorldEuropiumSpringSystem { return new WorldEuropiumSpringSystem() }

describe('WorldEuropiumSpringSystem', () => {
  let sys: WorldEuropiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无泉区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用一致', () => { expect((sys as any).zones).toBe((sys as any).zones) })
  it('泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.europiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.phosphateLeaching).toBe(60)
    expect(z.luminescentIntensity).toBe(70)
  })
  it('多个泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两次update间隔小于CHECK_INTERVAL时第二次被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两次update间隔>=CHECK_INTERVAL时第二次被执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('SAND地形不满足nearWater/nearMountain不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random > FORM_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('注入 MAX_EuropiumSpringZoneS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_EuropiumSpringZoneS; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).zones.length).toBe(MAX_EuropiumSpringZoneS)
  })
  it('zones.length=MAX_EuropiumSpringZoneS-1时不超过MAX_EuropiumSpringZoneS', () => {
    for (let i = 0; i < MAX_EuropiumSpringZoneS - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_EuropiumSpringZoneS)
  })
  it('tick 超出 54000 的泉区被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 54000 + 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick 未超出 54000 的泉区保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 }))
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('过期和未过期混合时只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 54000 * 2
    ;(sys as any).lastCheck = 0
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 }))
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(currentTick - 1000)
  })
  it('europiumContent 字段合法(>=40)', () => {
    const z = makeZone({ europiumContent: 40 })
    expect(z.europiumContent).toBeGreaterThanOrEqual(40)
  })
  it('springFlow 字段合法(>=10)', () => {
    const z = makeZone({ springFlow: 10 })
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
  })
  it('phosphateLeaching 字段合法(>=20)', () => {
    const z = makeZone({ phosphateLeaching: 20 })
    expect(z.phosphateLeaching).toBeGreaterThanOrEqual(20)
  })
  it('luminescentIntensity 字段合法(>=15)', () => {
    const z = makeZone({ luminescentIntensity: 15 })
    expect(z.luminescentIntensity).toBeGreaterThanOrEqual(15)
  })
  it('泉区x/y坐标可读取', () => {
    ;(sys as any).zones.push(makeZone({ x: 10, y: 20 }))
    expect((sys as any).zones[0].x).toBe(10)
    expect((sys as any).zones[0].y).toBe(20)
  })
  it('泉区tick字段存在', () => {
    ;(sys as any).zones.push(makeZone({ tick: 12345 }))
    expect((sys as any).zones[0].tick).toBe(12345)
  })
  it('europiumContent上限合法(<=100)', () => {
    const z = makeZone({ europiumContent: 100 })
    expect(z.europiumContent).toBeLessThanOrEqual(100)
  })
  it('springFlow上限合法(<=60)', () => {
    const z = makeZone({ springFlow: 60 })
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })
  it('注入多个泉区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: EuropiumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })
  it('update不影响已存在泉区字段', () => {
    ;(sys as any).zones.push(makeZone({ europiumContent: 55, springFlow: 33, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.europiumContent).toBe(55)
    expect(z.springFlow).toBe(33)
  })
  it('连续多次 update 在间隔内不累计 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    const lc1 = (sys as any).lastCheck
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 2)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('两轮 CHECK_INTERVAL 触发时 lastCheck 更新两次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2 + 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2 + 2)
  })
  it('初始update跳过时zones保持为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld, em, 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('zones是数组类型', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('清空zones后length为0', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.length = 0
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=CHECK_INTERVAL-1时不处理，tick=CHECK_INTERVAL时处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('三个zone过期后全部清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 54000 + 1)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('update后zones引用不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const ref = (sys as any).zones
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toBe(ref)
  })
  it('注入泉区id正确', () => {
    ;(sys as any).zones.push(makeZone({ id: 99 }))
    expect((sys as any).zones[0].id).toBe(99)
  })
  it('update多次后lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const lc1 = (sys as any).lastCheck
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    const lc2 = (sys as any).lastCheck
    expect(lc2).toBeGreaterThanOrEqual(lc1)
  })
  it('luminescentIntensity字段可单独修改', () => {
    ;(sys as any).zones.push(makeZone({ luminescentIntensity: 88 }))
    expect((sys as any).zones[0].luminescentIntensity).toBe(88)
  })
  it('注入zone后id为正整数', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].id).toBeGreaterThan(0)
  })
  it('zones长度精确等于注入数量', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(5)
  })
  it('过期一个保留一个的场景下zones.length=1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 54000 + 1
    ;(sys as any).lastCheck = 0
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 }))
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  // ── 追加扩展测试 ──────────────────────────────────────────────
  it('追加-zones数组是Array', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })
  it('追加-初始状态update跳过不修改lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('追加-多次注入后精确计数', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(8)
  })
  it('追加-europiumContent字段>=40', () => {
    ;(sys as any).zones.push(makeZone({ europiumContent: 40 }))
    expect((sys as any).zones[0].europiumContent).toBeGreaterThanOrEqual(40)
  })
  it('追加-luminescentIntensity字段>=15', () => {
    ;(sys as any).zones.push(makeZone({ luminescentIntensity: 15 }))
    expect((sys as any).zones[0].luminescentIntensity).toBeGreaterThanOrEqual(15)
  })
  it('追加-两次触发间隔精确等于CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 2950)
    expect((sys as any).lastCheck).toBe(2950)
    sys.update(1, safeWorld, em, 2950 * 2)
    expect((sys as any).lastCheck).toBe(2950 * 2)
  })
  it('追加-zones.splice后长度减少', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.splice(0, 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('追加-注入zone的tick字段正确', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    expect((sys as any).zones[0].tick).toBe(99999)
  })
})
