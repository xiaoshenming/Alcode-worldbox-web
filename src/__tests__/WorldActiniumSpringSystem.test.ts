import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldActiniumSpringSystem } from '../systems/WorldActiniumSpringSystem'
import type { ActiniumSpringZone } from '../systems/WorldActiniumSpringSystem'

// ── 常量镜像（与源码保持一致）─────────────────────────────────────────────
const CHECK_INTERVAL = 3040
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000
const FORM_CHANCE = 0.003

// ── 工具函数 ────────────────────────────────────────────────────────────────
function makeSys(): WorldActiniumSpringSystem { return new WorldActiniumSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<ActiniumSpringZone> = {}): ActiniumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    actiniumContent: 50,
    springFlow: 30,
    uraniumOreWeathering: 40,
    alphaRadiation: 20,
    tick: 0,
    ...overrides,
  }
}

// getTile=5(MOUNTAIN) → nearMountain=true
const makeWorldWithMountain = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
// getTile=1(SHALLOW_WATER) → nearWater=true
const makeWorldWithShallowWater = () => ({ width: 200, height: 200, getTile: () => 1 }) as any
// getTile=0(DEEP_WATER) → nearWater=true
const makeWorldWithDeepWater = () => ({ width: 200, height: 200, getTile: () => 0 }) as any
// getTile=3(GRASS) → 不spawn
const makeWorldNoCondition = () => ({ width: 200, height: 200, getTile: () => 3 }) as any

const em = {} as any

