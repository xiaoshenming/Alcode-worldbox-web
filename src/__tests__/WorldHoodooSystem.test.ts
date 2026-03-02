import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHoodooSystem } from '../systems/WorldHoodooSystem'
import type { Hoodoo } from '../systems/WorldHoodooSystem'

const CHECK_INTERVAL = 2800
const MAX_HOODOOS = 16

function makeSys(): WorldHoodooSystem { return new WorldHoodooSystem() }

let nextId = 1
function makeHoodoo(overrides: Partial<Hoodoo> = {}): Hoodoo {
  return {
    id: nextId++, x: 30, y: 40,
    height: 15, capstoneSize: 5, shaftWidth: 3,
    erosionRate: 0.02, colorBanding: 6, stability: 80, tick: 0,
    ...overrides,
  }
}

// GRASS world — tile=3 阻断 spawn（只有 SAND=2 或 MOUNTAIN=5 才会 spawn）
const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
// SAND world — tile=2 允许 spawn
const sandWorld  = { width: 200, height: 200, getTile: () => 2 } as any
// MOUNTAIN world — tile=5 允许 spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
const fakeEm = {} as any

describe('WorldHoodooSystem', () => {
  let sys: WorldHoodooSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────────────────
  describe('初始状态', () => {
    it('hoodoos 数组初始为空', () => {
      expect((sys as any).hoodoos).toHaveLength(0)
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
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL - 1)
      expect((sys as any).hoodoos).toHaveLength(0)
    })

    it('tick === CHECK_INTERVAL 时执行逻辑并更新 lastCheck', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时执行逻辑', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
    })

    it('第一次执行后，下次调用需再等 CHECK_INTERVAL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      const lastCheck1 = (sys as any).lastCheck

      // 立刻再调用，tick 差值 < CHECK_INTERVAL，不更新
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL + 100)
      expect((sys as any).lastCheck).toBe(lastCheck1)
    })

    it('第二次满足间隔时再次执行', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ── spawn 控制 ──────────────────────────────────────────────────────────────
  describe('spawn 控制', () => {
    it('random=0.9 时不 spawn（FORM_CHANCE=0.0015）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(0)
    })

    it('tile=GRASS(3) 时不 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)  // 确保 random < FORM_CHANCE
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(0)
    })

    it('tile=SAND(2) 且 random<FORM_CHANCE 时可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(1)
    })

    it('tile=MOUNTAIN(5) 且 random<FORM_CHANCE 时可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, mountainWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(1)
    })

    it('spawn 后 nextId 递增', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).nextId).toBe(2)
    })

    it('spawn 后记录正确的 tick', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].tick).toBe(CHECK_INTERVAL)
    })
  })

  // ── update 后字段变化 ────────────────────────────────────────────────────────
  describe('update 后字段变化', () => {
    it('height 在 update 后减小', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ height: 30, erosionRate: 5, stability: 50 })
      ;(sys as any).hoodoos.push(h)
      const before = h.height
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].height).toBeLessThan(before)
    })

    it('stability 在 update 后减小', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ height: 30, erosionRate: 5, stability: 50 })
      ;(sys as any).hoodoos.push(h)
      const before = h.stability
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].stability).toBeLessThan(before)
    })

    it('shaftWidth 在 update 后减小', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ shaftWidth: 2, erosionRate: 5 })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].shaftWidth).toBeLessThan(2)
    })
  })

  // ── 字段保底下限 ────────────────────────────────────────────────────────────
  describe('字段保底下限', () => {
    it('height 不低于 5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ height: 5, erosionRate: 15, stability: 50 })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].height).toBeGreaterThanOrEqual(5)
    })

    it('stability 不低于 10', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ height: 20, erosionRate: 15, stability: 10 })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].stability).toBeGreaterThanOrEqual(10)
    })

    it('shaftWidth 不低于 0.5', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const h = makeHoodoo({ shaftWidth: 0.5, erosionRate: 5 })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos[0].shaftWidth).toBeGreaterThanOrEqual(0.5)
    })
  })

  // ── cleanup ─────────────────────────────────────────────────────────────────
  describe('cleanup', () => {
    it('tick=0 的 hoodoo 在 bigTick=90001+2800 时被删除', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 阻断 spawn
      const h = makeHoodoo({ tick: 0 })
      ;(sys as any).hoodoos.push(h)
      const bigTick = 90000 + CHECK_INTERVAL + 1
      sys.update(0, grassWorld, fakeEm, bigTick)
      expect((sys as any).hoodoos).toHaveLength(0)
    })

    it('tick=cutoff+1 时保留（未超过 TTL）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 90000 + CHECK_INTERVAL + 1
      const cutoff = bigTick - 90000
      const h = makeHoodoo({ tick: cutoff + 1 })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, bigTick)
      expect((sys as any).hoodoos).toHaveLength(1)
    })

    it('tick=cutoff 时保留（边界条件）', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 90000 + CHECK_INTERVAL + 1
      const cutoff = bigTick - 90000
      const h = makeHoodoo({ tick: cutoff })
      ;(sys as any).hoodoos.push(h)
      sys.update(0, grassWorld, fakeEm, bigTick)
      // tick === cutoff，条件 tick < cutoff 为 false，应保留
      expect((sys as any).hoodoos).toHaveLength(1)
    })

    it('混合 cleanup：过期删除，未过期保留', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const bigTick = 90000 + CHECK_INTERVAL + 1
      const cutoff = bigTick - 90000
      const old = makeHoodoo({ tick: 0 })
      const fresh = makeHoodoo({ tick: cutoff + 1 })
      ;(sys as any).hoodoos.push(old, fresh)
      sys.update(0, grassWorld, fakeEm, bigTick)
      expect((sys as any).hoodoos).toHaveLength(1)
      expect((sys as any).hoodoos[0].id).toBe(fresh.id)
    })
  })

  // ── MAX_HOODOOS 上限 ─────────────────────────────────────────────────────────
  describe('MAX_HOODOOS 上限', () => {
    it('已达 MAX_HOODOOS 时不再 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_HOODOOS; i++) {
        ;(sys as any).hoodoos.push(makeHoodoo())
      }
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(MAX_HOODOOS)
    })

    it('hoodoos 数量为 MAX_HOODOOS-1 时仍可 spawn', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      for (let i = 0; i < MAX_HOODOOS - 1; i++) {
        ;(sys as any).hoodoos.push(makeHoodoo())
      }
      sys.update(0, sandWorld, fakeEm, CHECK_INTERVAL)
      expect((sys as any).hoodoos).toHaveLength(MAX_HOODOOS)
    })
  })

  // ── 注入后字段范围验证 ──────────────────────────────────────────────────────
  describe('注入后字段范围验证', () => {
    it('注入的 height 字段可正确读取', () => {
      ;(sys as any).hoodoos.push(makeHoodoo({ height: 42 }))
      expect((sys as any).hoodoos[0].height).toBe(42)
    })
    it('注入的 capstoneSize 字段可正确读取', () => {
      ;(sys as any).hoodoos.push(makeHoodoo({ capstoneSize: 7 }))
      expect((sys as any).hoodoos[0].capstoneSize).toBe(7)
    })
    it('注入的 colorBanding 字段可正确读取', () => {
      ;(sys as any).hoodoos.push(makeHoodoo({ colorBanding: 4 }))
      expect((sys as any).hoodoos[0].colorBanding).toBe(4)
    })
    it('多个 hoodoo 各自保持独立 id', () => {
      const h1 = makeHoodoo()
      const h2 = makeHoodoo()
      ;(sys as any).hoodoos.push(h1, h2)
      expect((sys as any).hoodoos[0].id).not.toBe((sys as any).hoodoos[1].id)
    })
  })
})
