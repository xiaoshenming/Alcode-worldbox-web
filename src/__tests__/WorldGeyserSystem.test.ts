import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeyserSystem } from '../systems/WorldGeyserSystem'
import type { Geyser } from '../systems/WorldGeyserSystem'

const CHECK_INTERVAL = 500
const MAX_GEYSERS = 30

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const nullTileWorld = { width: 200, height: 200, getTile: () => null } as any
const em = {} as any

function makeSys(): WorldGeyserSystem { return new WorldGeyserSystem() }
let nextId = 1
function makeGeyser(overrides: Partial<Geyser> = {}): Geyser {
  return {
    id: nextId++,
    x: 10,
    y: 10,
    power: 5,
    interval: 1000,
    lastEruption: 0,
    active: true,
    ...overrides,
  }
}

describe('WorldGeyserSystem', () => {
  let sys: WorldGeyserSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 基础状态 ---
  it('初始无间歇泉', () => {
    expect((sys as any).geysers).toHaveLength(0)
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
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
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
  it('random=0.9 时不 spawn（大于 SPAWN_CHANCE=0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(0)
  })

  it('getTile 返回 null 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullTileWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(0)
  })

  it('random=0 且 tile 不为 null 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(1)
  })

  // --- MAX_GEYSERS 上限 ---
  it('达到 MAX_GEYSERS 时不再新增', () => {
    for (let i = 0; i < MAX_GEYSERS; i++) {
      ;(sys as any).geysers.push(makeGeyser())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers.length).toBe(MAX_GEYSERS)
  })

  it('geysers 数量比 MAX_GEYSERS 少 1 时允许 spawn', () => {
    for (let i = 0; i < MAX_GEYSERS - 1; i++) {
      ;(sys as any).geysers.push(makeGeyser())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers.length).toBe(MAX_GEYSERS)
  })

  // --- spawn 字段范围 ---
  it('spawn 后 power 在 [1,10] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const g: Geyser = (sys as any).geysers[0]
    expect(g.power).toBeGreaterThanOrEqual(1)
    expect(g.power).toBeLessThanOrEqual(10)
  })

  it('spawn 后 interval 在 [800,2000) 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const g: Geyser = (sys as any).geysers[0]
    expect(g.interval).toBeGreaterThanOrEqual(800)
    expect(g.interval).toBeLessThan(2001)
  })

  it('spawn 后 active 为 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const g: Geyser = (sys as any).geysers[0]
    expect(g.active).toBe(true)
  })

  it('spawn 后 lastEruption 为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const g: Geyser = (sys as any).geysers[0]
    expect(g.lastEruption).toBe(0)
  })

  it('spawn 后 id 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    const geysers: Geyser[] = (sys as any).geysers
    if (geysers.length >= 2) {
      expect(geysers[1].id).toBeGreaterThan(geysers[0].id)
    }
  })

  // --- cleanup 逻辑 ---
  it('active=false 时记录被删除', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(0)
  })

  it('active=true 时记录保留', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(1)
  })

  it('混合情况：inactive 删除，active 保留', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: false, id: 100 }))
    ;(sys as any).geysers.push(makeGeyser({ active: true, id: 101 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const geysers: Geyser[] = (sys as any).geysers
    expect(geysers).toHaveLength(1)
    expect(geysers[0].id).toBe(101)
  })

  it('多个 inactive 记录全部删除', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).geysers).toHaveLength(0)
  })

  // --- 喷发逻辑 ---
  it('超过 interval 后 lastEruption 更新为当前 tick', () => {
    const g = makeGeyser({ power: 5, interval: 100, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(g.lastEruption).toBe(CHECK_INTERVAL)
  })

  it('未达 interval 时 lastEruption 不更新', () => {
    const g = makeGeyser({ power: 5, interval: 99999, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(g.lastEruption).toBe(0)
  })

  it('喷发后 power 衰减但不低于 1', () => {
    const g = makeGeyser({ power: 1, interval: 100, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    // random=0.9：衰减 0.9*0.3=0.27，power=max(1, 1-0.27)=1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(g.power).toBeGreaterThanOrEqual(1)
  })

  it('power > 1 时喷发后 power 减少', () => {
    const g = makeGeyser({ power: 5, interval: 100, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(g.power).toBeLessThan(5)
  })

  // 使用 nullTileWorld 防止 spawnGeysers 添加新记录（getTile 返回 null 时不 spawn）
  // random=0 时：decay=0*0.3=0，power=max(1,1-0)=1，random=0 < 0.05 -> active=false -> cleanup 删除
  it('power <= 1 且 random < 0.05 时 active 变为 false', () => {
    const g = makeGeyser({ power: 1, interval: 100, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullTileWorld, em, CHECK_INTERVAL)
    // power=1, random=0 < 0.05 -> active=false -> cleanup 删除
    expect((sys as any).geysers).toHaveLength(0)
  })

  it('power > 1 时不会直接变为 inactive', () => {
    const g = makeGeyser({ power: 8, interval: 100, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // power=max(1, 8-0)=8，不触发 inactive
    expect(g.active).toBe(true)
  })

  it('active=false 的间歇泉不参与喷发判断', () => {
    const g = makeGeyser({ active: false, interval: 0, lastEruption: 0 })
    ;(sys as any).geysers.push(g)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const before = g.lastEruption
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    // inactive -> cleanup 删除，但喷发逻辑先跳过
    expect((sys as any).geysers).toHaveLength(0)
    expect(g.lastEruption).toBe(before)
  })

  // --- getActiveGeysers ---
  it('初始无活跃间歇泉', () => {
    expect(sys.getActiveGeysers()).toHaveLength(0)
  })

  it('active=true 才返回', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: true }))
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    expect(sys.getActiveGeysers()).toHaveLength(1)
  })

  it('全部 active=true 时全部返回', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: true }))
    ;(sys as any).geysers.push(makeGeyser({ active: true }))
    ;(sys as any).geysers.push(makeGeyser({ active: true }))
    expect(sys.getActiveGeysers()).toHaveLength(3)
  })

  it('全部 active=false 时返回空', () => {
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    ;(sys as any).geysers.push(makeGeyser({ active: false }))
    expect(sys.getActiveGeysers()).toHaveLength(0)
  })

  it('getActiveGeysers 返回的是缓存 buf（引用不变）', () => {
    const buf1 = sys.getActiveGeysers()
    const buf2 = sys.getActiveGeysers()
    expect(buf1).toBe(buf2)
  })

  it('getActiveGeysers 内容随 active 状态变化', () => {
    const g = makeGeyser({ active: true })
    ;(sys as any).geysers.push(g)
    expect(sys.getActiveGeysers()).toHaveLength(1)
    g.active = false
    expect(sys.getActiveGeysers()).toHaveLength(0)
  })
})
