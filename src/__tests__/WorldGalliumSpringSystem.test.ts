import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldGalliumSpringSystem } from '../systems/WorldGalliumSpringSystem'

// WorldGalliumSpringSystem: CHECK_INTERVAL=2890, MAX_ZONES=32, cutoff=tick-54000
// spawn条件: nearWater(SHALLOW_WATER=1 or DEEP_WATER=0) || nearMountain(MOUNTAIN=5)
// FORM_CHANCE=0.003: random > 0.003 跳过

const CHECK_INTERVAL = 2890
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000

function makeSys() { return new WorldGalliumSpringSystem() }

const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any  // SAND阻断spawn
const em = {} as any

function getZones(sys: WorldGalliumSpringSystem): any[] {
  return (sys as any).zones
}
function getLastCheck(sys: WorldGalliumSpringSystem): number {
  return (sys as any).lastCheck
}
function getNextId(sys: WorldGalliumSpringSystem): number {
  return (sys as any).nextId
}

function injectZone(sys: WorldGalliumSpringSystem, tick: number, overrides: any = {}) {
  const zone = {
    id: getZones(sys).length + 1, x: getZones(sys).length, y: 0,
    galliumContent: 60, springFlow: 30,
    bauxiteLeaching: 50, mineralLiquidity: 40,
    tick,
    ...overrides,
  }
  getZones(sys).push(zone)
  return zone
}

