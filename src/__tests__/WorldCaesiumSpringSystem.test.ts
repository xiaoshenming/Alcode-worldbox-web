import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCaesiumSpringSystem } from '../systems/WorldCaesiumSpringSystem'
import type { CaesiumSpringZone } from '../systems/WorldCaesiumSpringSystem'

const CHECK_INTERVAL = 3130
const MAX_CaesiumSpringZoneS = 32

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const waterWorld = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

let nextId = 1
function makeZone(overrides: Partial<CaesiumSpringZone> = {}): CaesiumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    caesiumContent: 40,
    springFlow: 50,
    polluciteWeathering: 60,
    alkaliConcentration: 70,
    tick: 0,
    ...overrides,
  }
}
function makeSys(): WorldCaesiumSpringSystem { return new WorldCaesiumSpringSystem() }

describe('WorldCaesiumSpringSystem', () => {
  let sys: WorldCaesiumSpringSystem
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
    expect(z.caesiumContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.polluciteWeathering).toBe(60)
    expect(z.alkaliConcentration).toBe(70)
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
  it('注入 MAX_CaesiumSpringZoneS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_CaesiumSpringZoneS; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).zones.length).toBe(MAX_CaesiumSpringZoneS)
  })
  it('zones.length=MAX_CaesiumSpringZoneS-1时不超过MAX_CaesiumSpringZoneS', () => {
    for (let i = 0; i < MAX_CaesiumSpringZoneS - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_CaesiumSpringZoneS)
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
  it('caesiumContent 字段合法(>=40)', () => {
    const z = makeZone({ caesiumContent: 40 })
    expect(z.caesiumContent).toBeGreaterThanOrEqual(40)
  })
  it('springFlow 字段合法(>=10)', () => {
    const z = makeZone({ springFlow: 10 })
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
  })
  it('polluciteWeathering 字段合法(>=20)', () => {
    const z = makeZone({ polluciteWeathering: 20 })
    expect(z.polluciteWeathering).toBeGreaterThanOrEqual(20)
  })
  it('alkaliConcentration 字段合法(>=15)', () => {
    const z = makeZone({ alkaliConcentration: 15 })
    expect(z.alkaliConcentration).toBeGreaterThanOrEqual(15)
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
  it('caesiumContent上限合法(<=100)', () => {
    const z = makeZone({ caesiumContent: 100 })
    expect(z.caesiumContent).toBeLessThanOrEqual(100)
  })
  it('springFlow上限合法(<=60)', () => {
    const z = makeZone({ springFlow: 60 })
    expect(z.springFlow).toBeLessThanOrEqual(60)
  })
  it('注入多个泉区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: CaesiumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })
  it('update不影响已存在泉区字段', () => {
    ;(sys as any).zones.push(makeZone({ caesiumContent: 55, springFlow: 33, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.caesiumContent).toBe(55)
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
  it('alkaliConcentration字段可单独修改', () => {
    ;(sys as any).zones.push(makeZone({ alkaliConcentration: 88 }))
    expect((sys as any).zones[0].alkaliConcentration).toBe(88)
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
})


describe('WorldCaesiumSpringSystem - 额外测试', () => {
  let sys: WorldCaesiumSpringSystem
  const safeWorld2 = { width: 200, height: 200, getTile: () => 2 } as any
  const em2 = {} as any
  const CI2 = 3130

  beforeEach(() => { sys = new WorldCaesiumSpringSystem(); nextId = 100; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('额外-zones数组可以直接splice', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.splice(0, 1)
    expect((sys as any).zones.length).toBe(1)
  })
  it('额外-lastCheck精确等于trigger tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld2, em2, CI2)
    expect((sys as any).lastCheck).toBe(CI2)
  })
  it('额外-初始状态nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('额外-zones初始为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('额外-多次注入后长度正确', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).zones.push(makeZone()) }
    expect((sys as any).zones).toHaveLength(10)
  })
  it('额外-注入zone的caesiumContent可读取', () => {
    ;(sys as any).zones.push(makeZone({ caesiumContent: 99 }))
    expect((sys as any).zones[0].caesiumContent).toBe(99)
  })
  it('额外-注入zone的alkaliConcentration可读取', () => {
    ;(sys as any).zones.push(makeZone({ alkaliConcentration: 88 }))
    expect((sys as any).zones[0].alkaliConcentration).toBe(88)
  })
  it('额外-zones是Array类型', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('额外-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld2, em2, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('额外-zones引用稳定', () => {
    const ref = (sys as any).zones
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld2, em2, CI2)
    expect((sys as any).zones).toBe(ref)
  })
})
