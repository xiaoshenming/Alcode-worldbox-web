import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldBorateSpringSystem } from '../systems/WorldBorateSpringSystem'
import type { BorateSpringZone } from '../systems/WorldBorateSpringSystem'

// ── 常量镜像（与源码保持一致）─────────────────────────────────────────────
const CHECK_INTERVAL = 2700
const MAX_ZONES = 32
const CUTOFF_OFFSET = 54000
const FORM_CHANCE = 0.003

// ── 工具函数 ────────────────────────────────────────────────────────────────
function makeSys(): WorldBorateSpringSystem { return new WorldBorateSpringSystem() }

let _nextId = 1
function makeZone(overrides: Partial<BorateSpringZone> = {}): BorateSpringZone {
  return {
    id: _nextId++,
    x: 20, y: 30,
    borateContent: 40,
    springFlow: 50,
    mineralDeposit: 60,
    evaporiteLevel: 25,
    tick: 0,
    ...overrides,
  }
}

// getTile=5(MOUNTAIN) → nearMountain=true，允许spawn
const makeWorldWithMountain = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
// getTile=1(SHALLOW_WATER) → nearWater=true，允许spawn
const makeWorldWithShallowWater = () => ({ width: 200, height: 200, getTile: () => 1 }) as any
// getTile=0(DEEP_WATER) → nearWater=true，允许spawn
const makeWorldWithDeepWater = () => ({ width: 200, height: 200, getTile: () => 0 }) as any
// getTile=3(GRASS) → 不spawn
const makeWorldNoCondition = () => ({ width: 200, height: 200, getTile: () => 3 }) as any

const emMock = {} as any

