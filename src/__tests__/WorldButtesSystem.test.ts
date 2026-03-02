import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldButtesSystem } from '../systems/WorldButtesSystem'
import type { Butte } from '../systems/WorldButtesSystem'

// ---- helpers ----

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

/** world mock：getTile 固定返回给定 tileType */
function makeWorld(tileType: number = 3) {
  return { width: 200, height: 200, getTile: () => tileType }
}

const emMock = {} as any

// CHECK_INTERVAL=2700；首次触发需 tick >= 2700
const TRIGGER_TICK = 2700
// TileType.SAND=2, TileType.MOUNTAIN=5 (源码: MOUNTAIN=5)
// 注意：Constants.ts 中 MOUNTAIN=5，源码判断 tile===SAND||tile===MOUNTAIN

describe('WorldButtesSystem', () => {
  let sys: WorldButtesSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

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
    vi.restoreAllMocks()
  })

  it('tick达到CHECK_INTERVAL时lastCheck被更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
    vi.restoreAllMocks()
  })

  it('两次update间隔小于CHECK_INTERVAL时第二次被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK + 200)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
    vi.restoreAllMocks()
  })

  // ---- GRASS地形不spawn ----

  it('GRASS地形不触发spawn', () => {
    // GRASS=3, 不是SAND(2)或MOUNTAIN(5) → 不spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 极小值确保FORM_CHANCE通过
    sys.update(1, makeWorld(3) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('SAND地形+random<FORM_CHANCE时spawn新Butte', () => {
    // SAND=2，random=0.001 < FORM_CHANCE=0.0018 → spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('MOUNTAIN地形+random<FORM_CHANCE时spawn新Butte', () => {
    // MOUNTAIN=5，random=0.001 < 0.0018 → spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('random>=FORM_CHANCE时不spawn', () => {
    // random=0.9 > 0.0018 → 不spawn（注意：spawn前先判断FORM_CHANCE）
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    expect((sys as any).buttes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  // ---- 新spawn Butte字段范围 ----

  it('spawn的Butte具有合法id和坐标', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.id).toBeGreaterThanOrEqual(1)
    expect(b.x).toBeGreaterThanOrEqual(10)
    expect(b.y).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('spawn的Butte tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2) as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.tick).toBe(TRIGGER_TICK)
    vi.restoreAllMocks()
  })

  // ---- 手动注入与查询 ----

  it('手动注入butte后长度正确', () => {
    ;(sys as any).buttes.push(makeButte())
    expect((sys as any).buttes).toHaveLength(1)
  })

  it('butte字段elevation和capIntegrity被正确存储', () => {
    ;(sys as any).buttes.push(makeButte({ elevation: 99, capIntegrity: 55 }))
    const b = (sys as any).buttes[0]
    expect(b.elevation).toBe(99)
    expect(b.capIntegrity).toBe(55)
  })

  it('butte字段erosionRate和windExposure被正确存储', () => {
    ;(sys as any).buttes.push(makeButte({ erosionRate: 12, windExposure: 45 }))
    const b = (sys as any).buttes[0]
    expect(b.erosionRate).toBe(12)
    expect(b.windExposure).toBe(45)
  })

  it('多个buttes全部保留', () => {
    ;(sys as any).buttes.push(makeButte(), makeButte(), makeButte())
    expect((sys as any).buttes).toHaveLength(3)
  })

  // ---- cleanup逻辑（cutoff = tick - 94000） ----

  it('tick在cutoff内的butte不被清理', () => {
    const tick = 200000
    // cutoff = 200000 - 94000 = 106000；zone.tick=150000 > 106000 → 保留
    ;(sys as any).buttes.push(makeButte({ tick: 150000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).buttes).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick超过94000 cutoff的butte被清理', () => {
    const tick = 200000
    // cutoff = 106000；butte.tick=1000 < 106000 → 清理
    ;(sys as any).buttes.push(makeButte({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).buttes).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('混合新旧buttes时只删除过期的', () => {
    const tick = 200000
    // cutoff=106000
    ;(sys as any).buttes.push(makeButte({ tick: 1000 }))    // 旧 → 删
    ;(sys as any).buttes.push(makeButte({ tick: 150000 }))  // 新 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).buttes).toHaveLength(1)
    expect((sys as any).buttes[0].tick).toBe(150000)
    vi.restoreAllMocks()
  })

  // ---- update()中buttes字段的侵蚀更新 ----

  it('update()后butte的erosionRate保持在[2,20]范围内', () => {
    ;(sys as any).buttes.push(makeButte({ erosionRate: 10, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // (0.5-0.48)*0.1=0.002，erosionRate略增
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.erosionRate).toBeGreaterThanOrEqual(2)
    expect(b.erosionRate).toBeLessThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('update()后butte的elevation不低于20', () => {
    ;(sys as any).buttes.push(makeButte({ elevation: 20.0005, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.elevation).toBeGreaterThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('update()后butte的capIntegrity不低于10', () => {
    ;(sys as any).buttes.push(makeButte({ capIntegrity: 10.0001, erosionRate: 10, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.capIntegrity).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('update()后butte的windExposure保持在[15,80]范围内', () => {
    ;(sys as any).buttes.push(makeButte({ windExposure: 50, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const b = (sys as any).buttes[0]
    expect(b.windExposure).toBeGreaterThanOrEqual(15)
    expect(b.windExposure).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  // ---- buttes数组引用稳定 ----

  it('buttes数组是同一个引用', () => {
    const ref = (sys as any).buttes
    expect(ref).toBe((sys as any).buttes)
  })
})
