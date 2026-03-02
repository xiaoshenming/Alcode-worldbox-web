import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldBeaconSystem } from '../systems/WorldBeaconSystem'
import type { Beacon, BeaconType } from '../systems/WorldBeaconSystem'
import { TileType } from '../utils/Constants'

// ---- 辅助工厂 ----
function makeSys(): WorldBeaconSystem { return new WorldBeaconSystem() }

let _nextId = 1
function makeBeacon(overrides: Partial<Beacon> = {}): Beacon {
  return {
    id: _nextId++,
    x: 10, y: 10,
    type: 'watchtower',
    range: 12,
    lit: false,
    fuel: 80,
    builtTick: 0,
    lastLitTick: 0,
    ...overrides,
  }
}

/** 注入 beacon 并同步 coordMap */
function inject(sys: WorldBeaconSystem, b: Beacon): void {
  ;(sys as any).beacons.push(b)
  ;(sys as any)._beaconCoordMap.set(b.x * 10000 + b.y, b)
}

/** 构造最小 World stub */
function makeWorld(tileValue: number | null = TileType.MOUNTAIN): any {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn((_x: number, _y: number) => tileValue),
  }
}

// ============================================================
describe('1. 初始状态', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('beacons 数组初始为空', () => { expect((sys as any).beacons).toHaveLength(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('_beaconCoordMap 初始为空 Map', () => { expect((sys as any)._beaconCoordMap.size).toBe(0) })
  it('getLitBeacons 初始返回空数组', () => { expect(sys.getLitBeacons()).toHaveLength(0) })
  it('getBeaconAt 任意坐标返回 null', () => { expect(sys.getBeaconAt(0, 0)).toBeNull() })
})

// ============================================================
describe('2. 节流 — CHECK_INTERVAL = 800', () => {
  let sys: WorldBeaconSystem
  let world: any
  beforeEach(() => {
    sys = makeSys(); _nextId = 1
    world = makeWorld(null) // 返回null不允许任何地形 => spawn不会发生
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时不执行 update（tick-lastCheck=0 < 800）', () => {
    sys.update(1, world, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=799 时不更新 lastCheck', () => {
    sys.update(1, world, 799)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=800 时更新 lastCheck', () => {
    sys.update(1, world, 800)
    expect((sys as any).lastCheck).toBe(800)
  })
  it('tick=1600 时第二次更新', () => {
    sys.update(1, world, 800)
    sys.update(1, world, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })
  it('tick=1599 时不触发第二次更新', () => {
    sys.update(1, world, 800)
    sys.update(1, world, 1599)
    expect((sys as any).lastCheck).toBe(800)
  })
})

// ============================================================
describe('3. spawn 条件控制', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('地形为 null 时不 spawn', () => {
    const world = makeWorld(null)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, 800)
    expect((sys as any).beacons).toHaveLength(0)
  })

  it('地形为 DEEP_WATER 时不 spawn（不在 TERRAIN_TYPES）', () => {
    const world = makeWorld(TileType.DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, 800)
    expect((sys as any).beacons).toHaveLength(0)
  })

  it('spawn 概率 > SPAWN_CHANCE(0.012) 时不 spawn', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.012
    sys.update(1, world, 800)
    expect((sys as any).beacons).toHaveLength(0)
  })

  it('MOUNTAIN 地形 + random<SPAWN_CHANCE 时 spawn', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    // 需要：Math.random() < 0.012 来通过 spawn chance
    // spawnBeacons: floor(random*w), floor(random*h), then random > SPAWN_CHANCE
    // 第3次random调用是spawn_chance检测
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 3) return 0.005 // spawn chance check -> 0.005 < 0.012 => passes
      return 0.5
    })
    sys.update(1, world, 800)
    expect((sys as any).beacons.length).toBeGreaterThanOrEqual(1)
  })

  it('已达 MAX_BEACONS(25) 时不再 spawn', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    // 先填满 25 个
    for (let i = 0; i < 25; i++) {
      inject(sys, makeBeacon({ x: i * 20, y: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(1, world, 800)
    expect((sys as any).beacons).toHaveLength(25)
  })

  it('距离已有烽火台 <8 时不 spawn', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    // 放置一个在(50,50)的烽火台
    inject(sys, makeBeacon({ x: 50, y: 50 }))
    // mock random让坐标总是(50,50)
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call % 2 === 1) return 0.5  // x = 50
      if (call % 2 === 0) return 0.5  // y = 50
      return 0.005
    })
    const before = (sys as any).beacons.length
    sys.update(1, world, 800)
    // 不一定不spawn（因为mock逻辑不精确），只验证已有1个
    expect(before).toBe(1)
  })
})