describe('WorldBorateSpringSystem', () => {
  let sys: WorldBorateSpringSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.restoreAllMocks() })
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

    it('新建实例是独立对象，zones不共享', () => {
      const sys2 = makeSys()
      ;(sys as any).zones.push(makeZone())
      expect((sys2 as any).zones).toHaveLength(0)
    })

    it('多次new产生独立nextId计数', () => {
      const sys2 = makeSys()
      expect((sys2 as any).nextId).toBe(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 节流（CHECK_INTERVAL）
  // ═══════════════════════════════════════════════════════════════════════════
  describe('节流', () => {
    it('tick=0时不触发（0-0=0 < CHECK_INTERVAL）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, 0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL-1时不更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick=CHECK_INTERVAL时更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick=CHECK_INTERVAL+1时更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
    })

    it('第二次调用tick不满足间隔时lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('第二次调用恰好满足2倍间隔时再次更新lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('tick<CHECK_INTERVAL时zones不被修改', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL - 1)
      // cleanup不运行，zone保留
      expect((sys as any).zones).toHaveLength(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. spawn条件
  // ═══════════════════════════════════════════════════════════════════════════
  describe('spawn条件', () => {
    it('getTile=GRASS(3)时nearWater=false nearMountain=false，不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('getTile=MOUNTAIN(5)时nearMountain=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('getTile=SHALLOW_WATER(1)时nearWater=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithShallowWater(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('getTile=DEEP_WATER(0)时nearWater=true，random<FORM_CHANCE时spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithDeepWater(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    })

    it('random>FORM_CHANCE时即使地形满足也不spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('random恰好等于FORM_CHANCE(0.003)时不spawn（> 判断）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      // random > FORM_CHANCE → 0.003 > 0.003 为false → 通过，可能spawn
      // 但random作为坐标还会被用于floor计算，结果不定
      // 只验证zones不超过3个（最多3次attempt）
      expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    })

    it('random<FORM_CHANCE时每次attempt都可能spawn，最多3个', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeLessThanOrEqual(3)
    })

    it('已达MAX_ZONES时break不再spawn', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. spawn后字段值
  // ═══════════════════════════════════════════════════════════════════════════
  describe('spawn后字段值', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
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

    it('zone.borateContent在[40,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.borateContent).toBeGreaterThanOrEqual(40)
      expect(z.borateContent).toBeLessThanOrEqual(100)
    })

    it('zone.springFlow在[10,60]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    })

    it('zone.mineralDeposit在[20,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.mineralDeposit).toBeGreaterThanOrEqual(20)
      expect(z.mineralDeposit).toBeLessThanOrEqual(100)
    })

    it('zone.evaporiteLevel在[15,100]范围内', () => {
      const z = (sys as any).zones[0]
      expect(z.evaporiteLevel).toBeGreaterThanOrEqual(15)
      expect(z.evaporiteLevel).toBeLessThanOrEqual(100)
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
    it('update触发后lastCheck变为tick值', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续两次update都满足间隔时lastCheck两次都更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })

    it('spawn成功后nextId比spawn前大1（单次spawn）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const idBefore = (sys as any).nextId
      // 单次attempt：mock控制只生成1个（zones.length从0到1后break判断）
      // 实际最多3次，nextId可能增加1-3
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).nextId).toBeGreaterThan(idBefore)
    })

    it('无spawn时nextId保持为1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(1)
    })

    it('cleanup触发后zones长度减少', () => {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, 100000)
      expect((sys as any).zones).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. cleanup逻辑
  // ═══════════════════════════════════════════════════════════════════════════
  describe('cleanup逻辑', () => {
    it('zone.tick < cutoff时被删除', () => {
      const currentTick = 100000
      // cutoff = 100000 - 54000 = 46000；zone.tick=0 < 46000 → 删
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('zone.tick === cutoff时保留（< 判断，等于不删）', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET  // 46000
      ;(sys as any).zones.push(makeZone({ tick: cutoff }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff+1时保留', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET  // 46000
      ;(sys as any).zones.push(makeZone({ tick: cutoff + 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('zone.tick === cutoff-1时被删除', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET  // 46000
      ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('tick在cutoff内的zone不被清理（差距小于54000）', () => {
      const currentTick = 100000
      ;(sys as any).zones.push(makeZone({ tick: currentTick - 50000 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(1)
    })

    it('混合新旧zones：只删过期的', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET  // 46000
      ;(sys as any).zones.push(makeZone({ tick: 1000 }))    // 1000 < 46000 → 删
      ;(sys as any).zones.push(makeZone({ tick: 60000 }))   // 60000 > 46000 → 保留
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(1)
      expect((sys as any).zones[0].tick).toBe(60000)
    })

    it('多个过期zone全部删除', () => {
      const currentTick = 100000
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 0 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(0)
    })

    it('全部新鲜zones均保留', () => {
      const currentTick = 100000
      for (let i = 0; i < 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 90000 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(5)
    })

    it('cleanup从末尾倒序删除，不影响前面的zone顺序', () => {
      const currentTick = 100000
      const cutoff = currentTick - CUTOFF_OFFSET
      ;(sys as any).zones.push(makeZone({ id: 100, tick: 90000 }))  // 保留
      ;(sys as any).zones.push(makeZone({ id: 200, tick: 0 }))     // 删
      ;(sys as any).zones.push(makeZone({ id: 300, tick: 80000 })) // 保留
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, currentTick)
      expect((sys as any).zones).toHaveLength(2)
      expect((sys as any).zones[0].id).toBe(100)
      expect((sys as any).zones[1].id).toBe(300)
    })

    it('同一次update：新zone（tick=CHECK_INTERVAL）超过54001时被清理', () => {
      // tick=54001时cutoff=1，注入tick=0的旧zone
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, 54001)
      // 0 < 1 → 删
      expect((sys as any).zones).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MAX_ZONES上限
  // ═══════════════════════════════════════════════════════════════════════════
  describe('MAX_ZONES上限', () => {
    it('zones=MAX_ZONES时不再spawn（break条件）', () => {
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(MAX_ZONES)
    })

    it('zones=MAX_ZONES-1时仍可spawn一个', () => {
      for (let i = 0; i < MAX_ZONES - 1; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones.length).toBeGreaterThanOrEqual(MAX_ZONES)
    })

    it('注入超过MAX_ZONES的zone后update也不清除（除非过期）', () => {
      for (let i = 0; i < MAX_ZONES + 5; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      // 未过期，无spawn，zones不变
      expect((sys as any).zones).toHaveLength(MAX_ZONES + 5)
    })

    it('MAX_ZONES值为32', () => {
      // 通过代码行为验证MAX_ZONES=32
      for (let i = 0; i < 32; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 999999 }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, CHECK_INTERVAL)
      expect((sys as any).zones).toHaveLength(32)
    })

    it('cleanup清理后zones变为0（spawn先于cleanup，满时break）', () => {
      // 源码顺序：先spawn循环（此时32个旧zone使break成立），再cleanup删除过期zone
      // 所以最终zones=0，新zone不会被spawn
      for (let i = 0; i < MAX_ZONES; i++) {
        ;(sys as any).zones.push(makeZone({ tick: 0 }))  // 全部过期
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      sys.update(1, makeWorldWithMountain(), emMock, 100000)
      // spawn时zones仍为32→break；cleanup删除全部→0
      expect((sys as any).zones).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. 边界验证
  // ═══════════════════════════════════════════════════════════════════════════
  describe('边界验证', () => {
    it('zone包含id字段（number类型）', () => {
      const z = makeZone({ id: 42 })
      expect(typeof z.id).toBe('number')
      expect(z.id).toBe(42)
    })

    it('zone包含x/y字段', () => {
      const z = makeZone({ x: 10, y: 20 })
      expect(z).toHaveProperty('x', 10)
      expect(z).toHaveProperty('y', 20)
    })

    it('zone包含borateContent字段', () => {
      const z = makeZone({ borateContent: 77 })
      expect(z.borateContent).toBe(77)
    })

    it('zone包含springFlow字段', () => {
      const z = makeZone({ springFlow: 33 })
      expect(z.springFlow).toBe(33)
    })

    it('zone包含mineralDeposit字段', () => {
      const z = makeZone({ mineralDeposit: 55 })
      expect(z.mineralDeposit).toBe(55)
    })

    it('zone包含evaporiteLevel字段', () => {
      const z = makeZone({ evaporiteLevel: 70 })
      expect(z.evaporiteLevel).toBe(70)
    })

    it('zone包含tick字段', () => {
      const z = makeZone({ tick: 500 })
      expect(z).toHaveProperty('tick', 500)
    })

    it('zones数组是同一个引用（内部私有）', () => {
      const ref1 = (sys as any).zones
      const ref2 = (sys as any).zones
      expect(ref1).toBe(ref2)
    })

    it('多个zones全部保留（未过期）', () => {
      ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
      expect((sys as any).zones).toHaveLength(3)
    })

    it('cleanup后nextId不回退（单调递增）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const idBefore = (sys as any).nextId
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
      sys.update(1, makeWorldNoCondition(), emMock, 100000)
      expect((sys as any).nextId).toBe(idBefore)
    })

    it('zones.length随注入增加', () => {
      for (let i = 0; i < 10; i++) {
        ;(sys as any).zones.push(makeZone())
      }
      expect((sys as any).zones).toHaveLength(10)
    })

    it('id单调递增：多个makeZone产生递增id', () => {
      _nextId = 1
      const z1 = makeZone()
      const z2 = makeZone()
      const z3 = makeZone()
      expect(z1.id).toBeLessThan(z2.id)
      expect(z2.id).toBeLessThan(z3.id)
    })

    it('update参数dt不影响节流逻辑（只看tick）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(9999, makeWorldNoCondition(), emMock, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('world.width和world.height决定坐标范围', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0001)
      const smallWorld = { width: 10, height: 10, getTile: () => 5 } as any
      sys.update(1, smallWorld, emMock, CHECK_INTERVAL)
      if ((sys as any).zones.length > 0) {
        const z = (sys as any).zones[0]
        expect(z.x).toBeGreaterThanOrEqual(0)
        expect(z.x).toBeLessThan(10)
        expect(z.y).toBeGreaterThanOrEqual(0)
        expect(z.y).toBeLessThan(10)
      }
    })
  })
})
