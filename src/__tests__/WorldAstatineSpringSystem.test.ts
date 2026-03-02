import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldAstatineSpringSystem } from '../systems/WorldAstatineSpringSystem'
import type { AstatineSpringZone } from '../systems/WorldAstatineSpringSystem'

// ── 常量镜像（与源码保持一致）─────────────────────────────────────────────
const CHECK_INTERVAL = 3120
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000
const FORM_CHANCE = 0.003

// ── 工具函数 ────────────────────────────────────────────────────────────────
function makeSys(): WorldAstatineSpringSystem { return new WorldAstatineSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<AstatineSpringZone> = {}): AstatineSpringZone {
  return {
    id: nextId++,
    x: 50, y: 50,
    astatineContent: 40,
    springFlow: 10,
    bismuthIrradiation: 20,
    halogenReactivity: 15,
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

describe('WorldAstatineSpringSystem', () => {
  let sys: WorldAstatineSpringSystem
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

    it('新建实例zones独立，不与其他实例共享', () => {
      const sys2 = makeSys()
      ;(sys as any).zones.push(makeZone())
      expect((sys2 as any).zones).toHaveLength(0)
    })

    it('多个新实例nextId均为1', () => {
      const sys2 = makeSys()
      const sys3 = makeSys()
      expect((sys2 as any).nextId).toBe(1)
      expect((sys3 as any).nextId).toBe(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 节流
  // ═══════════════════════════════════════════════════════════════════════════
  describe('节流', () => {
    it('tick=0时不触发（0-0=0 < CHECK_INTERVAL）', () => {
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

    it('tick=CHECK_INTERVAL+1时更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
    })

    it('两次调用：第二次tick=CHECK_INTERVAL+100时跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('两次调用：第二次tick=CHECK_INTERVAL*2时再次更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick未到CHECK_INTERVAL时zones不被清理', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL - 1)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('CHECK_INTERVAL值为3120', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 3119)
      expect((sys as any).lastCheck).toBe(0)
      sys.update(1, makeWorldNoCondition(), em, 3120)
      expect((sys as any).lastCheck).toBe(3120)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. spawn条件
  // ═══════════════════════════════════════════════════════════════════════════
  describe('spawn条件', () => {
    it('getTile=GRASS(3)时nearWater=false nearMountain=false，不spawn', () => {
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

    it('random>FORM_CHANCE(0.9>0.003)时即使地形满足也不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('random=0.004>FORM_CHANCE时不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.004)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('一次update最多spawn 3个（attempt=3次）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    })

    it('已达MAX_ZONES时break，不spawn', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })

    it('zones=MAX_ZONES-1时仍可spawn一个', () => {
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

    it('zone.x在[0,200)范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    })

    it('zone.y在[0,200)范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    })

    it('zone.astatineContent在[40,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.astatineContent).toBeGreaterThanOrEqual(40)
      expect(z.astatineContent).toBeLessThanOrEqual(100)
    })

    it('zone.springFlow在[10,60]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    })

    it('zone.bismuthIrradiation在[20,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.bismuthIrradiation).toBeGreaterThanOrEqual(20)
      expect(z.bismuthIrradiation).toBeLessThanOrEqual(100)
    })

    it('zone.halogenReactivity在[15,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.halogenReactivity).toBeGreaterThanOrEqual(15)
      expect(z.halogenReactivity).toBeLessThanOrEqual(100)
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
    it('触发update后lastCheck等于tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('无spawn时nextId保持为1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(1)
    })

    it('spawn后nextId比spawn前大', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const before = (sys as any).nextId
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThan(before)
    })

    it('cleanup后zones长度减少', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('连续三次满足间隔的update更新三次lastCheck', () => {
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

    it('zone.tick === cutoff时保留（源码用 < 不删）', () => {
      const tick = 60000
      const cutoff = tick - CUTOFF_OFFSET  // 6000
      ;(sys as any).zones.push(makeZone({ tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, tick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff+1时保留', () => {
      const tick = 60000
      const cutoff = tick - CUTOFF_OFFSET
      ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, tick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff-1时删除', () => {
      const tick = 60000
      const cutoff = tick - CUTOFF_OFFSET
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, tick)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('混合：旧的删除，新的保留', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      ;(sys as any).zones.push(makeZone({ tick: 50000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 60000)
      expect((sys as any).zones).toHaveLength(1)
      expect((sys as any).zones[0].tick).toBe(50000)
    })

    it('5个过期zone全删', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('5个新鲜zone全保留', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 90000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(5)
    })

    it('倒序删除保持剩余zone顺序正确', () => {
      ;(sys as any).zones.push(makeZone({ id: 10, tick: 90000 }))
      ;(sys as any).zones.push(makeZone({ id: 20, tick: 0 }))
      ;(sys as any).zones.push(makeZone({ id: 30, tick: 80000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).zones).toHaveLength(2)
      expect((sys as any).zones[0].id).toBe(10)
      expect((sys as any).zones[1].id).toBe(30)
    })

    it('cutoff为负时zone.tick=0不被删（0不小于负数）', () => {
      // currentTick=CHECK_INTERVAL=3120, cutoff=3120-54000=-50880
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, CHECK_INTERVAL)
      // 0 < -50880 为false → 保留
      expect((sys as any).zones).toHaveLength(1)
    })

    it('tick=54001时cutoff=1，zone.tick=0被删', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), em, 54001)
      expect((sys as any).zones).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MAX_ZONES上限
  // ═══════════════════════════════════════════════════════════════════════════
  describe('MAX_ZONES上限', () => {
    it('zones=MAX_ZONES时不spawn', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })

    it('zones不超过MAX_ZONES（即使随机极小）', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
    })

    it('MAX_ZONES=32', () => {
      for (let i = 0; i < 32; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(32)
    })

    it('zones=31时可spawn至MAX_ZONES', () => {
      for (let i = 0; i < 31; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), em, CHECK_INTERVAL)
      // 31<32→spawn→32；32>=32 break
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
      const z = makeZone({ id: 42 })
      expect(typeof z.id).toBe('number')
      expect(z.id).toBe(42)
    })

    it('zone含astatineContent字段', () => {
      const z = makeZone({ astatineContent: 75 })
      expect(z.astatineContent).toBe(75)
    })

    it('zone含springFlow字段', () => {
      const z = makeZone({ springFlow: 55 })
      expect(z.springFlow).toBe(55)
    })

    it('zone含bismuthIrradiation字段', () => {
      const z = makeZone({ bismuthIrradiation: 60 })
      expect(z.bismuthIrradiation).toBe(60)
    })

    it('zone含halogenReactivity字段', () => {
      const z = makeZone({ halogenReactivity: 80 })
      expect(z.halogenReactivity).toBe(80)
    })

    it('zone含tick字段', () => {
      const z = makeZone({ tick: 9999 })
      expect(z.tick).toBe(9999)
    })

    it('zones数组同一引用（私有内部状态）', () => {
      const ref1 = (sys as any).zones
      const ref2 = (sys as any).zones
      expect(ref1).toBe(ref2)
    })

    it('手动注入10个zone后长度=10', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).zones.push(makeZone())
      }
      expect((sys as any).zones).toHaveLength(10)
    })

    it('cleanup不改变nextId', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const before = (sys as any).nextId
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      sys.update(1, makeWorldNoCondition(), em, 100000)
      expect((sys as any).nextId).toBe(before)
    })

    it('id单调递增', () => {
      nextId = 1
      const z1 = makeZone()
      const z2 = makeZone()
      const z3 = makeZone()
      expect(z1.id).toBeLessThan(z2.id)
      expect(z2.id).toBeLessThan(z3.id)
    })

    it('dt参数不影响节流判断（只看tick）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(8888, makeWorldNoCondition(), em, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('小地图世界坐标不越界', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const smallWorld = { width: 8, height: 8, getTile: () => 5 } as any
      sys.update(1, smallWorld, em, CHECK_INTERVAL)
      if ((sys as any).zones.length > 0) {
        const z = (sys as any).zones[0]
        expect(z.x).toBeGreaterThanOrEqual(0)
        expect(z.x).toBeLessThan(8)
        expect(z.y).toBeGreaterThanOrEqual(0)
        expect(z.y).toBeLessThan(8)
      }
    })
  })
})
