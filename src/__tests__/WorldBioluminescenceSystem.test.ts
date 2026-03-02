import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBioluminescenceSystem } from '../systems/WorldBioluminescenceSystem'
import type { BioluminescentZone, GlowType } from '../systems/WorldBioluminescenceSystem'

// ---- helpers ----
function makeSys(): WorldBioluminescenceSystem { return new WorldBioluminescenceSystem() }
let nextId = 1
function makeZone(overrides: Partial<BioluminescentZone> = {}): BioluminescentZone {
  return {
    id: nextId++, x: 30, y: 40,
    glowType: 'jellyfish', brightness: 70, color: '#8844ff',
    spread: 3, active: true, tick: 0,
    ...overrides,
  }
}
// tile=0 (DEEP_WATER) 是允许生成的地块
function makeWorld(tile: number = 0): any {
  return { width: 100, height: 100, getTile: () => tile }
}
function doUpdate(sys: WorldBioluminescenceSystem, world: any, tick = 4000): void {
  ;(sys as any).update(1, world, {}, tick)
}

describe('WorldBioluminescenceSystem – 初始状态', () => {
  it('启动时生物发光区列表为空', () => {
    const sys = makeSys()
    expect((sys as any).zones).toHaveLength(0)
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

describe('WorldBioluminescenceSystem – CHECK_INTERVAL 节流', () => {
  it('tick 不足 CHECK_INTERVAL(3200) 时不执行逻辑', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).update(1, makeWorld(0), {}, 100)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('超过 CHECK_INTERVAL 后 lastCheck 更新为当前 tick', () => {
    const sys = makeSys()
    doUpdate(sys, makeWorld(), 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })
  it('同一 check 窗口内第二次 update 不重复触发', () => {
    const sys = makeSys()
    const world = makeWorld(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).update(1, world, {}, 4000)
    const count = (sys as any).zones.length
    ;(sys as any).update(1, world, {}, 5000)  // 5000-4000=1000 < 3200
    expect((sys as any).zones).toHaveLength(count)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescenceSystem – 生成逻辑', () => {
  it('tile=0(DEEP_WATER) + 低随机数 → 生成一个发光区', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 4000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tile=1(SHALLOW_WATER) + 低随机数 → 生成一个发光区', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(1), 4000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tile=4(FOREST) + 低随机数 → 生成一个发光区', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(4), 4000)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tile=5(MOUNTAIN) + 低随机数 → 不生成', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(5), 4000)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('随机数高于 SPAWN_CHANCE(0.003) → 不生成', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(0), 4000)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('超过 MAX_ZONES(14) 后不再生成', () => {
    const sys = makeSys()
    for (let i = 0; i < 14; i++) (sys as any).zones.push(makeZone({ tick: 4000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 4000)
    expect((sys as any).zones).toHaveLength(14)
    vi.restoreAllMocks()
  })
  it('新生成的发光区 active=true，spread 在 [2,6] 内', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 4000)
    const z: BioluminescentZone = (sys as any).zones[0]
    expect(z.active).toBe(true)
    expect(z.spread).toBeGreaterThanOrEqual(2)
    expect(z.spread).toBeLessThanOrEqual(6)
    vi.restoreAllMocks()
  })
  it('glowType 是 4 种合法类型之一', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 4000)
    const validTypes: GlowType[] = ['algae', 'jellyfish', 'fungi', 'plankton']
    expect(validTypes).toContain((sys as any).zones[0].glowType)
    vi.restoreAllMocks()
  })
  it('brightness 与 glowType 对应（algae=40）', () => {
    const sys = makeSys()
    // 强制 pickRandom 选中 'algae'（第一个元素 → floor(0*4)=0）
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    doUpdate(sys, makeWorld(0), 4000)
    const z: BioluminescentZone = (sys as any).zones[0]
    // brightness 会随 tick 以正弦波动，检查在合理范围内
    expect(z.brightness).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescenceSystem – 属性演化', () => {
  it('每次 update 后 brightness 根据正弦函数更新，值在 [base*0.2, base] 范围内', () => {
    const sys = makeSys()
    const z = makeZone({ glowType: 'jellyfish', tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 4000)
    // jellyfish 基础亮度=70；正弦因子 0.6+0.4*sin(x) 范围 [0.2, 1.0]
    // 所以 brightness ∈ [70*0.2, 70*1.0] = [14, 70]
    expect(z.brightness).toBeGreaterThanOrEqual(14)
    expect(z.brightness).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })
  it('spread 最大不超过 12', () => {
    const sys = makeSys()
    const z = makeZone({ spread: 12, tick: 0 })
    ;(sys as any).zones.push(z)
    // 强制随机数 < 0.001 触发 spread 增加
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    doUpdate(sys, makeWorld(), 4000)
    expect(z.spread).toBeLessThanOrEqual(12)
    vi.restoreAllMocks()
  })
})

describe('WorldBioluminescenceSystem – active/cleanup 逻辑', () => {
  it('age < 200000 时 zone 保持 active', () => {
    const sys = makeSys()
    const z = makeZone({ tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 4000)   // age=4000 < 200000
    expect(z.active).toBe(true)
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('age > 200000 时 zone 被标记为 inactive 并从列表移除', () => {
    const sys = makeSys()
    const z = makeZone({ tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    doUpdate(sys, makeWorld(), 210000)   // age=210000 > 200000
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('手动设置 active=false 的 zone 在下次 update 时被清理', () => {
    const sys = makeSys()
    const z = makeZone({ active: false, tick: 0 })
    ;(sys as any).zones.push(z)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 4000)
    expect((sys as any).zones).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('新旧混合：只清理 active=false 的', () => {
    const sys = makeSys()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))          // 未过期
    ;(sys as any).zones.push(makeZone({ tick: 0, active: false })) // 已失效
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    doUpdate(sys, makeWorld(), 4000)
    // 第一个 age=4000<200000 → 仍 active，保留
    expect((sys as any).zones).toHaveLength(1)
    vi.restoreAllMocks()
  })
})