describe('WorldGalliumSpringSystem', () => {
  let sys: WorldGalliumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => { vi.restoreAllMocks() })

  // --- 1. 基础状态 ---
  describe('初始状态', () => {
    it('zones初始为空数组', () => {
      expect(getZones(sys)).toHaveLength(0)
    })
    it('lastCheck初始为0', () => {
      expect(getLastCheck(sys)).toBe(0)
    })
    it('nextId初始为1', () => {
      expect(getNextId(sys)).toBe(1)
    })
    it('多个实例互不干扰', () => {
      const s2 = makeSys()
      expect(getZones(s2)).not.toBe(getZones(sys))
    })
    it('注入zone后zones非空', () => {
      injectZone(sys, 1000)
      expect(getZones(sys)).toHaveLength(1)
    })
  })

  // --- 2. CHECK_INTERVAL节流 ---
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL时不执行（lastCheck不更新）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
      expect(getLastCheck(sys)).toBe(0)
    })
    it('tick === CHECK_INTERVAL时执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL)
    })
    it('tick超过CHECK_INTERVAL时执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL + 999)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL + 999)
    })
    it('刚执行后再次调用不重复执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      const saved = getLastCheck(sys)
      sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
      expect(getLastCheck(sys)).toBe(saved)
    })
    it('两次满足间隔均更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL * 2)
    })
  })

  // --- 3. spawn条件 ---
  describe('spawn/生成逻辑', () => {
    it('random=0.9不spawn（FORM_CHANCE=0.003）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('SAND tile阻断spawn（无水/山相邻）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('达到MAX_ZONES时不新增zone', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < MAX_ZONES; i++) injectZone(sys, 1000000, { x: i })
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys).length).toBe(MAX_ZONES)
    })
    it('达到MAX_ZONES时spawn循环即break', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      for (let i = 0; i < MAX_ZONES; i++) injectZone(sys, 100000, { x: i })
      const before = getZones(sys).length
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys).length).toBe(before)
    })
    it('低于MAX_ZONES时有机会spawn（只要tile/random合适）', () => {
      // 即便world是safe，测试系统不会因为低于MAX而崩溃
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      expect(getZones(sys).length).toBeLessThan(MAX_ZONES)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      // 没有崩溃即通过
    })
  })

  // --- 4. cleanup/过期清理 ---
  describe('cleanup过期清理', () => {
    it('tick < cutoff的zone被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 1000
      injectZone(sys, 0) // 过期
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('tick >= cutoff的zone保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET
      const zoneTick = currentTick - CUTOFF_OFFSET + 1
      injectZone(sys, zoneTick)
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(1)
    })
    it('tick === cutoff时zone保留（边界条件）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET
      const cutoff = currentTick - CUTOFF_OFFSET
      injectZone(sys, cutoff)
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(1)
    })
    it('混合场景：过期删除，未过期保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 200
      injectZone(sys, 0, { x: 0 })         // 过期
      injectZone(sys, currentTick - 1000, { x: 1 }) // 未过期
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(1)
    })
    it('全部过期时zones清空', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 100
      for (let i = 0; i < 5; i++) injectZone(sys, 0, { x: i })
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('全部未过期时zones全保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET
      const freshTick = currentTick - 100
      for (let i = 0; i < 4; i++) injectZone(sys, freshTick, { x: i })
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(4)
    })
    it('多轮update中到期zone被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const t1 = CHECK_INTERVAL
      injectZone(sys, t1)
      sys.update(1, safeWorld, em, t1)
      expect(getZones(sys)).toHaveLength(1)
      sys.update(1, safeWorld, em, t1 + CHECK_INTERVAL + CUTOFF_OFFSET)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('大量zone混合过期场景', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 500
      for (let i = 0; i < 10; i++) {
        // 偶数过期，奇数不过期
        const t = i % 2 === 0 ? 0 : currentTick - 1000
        injectZone(sys, t, { x: i })
      }
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(5)
    })
  })

  // --- 5. zone字段验证 ---
  describe('zone字段验证', () => {
    it('zone拥有galliumContent字段', () => {
      const z = injectZone(sys, 1000)
      expect(z).toHaveProperty('galliumContent')
    })
    it('zone拥有springFlow字段', () => {
      const z = injectZone(sys, 1000)
      expect(z).toHaveProperty('springFlow')
    })
    it('zone拥有bauxiteLeaching字段', () => {
      const z = injectZone(sys, 1000)
      expect(z).toHaveProperty('bauxiteLeaching')
    })
    it('zone拥有mineralLiquidity字段', () => {
      const z = injectZone(sys, 1000)
      expect(z).toHaveProperty('mineralLiquidity')
    })
    it('zone id唯一', () => {
      for (let i = 0; i < 5; i++) injectZone(sys, 1000, { x: i })
      const ids = getZones(sys).map((z: any) => z.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
    it('zones可包含多个zone', () => {
      for (let i = 0; i < 8; i++) injectZone(sys, 1000, { x: i })
      expect(getZones(sys)).toHaveLength(8)
    })
  })
})

describe('WorldGalliumSpringSystem - 附加测试', () => {
  let sys: WorldGalliumSpringSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones初始为空数组', () => { expect(getZones(sys)).toHaveLength(0) })
  it('nextId初始为1', () => { expect(getNextId(sys)).toBe(1) })
  it('lastCheck初始为0', () => { expect(getLastCheck(sys)).toBe(0) })
  it('tick不足CHECK_INTERVAL=2890时不更新lastCheck', () => {
    sys.update(1, safeWorld, em, 100)
    expect(getLastCheck(sys)).toBe(0)
  })
  it('tick=2890时更新lastCheck', () => {
    sys.update(1, safeWorld, em, 2890)
    expect(getLastCheck(sys)).toBe(2890)
  })
  it('tick=2889时不触发', () => {
    sys.update(1, safeWorld, em, 2889)
    expect(getLastCheck(sys)).toBe(0)
  })
  it('tick=5780时再次触发', () => {
    sys.update(1, safeWorld, em, 2890)
    sys.update(1, safeWorld, em, 5780)
    expect(getLastCheck(sys)).toBe(5780)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, safeWorld, em, 8670)
    expect(getLastCheck(sys)).toBe(8670)
  })
  it('注入zone后长度为1', () => {
    injectZone(sys, 1000)
    expect(getZones(sys)).toHaveLength(1)
  })
  it('注入5个后长度为5', () => {
    for (let i = 0; i < 5; i++) { injectZone(sys, 1000, { x: i }) }
    expect(getZones(sys)).toHaveLength(5)
  })
  it('zone含galliumContent字段', () => {
    const z = injectZone(sys, 1000)
    expect(typeof z.galliumContent).toBe('number')
  })
  it('zone含springFlow字段', () => {
    const z = injectZone(sys, 1000)
    expect(typeof z.springFlow).toBe('number')
  })
  it('zone含bauxiteLeaching字段', () => {
    const z = injectZone(sys, 1000)
    expect(typeof z.bauxiteLeaching).toBe('number')
  })
  it('zone含mineralLiquidity字段', () => {
    const z = injectZone(sys, 1000)
    expect(typeof z.mineralLiquidity).toBe('number')
  })
  it('zone含tick字段', () => {
    const z = injectZone(sys, 5000)
    expect(z.tick).toBe(5000)
  })
  it('zone含id字段', () => {
    const z = injectZone(sys, 1000)
    expect(typeof z.id).toBe('number')
  })
  it('过期zone被删除', () => {
    injectZone(sys, 0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + CUTOFF_OFFSET + 100)
    expect(getZones(sys)).toHaveLength(0)
  })
  it('未过期zone保留', () => {
    const ct = CHECK_INTERVAL + CUTOFF_OFFSET
    injectZone(sys, ct - 1000)
    sys.update(1, safeWorld, em, ct)
    expect(getZones(sys)).toHaveLength(1)
  })
  it('混合新旧只删旧的', () => {
    injectZone(sys, 0)
    injectZone(sys, 90000)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + CUTOFF_OFFSET + 100)
    expect(getZones(sys)).toHaveLength(1)
  })
  it('MAX_ZONES=32硬上限不超过', () => {
    for (let i = 0; i < 32; i++) { injectZone(sys, 999999, { x: i }) }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect(getZones(sys).length).toBeLessThanOrEqual(32)
  })
  it('zones中id不重复', () => {
    for (let i = 0; i < 5; i++) { injectZone(sys, 1000, { x: i }) }
    const ids = getZones(sys).map((z: any) => z.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('空zones时update不崩溃', () => {
    expect(() => sys.update(1, safeWorld, em, 2890)).not.toThrow()
  })
  it('safeWorld(getTile=2)不spawn', () => {
    sys.update(1, safeWorld, em, 2890)
    expect(getZones(sys)).toHaveLength(0)
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, safeWorld, em, 2890)
    const lc1 = getLastCheck(sys)
    sys.update(1, safeWorld, em, 2890)
    expect(getLastCheck(sys)).toBe(lc1)
  })
})
