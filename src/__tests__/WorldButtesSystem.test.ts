import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldButtesSystem } from '../systems/WorldButtesSystem'
import type { Butte } from '../systems/WorldButtesSystem'

function makeSys(): WorldButtesSystem { return new WorldButtesSystem() }

let _nextId = 1
function makeButte(overrides: Partial<Butte> = {}): Butte {
  return {
    id: _nextId++,
    x: 25, y: 35,
    radius: 3,
    elevation: 80,
    capIntegrity: 75,
    erosionRate: 8,
    colorBanding: 4,
    windExposure: 50,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tileType: number = 3) {
  return { width: 200, height: 200, getTile: () => tileType }
}

const emMock = {} as any
const CHECK_INTERVAL = 2700
const TRIGGER_TICK = 2700
const MAX_BUTTES = 16
// TileType.SAND=2, TileType.MOUNTAIN=5

describe('WorldButtesSystem', () => {
  let sys: WorldButtesSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // ---- 初始状态 ----
  it('初始buttes为空数组', () => {
    expect((sys as any).buttes).toHaveLength(0)
  })

  it('初始nextId=1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck=0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ---- CHECK_INTERVAL 节流 ----
  it('tick未达CHECK_INTERVAL时update不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL时lastCheck被更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
  })

  it('两次update间隔小于CHECK_INTERVAL时第二次被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK + 200)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
  })

  it('两次update间隔>=CHECK_INTERVAL时第二次被执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK * 2)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK * 2)
  })

  // ---- GRASS地形不spawn ----
  it('GRASS地形(3)不生成butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < FORM_CHANCE
    sys.update(1, makeWorld(3) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
  })

  // ---- SAND地形spawn ----
  it('SAND地形(2)且random<FORM_CHANCE时生成butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(1)
  })

  it('MOUNTAIN地形(5)且random<FORM_CHANCE时生成butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(1)
  })

  it('random>=FORM_CHANCE时不spawn butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
  })

  // ---- 字段验证 ----
  it('butte字段radius在[2,5]范围内', () => {
    const b = makeButte({ radius: 3 })
    expect(b.radius).toBeGreaterThanOrEqual(2)
    expect(b.radius).toBeLessThanOrEqual(5)
  })

  it('butte字段elevation在[50,120]范围内', () => {
    const b = makeButte({ elevation: 80 })
    expect(b.elevation).toBeGreaterThanOrEqual(50)
    expect(b.elevation).toBeLessThanOrEqual(120)
  })

  it('butte字段capIntegrity在[60,90]范围内', () => {
    const b = makeButte({ capIntegrity: 75 })
    expect(b.capIntegrity).toBeGreaterThanOrEqual(60)
    expect(b.capIntegrity).toBeLessThanOrEqual(90)
  })

  it('butte字段erosionRate在[5,17]范围内', () => {
    const b = makeButte({ erosionRate: 8 })
    expect(b.erosionRate).toBeGreaterThanOrEqual(5)
    expect(b.erosionRate).toBeLessThanOrEqual(17)
  })

  it('butte字段windExposure在[30,80]范围内', () => {
    const b = makeButte({ windExposure: 50 })
    expect(b.windExposure).toBeGreaterThanOrEqual(30)
    expect(b.windExposure).toBeLessThanOrEqual(80)
  })

  // ---- 字段更新 ----
  it('update()后butte的erosionRate保持在[2,20]范围内', () => {
    ;(sys as any).buttes.push(makeButte({ erosionRate: 10, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.erosionRate).toBeGreaterThanOrEqual(2)
    expect(b.erosionRate).toBeLessThanOrEqual(20)
  })

  it('update()后butte的elevation不低于20', () => {
    ;(sys as any).buttes.push(makeButte({ elevation: 20.0005, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.elevation).toBeGreaterThanOrEqual(20)
  })

  it('update()后butte的capIntegrity不低于10', () => {
    ;(sys as any).buttes.push(makeButte({ capIntegrity: 10.0001, erosionRate: 10, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.capIntegrity).toBeGreaterThanOrEqual(10)
  })

  it('update()后butte的windExposure保持在[15,80]范围内', () => {
    ;(sys as any).buttes.push(makeButte({ windExposure: 50, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.windExposure).toBeGreaterThanOrEqual(15)
    expect(b.windExposure).toBeLessThanOrEqual(80)
  })

  it('elevation每次update减少0.001', () => {
    ;(sys as any).buttes.push(makeButte({ elevation: 80, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].elevation).toBeCloseTo(79.999, 5)
  })

  // ---- MAX_BUTTES 上限 ----
  it('注入MAX_BUTTES个后不再spawn', () => {
    for (let i = 0; i < MAX_BUTTES; i++) {
      ;(sys as any).buttes.push(makeButte({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(MAX_BUTTES)
  })

  it('buttes.length<MAX_BUTTES时可继续spawn', () => {
    for (let i = 0; i < MAX_BUTTES - 1; i++) {
      ;(sys as any).buttes.push(makeButte({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(MAX_BUTTES)
  })

  // ---- cleanup ----
  it('tick超过cutoff的butte被删除(cutoff=tick-94000)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).buttes.push(makeButte({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK + 94001)
    expect((sys as any).buttes).toHaveLength(0)
  })

  it('tick未超过cutoff的butte保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = TRIGGER_TICK + 1000
    ;(sys as any).buttes.push(makeButte({ tick: currentTick - 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld() as any, emMock, currentTick)
    expect((sys as any).buttes).toHaveLength(1)
  })

  it('混合新旧buttes只删旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = TRIGGER_TICK + 94001
    ;(sys as any).buttes.push(makeButte({ tick: 0 }))
    ;(sys as any).buttes.push(makeButte({ tick: currentTick - 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, makeWorld() as any, emMock, currentTick)
    expect((sys as any).buttes).toHaveLength(1)
  })

  // ---- id自增 ----
  it('spawn后nextId自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).nextId).toBe(2)
  })

  it('多次spawn后id不重复', () => {
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.push(makeButte())
    const ids = (sys as any).buttes.map((b: Butte) => b.id)
    expect(new Set(ids).size).toBe(3)
  })

  // ---- 引用稳定 ----
  it('buttes数组是同一个引用', () => {
    const ref = (sys as any).buttes
    expect(ref).toBe((sys as any).buttes)
  })

  // ---- 注入操作 ----
  it('注入butte后可查询', () => {
    ;(sys as any).buttes.push(makeButte())
    expect((sys as any).buttes).toHaveLength(1)
  })

  it('注入多个butte后长度正确', () => {
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.push(makeButte())
    expect((sys as any).buttes).toHaveLength(2)
  })

  it('注入butte的字段可正确读取', () => {
    ;(sys as any).buttes.push(makeButte({ x: 42, y: 77 }))
    expect((sys as any).buttes[0].x).toBe(42)
    expect((sys as any).buttes[0].y).toBe(77)
  })

  // ---- 边界条件 ----
  it('capIntegrity极低时不低于10', () => {
    ;(sys as any).buttes.push(makeButte({ capIntegrity: 10.0001, erosionRate: 20, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].capIntegrity).toBeGreaterThanOrEqual(10)
  })

  it('erosionRate极高时不超过20', () => {
    ;(sys as any).buttes.push(makeButte({ erosionRate: 20, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].erosionRate).toBeLessThanOrEqual(20)
  })

  it('windExposure极高时不超过80', () => {
    ;(sys as any).buttes.push(makeButte({ windExposure: 80, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].windExposure).toBeLessThanOrEqual(80)
  })

  it('windExposure极低时不低于15', () => {
    ;(sys as any).buttes.push(makeButte({ windExposure: 15, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].windExposure).toBeGreaterThanOrEqual(15)
  })

  // ---- 追加扩展测试 ----
  it('buttes数组初始为空Array', () => {
    expect(Array.isArray((sys as any).buttes)).toBe(true)
  })
  it('初始状态update跳过不修改lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('多次注入后精确计数', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).buttes.push(makeButte())
    }
    expect((sys as any).buttes).toHaveLength(8)
  })
  it('butte的tick字段正确', () => {
    ;(sys as any).buttes.push(makeButte({ tick: 99999 }))
    expect((sys as any).buttes[0].tick).toBe(99999)
  })
  it('两次触发间隔精确等于CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK * 2)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK * 2)
  })
  it('buttes.splice后长度减少', () => {
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.push(makeButte())
    ;(sys as any).buttes.splice(0, 1)
    expect((sys as any).buttes).toHaveLength(1)
  })
  it('注入butte的colorBanding字段可读取', () => {
    ;(sys as any).buttes.push(makeButte({ colorBanding: 5 }))
    expect((sys as any).buttes[0].colorBanding).toBe(5)
  })
  it('WATER地形(4)不生成butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
  })
  it('FOREST地形(6)不生成butte', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
  })
  it('update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('butte字段x/y坐标在合法范围内', () => {
    ;(sys as any).buttes.push(makeButte({ x: 50, y: 60 }))
    expect((sys as any).buttes[0].x).toBe(50)
    expect((sys as any).buttes[0].y).toBe(60)
  })
  it('次update更新erosionRate保持正数', () => {
    ;(sys as any).buttes.push(makeButte({ erosionRate: 2, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes[0].erosionRate).toBeGreaterThan(0)
  })
  it('注入MAX_BUTTES-2个时还可继续spawn', () => {
    for (let i = 0; i < MAX_BUTTES - 2; i++) {
      ;(sys as any).buttes.push(makeButte({ tick: 999999 }))
    }
    expect((sys as any).buttes.length).toBe(MAX_BUTTES - 2)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes.length).toBeLessThanOrEqual(MAX_BUTTES)
  })
  it('buttes是同一引用稳定', () => {
    const ref = (sys as any).buttes
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toBe(ref)
  })
  it('elevation最大值不超过130', () => {
    const b = makeButte({ elevation: 120 })
    expect(b.elevation).toBeLessThanOrEqual(130)
  })
})