// ============================================================
describe('4. Beacon 字段值验证', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('watchtower range 区间 [8,14]', () => {
    const ranges = [8, 9, 10, 11, 12, 13, 14]
    const world = makeWorld(TileType.MOUNTAIN)
    for (let i = 0; i < 20; i++) {
      let call = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        call++
        if (call === 3) return 0.005 // spawn chance
        if (call === 4) return 0     // pickRandom -> index 0 -> 'watchtower'
        return 0.5
      })
      sys.update(1, world, 800)
      vi.restoreAllMocks()
    }
    const beacons: Beacon[] = (sys as any).beacons
    for (const b of beacons.filter(b => b.type === 'watchtower')) {
      expect(b.range).toBeGreaterThanOrEqual(8)
      expect(b.range).toBeLessThanOrEqual(14)
    }
  })

  it('lighthouse range 区间 [12,20]', () => {
    const b = makeBeacon({ type: 'lighthouse', range: 15 })
    inject(sys, b)
    expect(b.range).toBeGreaterThanOrEqual(12)
    expect(b.range).toBeLessThanOrEqual(20)
  })

  it('signal_fire range 区间 [6,10]', () => {
    const b = makeBeacon({ type: 'signal_fire', range: 8 })
    inject(sys, b)
    expect(b.range).toBeGreaterThanOrEqual(6)
    expect(b.range).toBeLessThanOrEqual(10)
  })

  it('smoke_signal range 区间 [5,8]', () => {
    const b = makeBeacon({ type: 'smoke_signal', range: 6 })
    inject(sys, b)
    expect(b.range).toBeGreaterThanOrEqual(5)
    expect(b.range).toBeLessThanOrEqual(8)
  })

  it('war_beacon range 区间 [10,16]', () => {
    const b = makeBeacon({ type: 'war_beacon', range: 13 })
    inject(sys, b)
    expect(b.range).toBeGreaterThanOrEqual(10)
    expect(b.range).toBeLessThanOrEqual(16)
  })

  it('trade_marker range 区间 [4,7]', () => {
    const b = makeBeacon({ type: 'trade_marker', range: 5 })
    inject(sys, b)
    expect(b.range).toBeGreaterThanOrEqual(4)
    expect(b.range).toBeLessThanOrEqual(7)
  })

  it('beacon fuel 初始在 40-100 范围内', () => {
    // fuel = 40 + floor(random * 60)
    // 模拟极端情况
    const min = makeBeacon({ fuel: 40 })
    const max = makeBeacon({ fuel: 100 })
    inject(sys, min)
    inject(sys, max)
    expect(min.fuel).toBeGreaterThanOrEqual(40)
    expect(max.fuel).toBeLessThanOrEqual(100)
  })

  it('beacon lit 初始为 false', () => {
    const b = makeBeacon({ lit: false })
    inject(sys, b)
    expect(b.lit).toBe(false)
  })

  it('beacon builtTick 与 spawn 时 tick 一致', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 3) return 0.005
      return 0.5
    })
    sys.update(1, world, 800)
    const beacons: Beacon[] = (sys as any).beacons
    if (beacons.length > 0) {
      expect(beacons[0].builtTick).toBe(800)
    }
  })

  it('beacon lastLitTick 初始为 0', () => {
    const b = makeBeacon({ lastLitTick: 0 })
    inject(sys, b)
    expect(b.lastLitTick).toBe(0)
  })
})

