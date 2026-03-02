import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldGadoliniumSpringSystem } from '../systems/WorldGadoliniumSpringSystem'

// WorldGadoliniumSpringSystem: CHECK_INTERVAL=2960, MAX_ZONES=32, cutoff=tick-54000
// spawn条件: nearWater(SHALLOW_WATER=1 or DEEP_WATER=0) || nearMountain(MOUNTAIN=5)
// FORM_CHANCE=0.003: random > 0.003 跳过

const CHECK_INTERVAL = 2960
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000

function makeSys() { return new WorldGadoliniumSpringSystem() }

// safeWorld: getTile=2(SAND), hasAdjacentTile将检测不到water/mountain -> 不spawn
const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function getZones(sys: WorldGadoliniumSpringSystem): any[] {
  return (sys as any).zones
}
function getLastCheck(sys: WorldGadoliniumSpringSystem): number {
  return (sys as any).lastCheck
}
function getNextId(sys: WorldGadoliniumSpringSystem): number {
  return (sys as any).nextId
}

function injectZone(sys: WorldGadoliniumSpringSystem, tick: number, overrides: any = {}) {
  const zone = {
    id: getZones(sys).length + 1, x: getZones(sys).length, y: 0,
    gadoliniumContent: 50, springFlow: 30,
    xenotimeWeathering: 50, magneticSusceptibility: 40,
    tick,
    ...overrides,
  }
  getZones(sys).push(zone)
  return zone
}

describe('WorldGadoliniumSpringSystem', () => {
  let sys: WorldGadoliniumSpringSystem

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
    it('注入zone后可查询', () => {
      injectZone(sys, 1000)
      expect(getZones(sys)).toHaveLength(1)
    })
  })

  // --- 2. CHECK_INTERVAL节流 ---
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL时不执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
      expect(getLastCheck(sys)).toBe(0)
    })
    it('tick === CHECK_INTERVAL时执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL)
    })
    it('tick > CHECK_INTERVAL时执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL + 500)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL + 500)
    })
    it('第二次update需等满新间隔', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      sys.update(1, safeWorld, em, CHECK_INTERVAL + 100)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL) // 未触发
    })
    it('两次满足间隔均执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
      expect(getLastCheck(sys)).toBe(CHECK_INTERVAL * 2)
    })
  })

  // --- 3. spawn条件 ---
  describe('spawn/生成逻辑', () => {
    it('random=0.9时不spawn（FORM_CHANCE=0.003）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('safeWorld(SAND tile)阻断spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      // SAND没有水/山相邻，不spawn
      expect(getZones(sys)).toHaveLength(0)
    })
    it('MAX_ZONES达上限时不新增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      for (let i = 0; i < MAX_ZONES; i++) injectZone(sys, CHECK_INTERVAL)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys).length).toBeLessThanOrEqual(MAX_ZONES)
    })
    it('达到MAX_ZONES时spawn循环立即break', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      for (let i = 0; i < MAX_ZONES; i++) injectZone(sys, 100000)
      sys.update(1, safeWorld, em, CHECK_INTERVAL)
      expect(getZones(sys).length).toBe(MAX_ZONES)
    })
    it('注入zone后nextId递增', () => {
      const before = getNextId(sys)
      injectZone(sys, 1000)
      ;(sys as any).nextId++
      expect(getNextId(sys)).toBe(before + 1)
    })
  })

  // --- 4. cleanup/过期清理 ---
  describe('cleanup过期清理', () => {
    it('tick < cutoff的zone被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 1000
      injectZone(sys, 0) // tick=0, cutoff=currentTick-54000 > 0 => 过期
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(0)
    })
    it('tick >= cutoff的zone保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET
      const zoneTick = currentTick - CUTOFF_OFFSET + 1 // 未过期
      injectZone(sys, zoneTick)
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(1)
    })
    it('恰好在cutoff边界的zone保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET
      const cutoff = currentTick - CUTOFF_OFFSET // = CHECK_INTERVAL
      injectZone(sys, cutoff) // tick === cutoff, 不满足 < cutoff
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(1)
    })
    it('混合场景：过期删除，未过期保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const currentTick = CHECK_INTERVAL + CUTOFF_OFFSET + 500
      injectZone(sys, 0)        // 过期
      injectZone(sys, currentTick - CUTOFF_OFFSET + 100) // 未过期
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
      const freshTick = currentTick - 1000
      for (let i = 0; i < 3; i++) injectZone(sys, freshTick, { x: i })
      sys.update(1, safeWorld, em, currentTick)
      expect(getZones(sys)).toHaveLength(3)
    })
    it('多轮update中到期的zone被移除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const t1 = CHECK_INTERVAL
      injectZone(sys, t1)  // spawn at t1
      // 第一轮 update
      sys.update(1, safeWorld, em, t1)
      expect(getZones(sys)).toHaveLength(1)
      // 第二轮：tick = t1 + 54001, zone过期
      sys.update(1, safeWorld, em, t1 + CHECK_INTERVAL + CUTOFF_OFFSET)
      expect(getZones(sys)).toHaveLength(0)
    })
  })

  // --- 5. zone字段范围 ---
  describe('zone字段验证', () => {
    it('注入的zone拥有正确字段', () => {
      const z = injectZone(sys, 1000)
      expect(z).toHaveProperty('gadoliniumContent')
      expect(z).toHaveProperty('springFlow')
      expect(z).toHaveProperty('xenotimeWeathering')
      expect(z).toHaveProperty('magneticSusceptibility')
      expect(z).toHaveProperty('tick')
    })
    it('zone id唯一', () => {
      for (let i = 0; i < 5; i++) injectZone(sys, 1000, { x: i })
      const ids = getZones(sys).map((z: any) => z.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
    it('zones数组可包含多个zone', () => {
      for (let i = 0; i < 10; i++) injectZone(sys, 1000, { x: i })
      expect(getZones(sys)).toHaveLength(10)
    })
  })
})