describe('WorldActiniumSpringSystem', () => {
  let sys: WorldActiniumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 初始状态
  // ═══════════════════════════════════════════════════════════════════════════
  describe('初始状态', () => {
    it('zones初始为空数组', () => {
      expect((sys as any).zones).toHaveLength(0)
    })

    it('zones初始是Array类型', () => {
      expect(Array.isArray((sys as any).zones)).toBe(true)
    })

    it('nextId初始为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('新建实例zones独立不共享', () => {
      const sys2 = makeSys()
      ;(sys as any).zones.push(makeZone())
      expect((sys2 as any).zones).toHaveLength(0)
    })

    it('多次new产生独立nextId', () => {
      const sys2 = makeSys()
      expect((sys2 as any).nextId).toBe(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 节流
  // ══════════════════════════════════════════════════════════════��════════════
  describe('节流', () => {
    it('tick=0时不触发（初始lastCheck=0，0-0=0 < CHECK_INTERVAL）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL-1时不更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL时更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick=CHECK_INTERVAL+1时也更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
    })

    it('第二次调用在间隔内时lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次调用在两倍间隔时再次更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick未达CHECK_INTERVAL时zones不被cleanup', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL - 1)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('CHECK_INTERVAL值为3040', () => {
      // 验证节流逻辑中CHECK_INTERVAL=3040
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 3039)
      expect((sys as any).lastCheck).toBe(0)
      sys.update(1, makeWorldNoCondition(), em, 3040)
      expect((sys as any).lastCheck).toBe(3040)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. spawn条件
  // ═══════════════════════════════════════════════════════════════════════════
  describe('spawn条件', () => {
    it('getTile=GRASS时nearWater=false nearMountain=false，不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('getTile=MOUNTAIN(5)时nearMountain=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('getTile=SHALLOW_WATER(1)时nearWater=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithShallowWater(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('getTile=DEEP_WATER(0)时nearWater=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithDeepWater(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('random>FORM_CHANCE时即使地形满足也不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('random=0.004>FORM_CHANCE(0.003)时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.004)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('一次update最多spawn 3个（attempt循环3次）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    })

    it('已达MAX_ZONES时break不spawn', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })

    it('zones=MAX_ZONES-1时仍可spawn', () => {
      for (let i = 0; i < MAX_ZONES - 1; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. spawn后字段值
  // ═══════════════════════════════════════════════════════════════════════════
  describe('spawn后字段值', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
    })

    it('spawn后zones至少1个', () => {
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('zone.id为正整数', () => {
      const z = (sys as any).zones[0]
      expect(z.id).toBeGreaterThanOrEqual(1)
    })

    it('zone.x在世界宽度[0,200)内', () => {
      const z = (sys as any).zones[0]
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    })

    it('zone.y在世界高度[0,200)内', () => {
      const z = (sys as any).zones[0]
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    })

    it('zone.actiniumContent在[40,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.actiniumContent).toBeGreaterThanOrEqual(40)
      expect(z.actiniumContent).toBeLessThanOrEqual(100)
    })

    it('zone.springFlow在[10,60]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    })

    it('zone.uraniumOreWeathering在[20,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.uraniumOreWeathering).toBeGreaterThanOrEqual(20)
      expect(z.uraniumOreWeathering).toBeLessThanOrEqual(100)
    })

    it('zone.alphaRadiation在[15,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.alphaRadiation).toBeGreaterThanOrEqual(15)
      expect(z.alphaRadiation).toBeLessThanOrEqual(100)
    })

    it('zone.tick等于当前update的tick参数', () => {
      const z = (sys as any).zones[0]
      expect(z.tick).toBe(CHECK_INTERVAL)
    })

    it('spawn后nextId递增', () => {
      expect((sys as any).nextId).toBeGreaterThan(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. update字段变更
  // ═══════════════════════════════════════════════════════════════════════════
  describe('update字段变更', () => {
    it('update触发后lastCheck等于tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('无spawn时nextId保持为1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(1)
    })

    it('spawn后nextId比spawn前更大', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const idBefore = (sys as any).nextId
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    })

    it('cleanup执行后zones减少', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('连续满足间隔的update逐次更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL * 2)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL * 3)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. cleanup逻辑
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cleanup逻辑', () => {
    it('zone.tick < cutoff时删除（tick=0，currentTick=100000，cutoff=46000）', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('zone.tick === cutoff时保留（不满足 < 条件）', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET  // 46000
      ;(sys as any).zones.push(makeZone({ tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, currentTick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff+1时保留', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET
      ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, currentTick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff-1时删除', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, currentTick)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('混合过期与新鲜：只删过期', () => {
      const currentTick = 100000
      ;(sys as any).zones.push(makeZone({ tick: 0 }))     // 删
      ;(sys as any).zones.push(makeZone({ tick: 50000 })) // 保留
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, currentTick)
      expect((sys as any).zones).toHaveLength(1)
      expect((sys as any).zones[0].tick).toBe(50000)
    })

    it('多个过期zone全删', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('全新鲜zones均保留', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 90000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(5)
    })

    it('倒序删除不影响其余zone顺序', () => {
      const currentTick = 100000
      ;(sys as any).zones.push(makeZone({ id: 100, tick: 90000 }))
      ;(sys as any).zones.push(makeZone({ id: 200, tick: 0 }))
      ;(sys as any).zones.push(makeZone({ id: 300, tick: 80000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, currentTick)
      expect((sys as any).zones).toHaveLength(2)
      expect((sys as any).zones[0].id).toBe(100)
      expect((sys as any).zones[1].id).toBe(300)
    })

    it('cutoff=tick-54000：tick=54001时cutoff=1，zone.tick=0被删', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 54001)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('cutoff负值时（tick很小）zone不会被删', () => {
      // tick=CHECK_INTERVAL，cutoff=CHECK_INTERVAL-54000<0，zone.tick=0不<负数
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      // 0 < (CHECK_INTERVAL - 54000) = 3040-54000 = -50960 为false，保留
      expect((sys as any).zones).toHaveLength(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MAX_ZONES上限
  // ═══════════════════════════════════════════════════════════════════════════
  describe('MAX_ZONES上限', () => {
    it('zones=MAX_ZONES时不spawn新zone', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })

    it('zones=MAX_ZONES时，不因spawn超过MAX_ZONES', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    })

    it('MAX_ZONES=32（32个zone时触发break）', () => {
      for (let i = 0; i < 32; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(32)
    })

    it('zones=31时可spawn至多4个（31+3=34>32时在第2次attempt后break）', () => {
      for (let i = 0; i < 31; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      // 第1次attempt：31<32 → spawn→32；第2次32>=32 break
      expect((sys as any).zones).toHaveLength(32)
    })

    it('cleanup后zones降至0（spawn先于cleanup，满时break）', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, 100000)
      // spawn时zones仍为32→break；cleanup删除全部→0
      expect((sys as any).zones).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. 边界验证
  // ═══════════════════════════════════════════════════════════════════════════
  describe('边界验证', () => {
    it('zone含id字段（number）', () => {
      const z = makeZone({ id: 99 })
      expect(typeof z.id).toBe('number')
      expect(z.id).toBe(99)
    })

    it('zone含actiniumContent字段', () => {
      const z = makeZone({ actiniumContent: 70 })
      expect(z.actiniumContent).toBe(70)
    })

    it('zone含springFlow字段', () => {
      const z = makeZone({ springFlow: 25 })
      expect(z.springFlow).toBe(25)
    })

    it('zone含uraniumOreWeathering字段', () => {
      const z = makeZone({ uraniumOreWeathering: 55 })
      expect(z.uraniumOreWeathering).toBe(55)
    })

    it('zone含alphaRadiation字段', () => {
      const z = makeZone({ alphaRadiation: 90 })
      expect(z.alphaRadiation).toBe(90)
    })

    it('zone含tick字段', () => {
      const z = makeZone({ tick: 1234 })
      expect(z.tick).toBe(1234)
    })

    it('zones数组同一引用', () => {
      const ref1 = (sys as any).zones
      const ref2 = (sys as any).zones
      expect(ref1).toBe(ref2)
    })

    it('手动注入5个zones后长度=5', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone())
      }
      expect((sys as any).zones).toHaveLength(5)
    })

    it('cleanup不改变nextId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const idBefore = (sys as any).nextId
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).nextId).toBe(idBefore)
    })

    it('id单调递增（makeZone连续调用）', () => {
      nextId = 1
      const z1 = makeZone()
      const z2 = makeZone()
      const z3 = makeZone()
      expect(z1.id).toBeLessThan(z2.id)
      expect(z2.id).toBeLessThan(z3.id)
    })

    it('dt参数不影响节流判断', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(9999, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('小地图世界坐标范围正确', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const smallWorld = { width: 5, height: 5, getTile: () => 5 } as any
      sys.update(1, smallWorld, em, CHECK_INTERVAL)
      if ((sys as any).zones.length > 0) {
        const z = (sys as any).zones[0]
        expect(z.x).toBeGreaterThanOrEqual(0)
        expect(z.x).toBeLessThan(5)
        expect(z.y).toBeGreaterThanOrEqual(0)
        expect(z.y).toBeLessThan(5)
      }
    })
  })
})
