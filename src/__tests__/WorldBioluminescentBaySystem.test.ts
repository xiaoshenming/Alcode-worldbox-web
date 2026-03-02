import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBioluminescentBaySystem } from '../systems/WorldBioluminescentBaySystem'
import type { BioluminescentBay } from '../systems/WorldBioluminescentBaySystem'

// ---- helpers ----
function makeSys(): WorldBioluminescentBaySystem { return new WorldBioluminescentBaySystem() }
let nextId = 1
function makeBay(overrides: Partial<BioluminescentBay> = {}): BioluminescentBay {
  return {
    id: nextId++, x: 30, y: 40,
    intensity: 50, organismDensity: 50,
    waterClarity: 70, culturalValue: 15,
    seasonalPeak: false, tick: 0,
    ...overrides,
  }
}
// tile=0(DEEP_WATER) 或 tile=1(SHALLOW_WATER) 允许生成
function makeWorld(tile: number = 0): any {
  return { width: 100, height: 100, getTile: () => tile }
}
function doUpdate(sys: WorldBioluminescentBaySystem, world: any, tick = 3000): void {
  ;(sys as any).update(1, world, {}, tick)
}

describe('WorldBioluminescentBaySystem – 初始状态', () => {
  it('启动时生物发光湾列表为空', () => {
    const sys = makeSys()
    expect((sys as any).bays).toHaveLength(0)
  })
  it('nextId 从 1 开始', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).lastCheck).toBe(0)
  })
})

describe('WorldBioluminescentBaySystem – CHECK_INTERVAL 节流', () => {
  it('tick 不足 CHECK_INTERVAL(2200) 时不执行逻辑', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).update(1, makeWorld(0), {}, 100)
    expect((sys as any).bays).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('超过 CHECK_INTERVAL 后 lastCheck 更新为当前 tick', () => {
    const sys = makeSys()
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('同一 check 窗口内不重复触发', () => {
    const sys = makeSys()
    const world = makeWorld(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).update(1, world, {}, 3000)
    const count = (sys as any).bays.length
    ;(sys as any).update(1, world, {}, 4000)  // 4000-3000=1000 < 2200
    expect((sys as any).bays).toHaveLength(count)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescentBaySystem – 生成逻辑', () => {
  it('tile=0(DEEP_WATER) + 低随机数 → 生成一个发光湾', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 3000)
    expect((sys as any).bays).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tile=1(SHALLOW_WATER) + 低随机数 → 生成一个发光湾', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(1), 3000)
    expect((sys as any).bays).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tile=2(SAND) → 不生成（条件为 tile>=0 && tile<=1）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(2), 3000)
    expect((sys as any).bays).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('随机数高于 SPAWN_CHANCE(0.002) → 不生成', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(0), 3000)
    expect((sys as any).bays).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('超过 MAX_BAYS(10) 后不再生成', () => {
    const sys = makeSys()
    for (let i = 0; i < 10; i++) (sys as any).bays.push(makeBay({ tick: 3000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 3000)
    expect((sys as any).bays).toHaveLength(10)
    vi.restoreAllMocks()
  })
  it('新生成的发光湾字段在合理范围内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 5000)
    const b: BioluminescentBay = (sys as any).bays[0]
    // intensity 由演化公式覆盖：= min(100, density*0.6*peakMult*(clarity/100))
    // 不检查初始值，改为检查演化后的上限约束
    expect(b.intensity).toBeGreaterThanOrEqual(0)
    expect(b.intensity).toBeLessThanOrEqual(100)
    // organismDensity 初始 20+random*50≈20.05，演化后 Math.max(5,...) 最低 5
    expect(b.organismDensity).toBeGreaterThanOrEqual(5)
    // waterClarity 初始 40+random*40≈40.04，演化后 Math.max(10,...) 最低 10
    expect(b.waterClarity).toBeGreaterThanOrEqual(10)
    expect(b.culturalValue).toBeGreaterThanOrEqual(5)
    expect(b.tick).toBe(5000)
    vi.restoreAllMocks()
  })
  it('id 自增：连续两次生成 id 递增', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).update(1, makeWorld(0), {}, 3000)
    ;(sys as any).lastCheck = 0
    ;(sys as any).update(1, makeWorld(0), {}, 6000)
    const ids = (sys as any).bays.map((b: BioluminescentBay) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescentBaySystem – 属性演化', () => {
  it('seasonalPeak 随 tick%20000<5000 正确切换', () => {
    const sys = makeSys()
    const b = makeBay({ tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=3000, 3000%20000=3000 < 5000 → seasonalPeak=true
    ;(sys as any).lastCheck = 0
    doUpdate(sys, makeWorld(), 3000)
    expect(b.seasonalPeak).toBe(true)
    vi.restoreAllMocks()
  })
  it('seasonalPeak=false 时 tick%20000>=5000', () => {
    const sys = makeSys()
    const b = makeBay({ tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=8000, 8000%20000=8000 >= 5000 → seasonalPeak=false
    doUpdate(sys, makeWorld(), 8000)
    expect(b.seasonalPeak).toBe(false)
    vi.restoreAllMocks()
  })
  it('intensity 不超过 100', () => {
    const sys = makeSys()
    const b = makeBay({ organismDensity: 100, waterClarity: 100, tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.intensity).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })
  it('culturalValue 随 intensity 缓慢增长', () => {
    const sys = makeSys()
    const b = makeBay({ culturalValue: 10, intensity: 50, organismDensity: 50, waterClarity: 70, tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.culturalValue).toBeGreaterThan(10)
    vi.restoreAllMocks()
  })
  it('waterClarity 保持在 [10, 100] 范围内', () => {
    const sys = makeSys()
    const b = makeBay({ waterClarity: 50, tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.waterClarity).toBeGreaterThanOrEqual(10)
    expect(b.waterClarity).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })
  it('organismDensity 保持在 [5, 100] 范围内', () => {
    const sys = makeSys()
    const b = makeBay({ organismDensity: 50, tick: 0 })
    ;(sys as any).bays.push(b)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 3000)
    expect(b.organismDensity).toBeGreaterThanOrEqual(5)
    expect(b.organismDensity).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescentBaySystem – 清理逻辑', () => {
  it('organismDensity > 5 时不被清理', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bays.push(makeBay({ organismDensity: 50, tick: 0 }))
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).bays).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('organismDensity <= 5 时湾被移除', () => {
    const sys = makeSys()
    // random < 0.48 使 delta=(random-0.48)*2 为负，density=max(5, 5+负)=5 → 清理
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    ;(sys as any).bays.push(makeBay({ organismDensity: 5, tick: 0 }))
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).bays).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('新旧混合：只清理 organismDensity<=5 的', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    ;(sys as any).bays.push(makeBay({ organismDensity: 50, tick: 0 }))  // 保留
    ;(sys as any).bays.push(makeBay({ organismDensity: 5, tick: 0 }))   // 清理
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).bays).toHaveLength(1)
    expect((sys as any).bays[0].organismDensity).toBeGreaterThan(5)
    vi.restoreAllMocks()
  })
  it('所有 organismDensity<=5 时列表清空', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < 4; i++) (sys as any).bays.push(makeBay({ organismDensity: 5, tick: 0 }))
    doUpdate(sys, makeWorld(), 3000)
    expect((sys as any).bays).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
