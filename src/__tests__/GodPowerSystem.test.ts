import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GodPowerSystem } from '../systems/GodPowerSystem'
import type { GodPowerType } from '../systems/GodPowerSystem'

// GodPowerSystem 测试
// 注：update() 依赖 World/EntityManager/CivManager/ParticleSystem，不在此单元测试中覆盖。
// 通过 activatePower / getActiveEffects 以及模拟 update 验证核心状态机。

const ALL_POWERS: GodPowerType[] = ['bless', 'curse', 'volcano', 'time_warp', 'divine_storm']

const DURATIONS: Record<GodPowerType, number> = {
  bless: 300,
  curse: 400,
  volcano: 600,
  time_warp: 250,
  divine_storm: 200,
}

function makeGPS(): GodPowerSystem { return new GodPowerSystem() }

// 模拟 update 所需的最小依赖
function makeMinimalDeps() {
  const world = {
    width: 100, height: 100,
    getTile: () => null,
    setTile: vi.fn(),
  } as any

  const em = {
    getEntitiesWithComponent: () => [],
    getComponent: () => undefined,
    removeEntity: vi.fn(),
  } as any

  const civManager = {
    getCivAt: () => null,
  } as any

  const particles = {
    spawn: vi.fn(),
    spawnExplosion: vi.fn(),
  } as any

  return { world, em, civManager, particles }
}

// ─────────────────────────────────────────────────────────────────────────────
// 初始化
// ────────────────────────────────────────────────────────────────��────────────