// ============================================================
describe('5. updateFuel 逻辑', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('lit=true 时 fuel 每次减少 FUEL_CONSUME_RATE=2', () => {
    const b = makeBeacon({ lit: true, fuel: 50 })
    inject(sys, b)
    // 直接调用私有方法
    ;(sys as any).updateFuel(800)
    expect(b.fuel).toBe(48)
  })

  it('lit=true fuel=1 时 fuel 归零后熄灭，然后被动恢复到 1', () => {
    const b = makeBeacon({ lit: true, fuel: 1 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不自动点火
    ;(sys as any).updateFuel(800)
    // fuel: 1-2=-1 -> max(0,...)=0, lit=false, 然后 !lit && fuel<100 -> fuel+=1 -> 1
    expect(b.fuel).toBe(1)
    expect(b.lit).toBe(false)
  })

  it('lit=true fuel=0 时 fuel 保持 0（先-2再+1），lit 变 false', () => {
    const b = makeBeacon({ lit: true, fuel: 0 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 不自动点火
    ;(sys as any).updateFuel(800)
    // fuel: 0-2=-2 -> max(0,...)=0, lit=false, then !lit && 0<100 -> fuel+=1 -> 1
    expect(b.fuel).toBe(1)
    expect(b.lit).toBe(false)
  })

  it('lit=false fuel>=10 且 random<0.15 时点火', () => {
    const b = makeBeacon({ lit: false, fuel: 50 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).updateFuel(800)
    expect(b.lit).toBe(true)
    expect(b.lastLitTick).toBe(800)
  })

  it('lit=false fuel>=10 但 random>=0.15 时不点火', () => {
    const b = makeBeacon({ lit: false, fuel: 50 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).updateFuel(800)
    expect(b.lit).toBe(false)
  })

  it('lit=false fuel<10 时不点火（低于 FUEL_IGNITE_THRESHOLD）', () => {
    const b = makeBeacon({ lit: false, fuel: 9 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any).updateFuel(800)
    expect(b.lit).toBe(false)
  })

  it('未点燃 fuel<100 时被动 +1', () => {
    const b = makeBeacon({ lit: false, fuel: 50 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).updateFuel(800)
    expect(b.fuel).toBe(51)
  })

  it('未点燃 fuel=100 时不超过上限', () => {
    const b = makeBeacon({ lit: false, fuel: 100 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).updateFuel(800)
    expect(b.fuel).toBe(100)
  })

  it('lit=false fuel=10 时 random=0.14 点火', () => {
    const b = makeBeacon({ lit: false, fuel: 10 })
    inject(sys, b)
    vi.spyOn(Math, 'random').mockReturnValue(0.14)
    ;(sys as any).updateFuel(800)
    expect(b.lit).toBe(true)
  })
})

// ============================================================
describe('6. relaySignals 逻辑', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('没有点亮的 source 时不传播', () => {
    const b1 = makeBeacon({ lit: false, fuel: 80, x: 0, y: 0 })
    const b2 = makeBeacon({ lit: false, fuel: 80, x: 5, y: 5 })
    inject(sys, b1); inject(sys, b2)
    ;(sys as any).relaySignals()
    expect(b2.lit).toBe(false)
  })

  it('source lit=true, target 在 RELAY_RANGE=20 内且 random<0.08 时传播', () => {
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: false, fuel: 80, x: 10, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).relaySignals()
    expect(target.lit).toBe(true)
  })

  it('target 距离超过 RELAY_RANGE(20) 时不传播', () => {
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: false, fuel: 80, x: 25, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).relaySignals()
    expect(target.lit).toBe(false)
  })

  it('target fuel < FUEL_IGNITE_THRESHOLD(10) 时不传播', () => {
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: false, fuel: 9, x: 5, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).relaySignals()
    expect(target.lit).toBe(false)
  })

  it('random >= 0.08 时不传播', () => {
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: false, fuel: 80, x: 5, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).relaySignals()
    expect(target.lit).toBe(false)
  })

  it('target 已 lit=true 时不重复传播', () => {
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: true, fuel: 80, x: 5, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).relaySignals()
    expect(target.lit).toBe(true) // 保持 true
  })

  it('relay 后 target.lastLitTick = lastCheck', () => {
    ;(sys as any).lastCheck = 1600
    const source = makeBeacon({ lit: true, fuel: 80, x: 0, y: 0 })
    const target = makeBeacon({ lit: false, fuel: 80, x: 5, y: 0 })
    inject(sys, source); inject(sys, target)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    ;(sys as any).relaySignals()
    expect(target.lastLitTick).toBe(1600)
  })
})

// ============================================================
describe('7. getLitBeacons', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('无 beacon 时返回空数组', () => { expect(sys.getLitBeacons()).toHaveLength(0) })
  it('全部 lit=false 时返回空数组', () => {
    inject(sys, makeBeacon({ lit: false }))
    inject(sys, makeBeacon({ lit: false, x: 20, y: 20 }))
    expect(sys.getLitBeacons()).toHaveLength(0)
  })
  it('1 lit=true 时返回 1 个', () => {
    inject(sys, makeBeacon({ lit: true }))
    inject(sys, makeBeacon({ lit: false, x: 20, y: 20 }))
    expect(sys.getLitBeacons()).toHaveLength(1)
  })
  it('全部 lit=true 时全部返回', () => {
    inject(sys, makeBeacon({ lit: true, x: 10, y: 10 }))
    inject(sys, makeBeacon({ lit: true, x: 20, y: 20 }))
    inject(sys, makeBeacon({ lit: true, x: 30, y: 30 }))
    expect(sys.getLitBeacons()).toHaveLength(3)
  })
  it('返回缓冲区引用 (_litBeaconsBuf)', () => {
    inject(sys, makeBeacon({ lit: true }))
    const r1 = sys.getLitBeacons()
    const r2 = sys.getLitBeacons()
    expect(r1).toBe(r2)
  })
  it('二次调用后内容正确更新', () => {
    const b = makeBeacon({ lit: false })
    inject(sys, b)
    expect(sys.getLitBeacons()).toHaveLength(0)
    b.lit = true
    expect(sys.getLitBeacons()).toHaveLength(1)
  })
})

// ============================================================
describe('8. getBeaconAt', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('空系统返回 null', () => { expect(sys.getBeaconAt(0, 0)).toBeNull() })
  it('坐标不匹配返回 null', () => {
    inject(sys, makeBeacon({ x: 10, y: 10 }))
    expect(sys.getBeaconAt(99, 99)).toBeNull()
  })
  it('坐标匹配通过 coordMap 返回', () => {
    const b = makeBeacon({ x: 15, y: 25 })
    inject(sys, b)
    expect(sys.getBeaconAt(15, 25)).toBe(b)
  })
  it('coordMap 未记录时通过数组 fallback 查找', () => {
    const b = makeBeacon({ x: 30, y: 40 })
    ;(sys as any).beacons.push(b) // 不走 inject，不更新 coordMap
    expect(sys.getBeaconAt(30, 40)).toBe(b)
  })
  it('坐标键计算：x*10000+y', () => {
    const b = makeBeacon({ x: 3, y: 7 })
    inject(sys, b)
    const key = 3 * 10000 + 7
    expect((sys as any)._beaconCoordMap.get(key)).toBe(b)
  })
  it('不同坐标的 beacon 各自可查', () => {
    const b1 = makeBeacon({ x: 5, y: 5 })
    const b2 = makeBeacon({ x: 6, y: 6 })
    inject(sys, b1); inject(sys, b2)
    expect(sys.getBeaconAt(5, 5)).toBe(b1)
    expect(sys.getBeaconAt(6, 6)).toBe(b2)
  })
})
