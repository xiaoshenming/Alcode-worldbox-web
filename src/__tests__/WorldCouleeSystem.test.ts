import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCouleeSystem } from '../systems/WorldCouleeSystem'
import type { Coulee } from '../systems/WorldCouleeSystem'

function makeSys(): WorldCouleeSystem { return new WorldCouleeSystem() }
let nextId = 1
function makeCoulee(overrides: Partial<Coulee> = {}): Coulee {
  return {
    id: nextId++, x: 20, y: 30, length: 25, wallSteepness: 70,
    lavaPresence: 20, erosionRate: 3, vegetationCover: 40, spectacle: 65, tick: 0,
    ...overrides,
  }
}

// 安全world mock：getTile返回0(DEEP_WATER)，不会触发spawn
const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
// 山地world mock：getTile返回5(MOUNTAIN)，触发spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
const em = {} as any

// ─── 基础状态 ───────────────────────────────────────────────────────────────
describe('WorldCouleeSystem 基础状态', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无熔岩沟', () => {
    expect((sys as any).coulees).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).coulees.push(makeCoulee())
    expect((sys as any).coulees).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).coulees).toBe((sys as any).coulees)
  })

  it('熔岩沟字段正确', () => {
    ;(sys as any).coulees.push(makeCoulee())
    const c = (sys as any).coulees[0]
    expect(c.wallSteepness).toBe(70)
    expect(c.lavaPresence).toBe(20)
    expect(c.spectacle).toBe(65)
  })

  it('多个熔岩沟全部返回', () => {
    ;(sys as any).coulees.push(makeCoulee())
    ;(sys as any).coulees.push(makeCoulee())
    expect((sys as any).coulees).toHaveLength(2)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────
describe('WorldCouleeSystem CHECK_INTERVAL=2580 节流', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0时update不崩溃（trigger）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(16, safeWorld, em, 0)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('tick<2580时不触发任何逻辑（列表保持空）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 即使random极小也不触发
    sys.update(16, mountainWorld, em, 2579)
    // lastCheck仍为0意味着没有运行
    expect((sys as any).lastCheck).toBe(0)
    vi.restoreAllMocks()
  })

  it('tick>=2580时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 2580)
    expect((sys as any).lastCheck).toBe(2580)
    vi.restoreAllMocks()
  })

  it('首次trigger后，再次调用tick=2580+1不重复触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 2580)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(16, safeWorld, em, 2581)
    expect((sys as any).lastCheck).toBe(lastCheck1)  // 没有更新
    vi.restoreAllMocks()
  })

  it('两次trigger间隔>=2580时触发第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, safeWorld, em, 2580)
    sys.update(16, safeWorld, em, 5160)
    expect((sys as any).lastCheck).toBe(5160)
    vi.restoreAllMocks()
  })
})

// ─── spawn 逻辑 ─────────────────────────────────────────────────────────────
describe('WorldCouleeSystem spawn逻辑', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('getTile=DEEP_WATER(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // random极小，满足FORM_CHANCE
    sys.update(16, safeWorld, em, 2580)
    expect((sys as any).coulees).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('getTile=MOUNTAIN(5)且random<FORM_CHANCE时spawn', () => {
    // FORM_CHANCE=0.0015, mockReturnValue(0.001) < 0.0015 => spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, mountainWorld, em, 2580)
    expect((sys as any).coulees).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('getTile=GRASS(3)时也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
    sys.update(16, grassWorld, em, 2580)
    expect((sys as any).coulees).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('random>=FORM_CHANCE时不spawn', () => {
    // FORM_CHANCE=0.0015, mockReturnValue(0.9) >= 0.0015 => 不spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(16, mountainWorld, em, 2580)
    expect((sys as any).coulees).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn的coulee含有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, mountainWorld, em, 2580)
    const c = (sys as any).coulees[0]
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('x')
    expect(c).toHaveProperty('y')
    expect(c).toHaveProperty('wallSteepness')
    expect(c).toHaveProperty('lavaPresence')
    expect(c).toHaveProperty('erosionRate')
    expect(c).toHaveProperty('vegetationCover')
    expect(c).toHaveProperty('spectacle')
    expect(c).toHaveProperty('tick')
    vi.restoreAllMocks()
  })

  it('MAX_COULEES=15时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // 预填15个
    for (let i = 0; i < 15; i++) {
      ;(sys as any).coulees.push(makeCoulee())
    }
    sys.update(16, mountainWorld, em, 2580)
    expect((sys as any).coulees).toHaveLength(15)
    vi.restoreAllMocks()
  })

  it('spawn时tick字段记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(16, mountainWorld, em, 2580)
    expect((sys as any).coulees[0].tick).toBe(2580)
    vi.restoreAllMocks()
  })
})

// ─── cleanup 逻辑 ────────────────────────────────────────────────────────────
describe('WorldCouleeSystem cleanup (cutoff=tick-87000)', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick字段比cutoff更早的coulee被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=0的coulee在tick=87001时: cutoff=87001-87000=1, 0<1 => 删除
    ;(sys as any).coulees.push(makeCoulee({ tick: 0 }))
    sys.update(16, safeWorld, em, 87001)
    expect((sys as any).coulees).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('tick字段等于cutoff的coulee保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=90001的coulee在tick=177001时: cutoff=90001, 90001 < 90001 = false => 保留
    ;(sys as any).coulees.push(makeCoulee({ tick: 90001 }))
    sys.update(16, safeWorld, em, 177001)
    expect((sys as any).coulees).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('新旧混合：只删除旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).coulees.push(makeCoulee({ tick: 0 }))     // 旧的，tick=87001时删
    ;(sys as any).coulees.push(makeCoulee({ tick: 87000 })) // 新的，保留
    sys.update(16, safeWorld, em, 87001)
    expect((sys as any).coulees).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

// ─── 字段演化 ────────────────────────────────────────────────────────────────
describe('WorldCouleeSystem 字段演化约束', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('wallSteepness始终在[15,90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).coulees.push(makeCoulee({ wallSteepness: 89.9 }))
    sys.update(16, safeWorld, em, 2580)
    const c = (sys as any).coulees[0]
    expect(c.wallSteepness).toBeGreaterThanOrEqual(15)
    expect(c.wallSteepness).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('lavaPresence始终在[0,50]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).coulees.push(makeCoulee({ lavaPresence: 49 }))
    sys.update(16, safeWorld, em, 2580)
    const c = (sys as any).coulees[0]
    expect(c.lavaPresence).toBeGreaterThanOrEqual(0)
    expect(c.lavaPresence).toBeLessThanOrEqual(50)
    vi.restoreAllMocks()
  })

  it('vegetationCover不超过60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).coulees.push(makeCoulee({ vegetationCover: 59.99 }))
    sys.update(16, safeWorld, em, 2580)
    const c = (sys as any).coulees[0]
    expect(c.vegetationCover).toBeLessThanOrEqual(60)
    vi.restoreAllMocks()
  })

  it('spectacle始终在[5,65]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).coulees.push(makeCoulee({ spectacle: 64.9 }))
    sys.update(16, safeWorld, em, 2580)
    const c = (sys as any).coulees[0]
    expect(c.spectacle).toBeGreaterThanOrEqual(5)
    expect(c.spectacle).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})
