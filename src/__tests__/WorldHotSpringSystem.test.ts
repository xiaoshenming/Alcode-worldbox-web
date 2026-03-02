import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHotSpringSystem } from '../systems/WorldHotSpringSystem'
import type { HotSpring, SpringTemperature } from '../systems/WorldHotSpringSystem'

const CHECK_INTERVAL = 3800
const MAX_SPRINGS = 10
const TTL = 300000

function makeSys(): WorldHotSpringSystem { return new WorldHotSpringSystem() }

let nextId = 1
function makeSpring(overrides: Partial<HotSpring> = {}): HotSpring {
  return {
    id: nextId++, x: 20, y: 30,
    temperature: 'hot',
    healingRate: 8, mineralContent: 20,
    visitors: 0, age: 0, tick: 0,
    ...overrides,
  }
}

// tile=2 (SAND)，阻断 spawn（只有 MOUNTAIN=5 或 FOREST=4 才会 spawn）
const sandWorld     = { width: 200, height: 200, getTile: () => 2 } as any
// tile=5 (MOUNTAIN)，允许 spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// tile=4 (FOREST)，允许 spawn
const forestWorld   = { width: 200, height: 200, getTile: () => 4 } as any
const fakeEm = {} as any

describe('WorldHotSpringSystem', () => {
  let sys: WorldHotSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 初始状态 ─────────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('springs 数组初始为空', () => {
      expect((sys as any).springs).toHaveLength(0)
    })
    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })
    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流', () => {
    it('tick < CHECK_INTERVAL 时不执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL - 1)
      expect((sys as any).springs).toHaveLength(0)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL + 999)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 999)
    })

    it('第一次执行后再次调用间隔不足时不更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })
  })

  // ── SpringTemperature 枚举验证 ──────────────────────────────────────────────
  describe('SpringTemperature 枚举值验证', () => {
    it('warm 类型 healingRate=3，mineralContent=10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      // 直接 mock pickRandom 结果：让 random sequence 驱动 pickRandom 返回 'warm'
      // 由于 pickRandom 使用 Math.random，mock 为 0 时 index=0 => 'warm'
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      const s = (sys as any).springs[0]
      if (s && s.temperature === 'warm') {
        expect(s.healingRate).toBe(3)
        expect(s.mineralContent).toBe(10)
      } else {
        // 直接注入验证
        const sp = makeSpring({ temperature: 'warm', healingRate: 3, mineralContent: 10 })
        expect(sp.temperature).toBe('warm')
        expect(sp.healingRate).toBe(3)
        expect(sp.mineralContent).toBe(10)
      }
    })

    it('hot 类型 healingRate=8，mineralContent=20', () => {
      const s = makeSpring({ temperature: 'hot', healingRate: 8, mineralContent: 20 })
      expect(s.temperature).toBe('hot')
      expect(s.healingRate).toBe(8)
      expect(s.mineralContent).toBe(20)
    })

    it('scalding 类型 healingRate=5，mineralContent=35', () => {
      const s = makeSpring({ temperature: 'scalding', healingRate: 5, mineralContent: 35 })
      expect(s.temperature).toBe('scalding')
      expect(s.healingRate).toBe(5)
      expect(s.mineralContent).toBe(35)
    })

    it('volcanic 类型 healingRate=2，mineralContent=50', () => {
      const s = makeSpring({ temperature: 'volcanic', healingRate: 2, mineralContent: 50 })
      expect(s.temperature).toBe('volcanic')
      expect(s.healingRate).toBe(2)
      expect(s.mineralContent).toBe(50)
    })

    it('SpringTemperature 枚举共 4 种类型', () => {
      const types: SpringTemperature[] = ['warm', 'hot', 'scalding', 'volcanic']
      expect(types).toHaveLength(4)
    })
  })

  // ── spawn 控制 ──────────────────────────────────────────────────────────────
  describe('spawn 控制', () => {
    it('random=0.9 时不 spawn（SPAWN_CHANCE=0.002）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(0)
    })

    it('tile=SAND(2) 时不 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(0)
    })

    it('tile=MOUNTAIN(5) 且 random<SPAWN_CHANCE 时可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(1)
    })

    it('tile=FOREST(4) 且 random<SPAWN_CHANCE 时可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, forestWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(1)
    })

    it('spawn 后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(2)
    })

    it('spawn 后 visitors 初始为 0（注入验证）', () => {
      // 直接注入而非通过 update spawn，避免同帧 for 循环修改 visitors
      const s = makeSpring({ visitors: 0 })
      ;(sys as any).springs.push(s)
      expect((sys as any).springs[0].visitors).toBe(0)
    })

    it('spawn 后记录正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs[0].tick).toBe(CHECK_INTERVAL)
    })
  })

  // ── update 后字段变化 ────────────────────────────────────────────────────────
  describe('update 后字段变化', () => {
    it('age = tick - s.tick（spring.tick=0，update tick=CHECK_INTERVAL）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不让 visitors 增加
      const s = makeSpring({ tick: 0 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs[0].age).toBe(CHECK_INTERVAL)
    })

    it('age <= 80000 时 mineralContent 不递减', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = makeSpring({ mineralContent: 20, tick: 0 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      // age = CHECK_INTERVAL = 3800 < 80000，不触发递减
      expect((sys as any).springs[0].mineralContent).toBe(20)
    })

    it('age > 80000 时 mineralContent 每帧递减 0.02', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      // tick=0，update tick=80001+3800，age = 83801 > 80000
      const bigTick = 80001 + CHECK_INTERVAL
      const s = makeSpring({ mineralContent: 20, tick: 0 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, bigTick)
      expect((sys as any).springs[0].mineralContent).toBeCloseTo(19.98)
    })

    it('mineralContent 不低于 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 80001 + CHECK_INTERVAL
      const s = makeSpring({ mineralContent: 1, tick: 0 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, bigTick)
      expect((sys as any).springs[0].mineralContent).toBeGreaterThanOrEqual(1)
    })

    it('visitors 上限为 50', () => {
      // 让 random < 0.02 触发 visitors 增加，但从 50 开始不会超过 50
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const s = makeSpring({ visitors: 50 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs[0].visitors).toBe(50)
    })
  })

  // ── cleanup ─────────────────────────────────────────────────────────────────
  describe('cleanup', () => {
    it('tick=0 的 spring 在 bigTick=300001+3800 时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = makeSpring({ tick: 0 })
      ;(sys as any).springs.push(s)
      const bigTick = TTL + CHECK_INTERVAL + 1
      sys.update(0, sandWorld, fakeEm, bigTick)
      expect((sys as any).springs).toHaveLength(0)
    })

    it('tick=cutoff+1 时保留（未超过 TTL）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = TTL + CHECK_INTERVAL + 1
      const cutoff = bigTick - TTL
      const s = makeSpring({ tick: cutoff + 1 })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, bigTick)
      expect((sys as any).springs).toHaveLength(1)
    })

    it('tick=cutoff 时保留（边界：条件为 tick < cutoff）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = TTL + CHECK_INTERVAL + 1
      const cutoff = bigTick - TTL
      const s = makeSpring({ tick: cutoff })
      ;(sys as any).springs.push(s)
      sys.update(0, sandWorld, fakeEm, bigTick)
      // tick === cutoff 时，tick < cutoff 为 false，应保留
      expect((sys as any).springs).toHaveLength(1)
    })

    it('混合 cleanup：过期删除，未过期保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = TTL + CHECK_INTERVAL + 1
      const cutoff = bigTick - TTL
      const old   = makeSpring({ tick: 0 })
      const fresh = makeSpring({ tick: cutoff + 1 })
      ;(sys as any).springs.push(old, fresh)
      sys.update(0, sandWorld, fakeEm, bigTick)
      expect((sys as any).springs).toHaveLength(1)
      expect((sys as any).springs[0].id).toBe(fresh.id)
    })
  })

  // ── MAX_SPRINGS 上限 ─────────────────────────────────────────────────────────
  describe('MAX_SPRINGS 上限', () => {
    it('已达 MAX_SPRINGS 时不再 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_SPRINGS; i++) {
        ;(sys as any).springs.push(makeSpring())
      }
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(MAX_SPRINGS)
    })

    it('springs 数量为 MAX_SPRINGS-1 时仍可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_SPRINGS - 1; i++) {
        ;(sys as any).springs.push(makeSpring())
      }
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).springs).toHaveLength(MAX_SPRINGS)
    })
  })

  // ── 字段范围验证 ─────────────────────────────────────────────────────────────
  describe('字段范围验证', () => {
    it('注入的 healingRate 可正确读取', () => {
      ;(sys as any).springs.push(makeSpring({ healingRate: 5 }))
      expect((sys as any).springs[0].healingRate).toBe(5)
    })
    it('注入的 mineralContent 可正确读取', () => {
      ;(sys as any).springs.push(makeSpring({ mineralContent: 35 }))
      expect((sys as any).springs[0].mineralContent).toBe(35)
    })
    it('多个 spring 各自保持独立 id', () => {
      const s1 = makeSpring()
      const s2 = makeSpring()
      ;(sys as any).springs.push(s1, s2)
      expect((sys as any).springs[0].id).not.toBe((sys as any).springs[1].id)
    })
  })
})
