import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBorateSpringSystem } from '../systems/WorldBorateSpringSystem'
import type { BorateSpringZone } from '../systems/WorldBorateSpringSystem'

// ---- helpers ----

function makeSys(): WorldBorateSpringSystem { return new WorldBorateSpringSystem() }

let _nextId = 1
function makeZone(overrides: Partial<BorateSpringZone> = {}): BorateSpringZone {
  return {
    id: _nextId++,
    x: 20, y: 30,
    borateContent: 40,
    springFlow: 50,
    mineralDeposit: 60,
    evaporiteLevel: 25,
    tick: 0,
    ...overrides,
  }
}

/** world mock：getTile 固定返回给定 tileType */
function makeWorld(tileType: number = 3) {
  return { width: 200, height: 200, getTile: () => tileType }
}

/** 空实体管理器 mock */
const emMock = {} as any

// CHECK_INTERVAL=2700；tick=0 首帧 lastCheck=0，0-0=0 < 2700 → skip
// 所以首次触发必须 tick >= 2700
const TRIGGER_TICK = 2700

// ---- tests ----

describe('WorldBorateSpringSystem', () => {
  let sys: WorldBorateSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  // --- 初始状态 ---

  it('初始zones为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId=1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck=0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- CHECK_INTERVAL 节流 ---

  it('tick未达CHECK_INTERVAL时update不改变zones', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, 100)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick达到CHECK_INTERVAL时会更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    expect((sys as any).lastCheck).toBe(TRIGGER_TICK)
    vi.restoreAllMocks()
  })

  it('两次update间隔小于CHECK_INTERVAL时第二次被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    const checkAfterFirst = (sys as any).lastCheck
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK + 100)
    expect((sys as any).lastCheck).toBe(checkAfterFirst)
    vi.restoreAllMocks()
  })

  // --- 无水/山邻格时不spawn ---

  it('相邻格均为GRASS时不spawn（nearWater=false nearMountain=false）', () => {
    // GRASS=3，不是水(0,1)也不是山(4/5)；随机固定保证FORM_CHANCE通过
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3) as any, emMock, TRIGGER_TICK)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  // --- zones字段注入与查询 ---

  it('手动注入zone后zones长度正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone字段borateContent和springFlow被正确存储', () => {
    ;(sys as any).zones.push(makeZone({ borateContent: 77, springFlow: 33 }))
    const z = (sys as any).zones[0]
    expect(z.borateContent).toBe(77)
    expect(z.springFlow).toBe(33)
  })

  it('zone字段mineralDeposit和evaporiteLevel被正确存储', () => {
    ;(sys as any).zones.push(makeZone({ mineralDeposit: 55, evaporiteLevel: 70 }))
    const z = (sys as any).zones[0]
    expect(z.mineralDeposit).toBe(55)
    expect(z.evaporiteLevel).toBe(70)
  })

  it('多个zones全部保留在数组中', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })

  // --- cleanup逻辑 ---

  it('tick在cutoff内的zone不被清理', () => {
    const tick = 100000
    ;(sys as any).zones.push(makeZone({ tick: tick - 50000 })) // 在54000范围内（差50000）
    ;(sys as any).lastCheck = 0 // 重置保证触发
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('tick超过54000 cutoff的zone被清理', () => {
    const tick = 100000
    // cutoff = 100000 - 54000 = 46000；zone.tick=1000 < 46000 → 清理
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('同一次update：新zone超过cutoff时也会被清理', () => {
    // tick=54001，cutoff=54001-54000=1；注入一个tick=0的旧zone
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, 54001)
    // tick=0 < cutoff=1 → 被清理
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })

  // --- MAX_ZONES 上限 ---

  it('已达MAX_ZONES(32)时不再spawn新zone', () => {
    // 填满32个zone，使用tick=999999避免被cleanup删除
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 极小值，会通过FORM_CHANCE
    sys.update(1, makeWorld() as any, emMock, TRIGGER_TICK)
    // cleanup tick=999999不会被清掉（cutoff=2700-54000<0）
    // zones仍为32
    expect((sys as any).zones).toHaveLength(32)
    vi.restoreAllMocks()
  })

  // --- zones数组引用稳定 ---

  it('zones数组是同一个引用', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  // --- 新zone必须包含所有必填字段 ---

  it('zone对象包含id/x/y/tick字段', () => {
    const z = makeZone({ x: 10, y: 20, tick: 500 })
    expect(z).toHaveProperty('id')
    expect(z).toHaveProperty('x', 10)
    expect(z).toHaveProperty('y', 20)
    expect(z).toHaveProperty('tick', 500)
  })

  // --- 混合cleanup：部分被删部分保留 ---

  it('混合新旧zones时只删除过期的', () => {
    const tick = 100000
    // cutoff = 100000 - 54000 = 46000
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))    // 旧，tick<cutoff → 删
    ;(sys as any).zones.push(makeZone({ tick: 60000 }))   // 新，tick>cutoff → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld() as any, emMock, tick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(60000)
    vi.restoreAllMocks()
  })
})