describe('GodPowerSystem — 初始化', () => {
  afterEach(() => vi.restoreAllMocks())

  it('实例化成功', () => {
    expect(makeGPS()).toBeInstanceOf(GodPowerSystem)
  })

  it('初始 effects 列表为空', () => {
    expect(makeGPS().getActiveEffects()).toHaveLength(0)
  })

  it('getActiveEffects 返回数组类型', () => {
    expect(Array.isArray(makeGPS().getActiveEffects())).toBe(true)
  })

  it('多次实例化互相独立', () => {
    const g1 = makeGPS()
    const g2 = makeGPS()
    g1.activatePower('bless', 0, 0)
    expect(g2.getActiveEffects()).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getActiveEffects
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem.getActiveEffects — 基本行为', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始时效果列表为空', () => {
    expect(gps.getActiveEffects()).toHaveLength(0)
  })

  it('activatePower 后效果出现在列表中', () => {
    gps.activatePower('bless', 10, 20)
    expect(gps.getActiveEffects()).toHaveLength(1)
  })

  it('效果的 type 字段正确', () => {
    gps.activatePower('bless', 10, 20)
    expect(gps.getActiveEffects()[0].type).toBe('bless')
  })

  it('效果的 x 坐标正确（floor后）', () => {
    gps.activatePower('bless', 10, 20)
    expect(gps.getActiveEffects()[0].x).toBe(10)
  })

  it('效果的 y 坐标正确（floor后）', () => {
    gps.activatePower('bless', 10, 20)
    expect(gps.getActiveEffects()[0].y).toBe(20)
  })

  it('多次 activatePower 效果叠加', () => {
    gps.activatePower('bless', 10, 20)
    gps.activatePower('curse', 30, 40)
    gps.activatePower('divine_storm', 50, 60)
    expect(gps.getActiveEffects()).toHaveLength(3)
  })

  it('getActiveEffects 返回同一内部数组引用', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()).toBe(gps.getActiveEffects())
  })

  it('效果按激活顺序排列', () => {
    gps.activatePower('bless', 0, 0)
    gps.activatePower('curse', 0, 0)
    gps.activatePower('volcano', 0, 0)
    const types = gps.getActiveEffects().map(e => e.type)
    expect(types).toEqual(['bless', 'curse', 'volcano'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// activatePower — 坐标处理
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem.activatePower — 坐标 floor 处理', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('浮点坐标 x=10.7 被 floor 为 10', () => {
    gps.activatePower('bless', 10.7, 20.3)
    expect(gps.getActiveEffects()[0].x).toBe(10)
  })

  it('浮点坐标 y=20.3 被 floor 为 20', () => {
    gps.activatePower('bless', 10.7, 20.3)
    expect(gps.getActiveEffects()[0].y).toBe(20)
  })

  it('负浮点坐标 x=-3.1 被 floor 为 -4', () => {
    gps.activatePower('bless', -3.1, 0)
    expect(gps.getActiveEffects()[0].x).toBe(-4)
  })

  it('零坐标不变', () => {
    gps.activatePower('bless', 0, 0)
    const e = gps.getActiveEffects()[0]
    expect(e.x).toBe(0)
    expect(e.y).toBe(0)
  })

  it('整数坐标不受影响', () => {
    gps.activatePower('bless', 15, 25)
    const e = gps.getActiveEffects()[0]
    expect(e.x).toBe(15)
    expect(e.y).toBe(25)
  })

  it('大浮点数坐标正确 floor', () => {
    gps.activatePower('curse', 99.9, 50.01)
    const e = gps.getActiveEffects()[0]
    expect(e.x).toBe(99)
    expect(e.y).toBe(50)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// activatePower — duration & radius
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem.activatePower — ticksLeft (duration)', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('bless 持续 300 ticks', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(300)
  })

  it('curse 持续 400 ticks', () => {
    gps.activatePower('curse', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(400)
  })

  it('volcano 持续 600 ticks', () => {
    gps.activatePower('volcano', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(600)
  })

  it('time_warp 持续 250 ticks', () => {
    gps.activatePower('time_warp', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(250)
  })

  it('divine_storm 持续 200 ticks', () => {
    gps.activatePower('divine_storm', 0, 0)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(200)
  })

  it('所有 power 的 ticksLeft 与预期完全吻合', () => {
    for (const [power, dur] of Object.entries(DURATIONS) as [GodPowerType, number][]) {
      const g = makeGPS()
      g.activatePower(power, 0, 0)
      expect(g.getActiveEffects()[0].ticksLeft).toBe(dur)
    }
  })
})

describe('GodPowerSystem.activatePower — radius', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('volcano 使用特殊半径 5', () => {
    gps.activatePower('volcano', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(5)
  })

  it('bless 使用标准半径 8', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(8)
  })

  it('curse 使用标准半径 8', () => {
    gps.activatePower('curse', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(8)
  })

  it('time_warp 使用标准半径 8', () => {
    gps.activatePower('time_warp', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(8)
  })

  it('divine_storm 使用标准半径 8', () => {
    gps.activatePower('divine_storm', 0, 0)
    expect(gps.getActiveEffects()[0].radius).toBe(8)
  })

  it('只有 volcano 半径为 5，其余均为 8', () => {
    for (const power of ALL_POWERS) {
      const g = makeGPS()
      g.activatePower(power, 0, 0)
      const expectedRadius = power === 'volcano' ? 5 : 8
      expect(g.getActiveEffects()[0].radius).toBe(expectedRadius)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 支持所有合法 GodPowerType
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem.activatePower — 支持所有 GodPowerType', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('支持 bless', () => {
    expect(() => gps.activatePower('bless', 0, 0)).not.toThrow()
  })

  it('支持 curse', () => {
    expect(() => gps.activatePower('curse', 0, 0)).not.toThrow()
  })

  it('支持 volcano', () => {
    expect(() => gps.activatePower('volcano', 0, 0)).not.toThrow()
  })

  it('支持 time_warp', () => {
    expect(() => gps.activatePower('time_warp', 0, 0)).not.toThrow()
  })

  it('支持 divine_storm', () => {
    expect(() => gps.activatePower('divine_storm', 0, 0)).not.toThrow()
  })

  it('所有5种 power 激活后 effects 长度为 5', () => {
    ALL_POWERS.forEach(p => gps.activatePower(p, 0, 0))
    expect(gps.getActiveEffects()).toHaveLength(ALL_POWERS.length)
  })

  it('所有5种 power 的 type 字段正确', () => {
    ALL_POWERS.forEach(p => gps.activatePower(p, 0, 0))
    const types = gps.getActiveEffects().map(e => e.type)
    expect(types).toEqual(ALL_POWERS)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// update — ticksLeft 倒计时
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem.update — ticksLeft 倒计时与过期移除', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update 调用，ticksLeft 减少 1', () => {
    gps.activatePower('bless', 0, 0)
    const { world, em, civManager, particles } = makeMinimalDeps()
    gps.update(world, em, civManager, particles, 1)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(299)
  })

  it('ticksLeft 减为 0 时效果被移除', () => {
    gps.activatePower('bless', 0, 0)
    const { world, em, civManager, particles } = makeMinimalDeps()
    // 调用300次，每次-1
    for (let t = 1; t <= 300; t++) {
      gps.update(world, em, civManager, particles, t)
    }
    expect(gps.getActiveEffects()).toHaveLength(0)
  })

  it('ticksLeft=1 时执行最后一次逻辑后移除', () => {
    gps.activatePower('bless', 0, 0)
    // 手动设置 ticksLeft=1
    ;(gps as any).effects[0].ticksLeft = 1
    const { world, em, civManager, particles } = makeMinimalDeps()
    gps.update(world, em, civManager, particles, 1)
    expect(gps.getActiveEffects()).toHaveLength(0)
  })

  it('两个效果独立倒计时，各自到期', () => {
    gps.activatePower('divine_storm', 0, 0)  // 200 ticks
    gps.activatePower('curse', 0, 0)          // 400 ticks
    const { world, em, civManager, particles } = makeMinimalDeps()
    for (let t = 1; t <= 200; t++) {
      gps.update(world, em, civManager, particles, t)
    }
    // divine_storm 已到期，curse 还剩 200 ticks
    expect(gps.getActiveEffects()).toHaveLength(1)
    expect(gps.getActiveEffects()[0].type).toBe('curse')
  })

  it('没有效果时 update 不抛错', () => {
    const { world, em, civManager, particles } = makeMinimalDeps()
    expect(() => gps.update(world, em, civManager, particles, 1)).not.toThrow()
  })

  it('update 后 ticksLeft 精确递减', () => {
    gps.activatePower('curse', 0, 0)  // 400
    const { world, em, civManager, particles } = makeMinimalDeps()
    for (let t = 1; t <= 50; t++) {
      gps.update(world, em, civManager, particles, t)
    }
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(350)
  })

  it('多个效果同时过期时都被移除', () => {
    gps.activatePower('divine_storm', 0, 0)  // 200
    gps.activatePower('bless', 0, 0)          // 300
    ;(gps as any).effects[0].ticksLeft = 2
    ;(gps as any).effects[1].ticksLeft = 2
    const { world, em, civManager, particles } = makeMinimalDeps()
    gps.update(world, em, civManager, particles, 1)
    gps.update(world, em, civManager, particles, 2)
    expect(gps.getActiveEffects()).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ActiveEffect 结构完整性
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem — ActiveEffect 结构完整性', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('效果包含 type 字段', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0]).toHaveProperty('type')
  })

  it('效果包含 x 字段', () => {
    gps.activatePower('bless', 5, 10)
    expect(gps.getActiveEffects()[0]).toHaveProperty('x')
  })

  it('效果包含 y 字段', () => {
    gps.activatePower('bless', 5, 10)
    expect(gps.getActiveEffects()[0]).toHaveProperty('y')
  })

  it('效果包含 radius 字段', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0]).toHaveProperty('radius')
  })

  it('效果包含 ticksLeft 字段', () => {
    gps.activatePower('bless', 0, 0)
    expect(gps.getActiveEffects()[0]).toHaveProperty('ticksLeft')
  })

  it('radius 为正整数', () => {
    for (const p of ALL_POWERS) {
      const g = makeGPS()
      g.activatePower(p, 0, 0)
      expect(g.getActiveEffects()[0].radius).toBeGreaterThan(0)
    }
  })

  it('ticksLeft 为正整数', () => {
    for (const p of ALL_POWERS) {
      const g = makeGPS()
      g.activatePower(p, 0, 0)
      expect(g.getActiveEffects()[0].ticksLeft).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 同一位置多次激活同一 power
// ─────────────────────────────────────────────────────────────────────────────

describe('GodPowerSystem — 重复激活行为', () => {
  let gps: GodPowerSystem
  beforeEach(() => { gps = makeGPS() })
  afterEach(() => vi.restoreAllMocks())

  it('同一 power 激活两次叠加为两个效果', () => {
    gps.activatePower('bless', 10, 10)
    gps.activatePower('bless', 10, 10)
    expect(gps.getActiveEffects()).toHaveLength(2)
  })

  it('同一 power 激活两次各自独立计时', () => {
    gps.activatePower('bless', 0, 0)
    gps.activatePower('bless', 0, 0)
    ;(gps as any).effects[0].ticksLeft = 1
    ;(gps as any).effects[1].ticksLeft = 5
    const { world, em, civManager, particles } = makeMinimalDeps()
    gps.update(world, em, civManager, particles, 1)
    // 第一个到期被移除，第二个还剩 4
    expect(gps.getActiveEffects()).toHaveLength(1)
    expect(gps.getActiveEffects()[0].ticksLeft).toBe(4)
  })

  it('不同位置激活的同一 power 坐标独立', () => {
    gps.activatePower('curse', 10, 20)
    gps.activatePower('curse', 50, 60)
    const effects = gps.getActiveEffects()
    expect(effects[0].x).toBe(10)
    expect(effects[0].y).toBe(20)
    expect(effects[1].x).toBe(50)
    expect(effects[1].y).toBe(60)
  })
})
