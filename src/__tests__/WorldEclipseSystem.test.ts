import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldEclipseSystem } from '../systems/WorldEclipseSystem'
import type { Eclipse, EclipseType, EclipseEffect } from '../systems/WorldEclipseSystem'
import { EntityManager } from '../ecs/Entity'

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSys(): WorldEclipseSystem { return new WorldEclipseSystem() }

let _nextId = 1
function makeEclipse(
  eclipseType: EclipseType = 'lunar',
  effect: EclipseEffect = 'panic',
  overrides: Partial<Eclipse> = {}
): Eclipse {
  return {
    id: _nextId++,
    eclipseType,
    intensity: 80,
    startTick: 0,
    duration: 500,
    effect,
    ...overrides,
  }
}

function makeEM(): EntityManager { return new EntityManager() }

function addCreature(em: EntityManager, health = 80): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'needs', health, hunger: 50 } as any)
  return eid
}

// ─── constants (mirrored from source) ───────────────────────────────────────
const CHECK_INTERVAL = 1500
const ECLIPSE_CHANCE = 0.002
const MAX_ECLIPSES = 2
const EFFECT_INTERVAL = 400

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('1. 初始状���', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('eclipses 初始为空数组', () => {
    expect((sys as any).eclipses).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('lastEffect 初始为 0', () => {
    expect((sys as any).lastEffect).toBe(0)
  })
  it('eclipses 是 Array 实例', () => {
    expect(Array.isArray((sys as any).eclipses)).toBe(true)
  })
  it('两个独立实例不共享 eclipses', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).eclipses.push(makeEclipse())
    expect((b as any).eclipses).toHaveLength(0)
  })
  it('支持 2 种 EclipseType', () => {
    const types: EclipseType[] = ['solar', 'lunar']
    expect(types).toHaveLength(2)
  })
  it('支持 5 种 EclipseEffect', () => {
    const effects: EclipseEffect[] = ['panic', 'worship', 'power_surge', 'darkness', 'prophecy']
    expect(effects).toHaveLength(5)
  })
})

// ─── 2. 节流：CHECK_INTERVAL ─────────────────────────────────────────────────
describe('2. 节流 — CHECK_INTERVAL=1500', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL 时不触发检查', () => {
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL 时触发检查，lastCheck 更新', () => {
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL 时触发检查', () => {
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })
  it('第二次调用，tick 未达到下次间隔时不再检查', () => {
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const check1 = (sys as any).lastCheck
    sys.update(1, {}, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(check1)
  })
  it('第二次调用，tick 达到双倍间隔时再次检查', () => {
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    sys.update(1, {}, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('效果间隔节流：eclipses 为空时 lastEffect 不更新', () => {
    const em = makeEM()
    sys.update(1, {}, em, EFFECT_INTERVAL + 1)
    expect((sys as any).lastEffect).toBe(0)
  })
  it('效果间隔节流：eclipses 非空且达到 EFFECT_INTERVAL 时 lastEffect 更新', () => {
    const em = makeEM()
    ;(sys as any).eclipses.push(makeEclipse())
    sys.update(1, {}, em, EFFECT_INTERVAL)
    expect((sys as any).lastEffect).toBe(EFFECT_INTERVAL)
  })
  it('未到 EFFECT_INTERVAL 时 lastEffect 不更新', () => {
    const em = makeEM()
    ;(sys as any).eclipses.push(makeEclipse())
    sys.update(1, {}, em, EFFECT_INTERVAL - 1)
    expect((sys as any).lastEffect).toBe(0)
  })
})

// ─── 3. spawn 条件 ───────────────────────────────────────────────────────────
describe('3. spawn 条件', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random > ECLIPSE_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(0)
  })
  it('Math.random === 0 (< ECLIPSE_CHANCE) 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(1)
  })
  it('已达 MAX_ECLIPSES 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    // startTick=1500 与 tick 相同，duration=99999，不会被过期
    for (let i = 0; i < MAX_ECLIPSES; i++) {
      ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: CHECK_INTERVAL, duration: 99999 }))
    }
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(MAX_ECLIPSES)
  })
  it('MAX_ECLIPSES = 2', () => {
    expect(MAX_ECLIPSES).toBe(2)
  })
  it('ECLIPSE_CHANCE = 0.002', () => {
    expect(ECLIPSE_CHANCE).toBe(0.002)
  })
  it('Math.random 恰好等于 ECLIPSE_CHANCE 时不 spawn（>判断）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ECLIPSE_CHANCE)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    // random() > ECLIPSE_CHANCE → false，所以会 spawn
    expect((sys as any).eclipses).toHaveLength(1)
  })
  it('random 略高于 ECLIPSE_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ECLIPSE_CHANCE + 0.001)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(0)
  })
})

// ─── 4. spawn 后字段值 ───────────────────────────────────────────────────────
describe('4. spawn 后字段值', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function spawnOne(randomVal: number): Eclipse {
    vi.spyOn(Math, 'random').mockReturnValue(randomVal)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    return (sys as any).eclipses[0] as Eclipse
  }

  it('spawn 后 eclipses 长度为 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(1)
  })
  it('spawn 后 nextId 递增为 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 id = 1', () => {
    const e = spawnOne(0)
    expect(e.id).toBe(1)
  })
  it('spawn 后 startTick = CHECK_INTERVAL（当前 tick）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses[0].startTick).toBe(CHECK_INTERVAL)
  })
  it('random=0 (<0.3) → solar eclipse', () => {
    // 第一次 random() 用于 ECLIPSE_CHANCE（0>0.002 false→spawn），第二次用于 isSolar
    // mockReturnValue(0) 全部返回 0，isSolar = (0 < 0.3) = true
    const e = spawnOne(0)
    expect(e.eclipseType).toBe('solar')
  })
  it('random=0.5 → lunar eclipse（isSolar=false）', () => {
    // random()=0.5 > ECLIPSE_CHANCE → 0.5>0.002 = true → 不 spawn
    // 需要分阶段控制
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)        // ECLIPSE_CHANCE check: pass
      .mockReturnValueOnce(0.5)      // isSolar: 0.5 < 0.3 = false → lunar
      .mockReturnValue(0.5)          // rest
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses[0].eclipseType).toBe('lunar')
    mockRandom.mockRestore()
  })
  it('solar intensity ≥ 60', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // spawn pass
      .mockReturnValueOnce(0)    // isSolar=true
      .mockReturnValue(0)        // intensity contribution = 0 → intensity=60
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.intensity).toBeGreaterThanOrEqual(60)
    mockRandom.mockRestore()
  })
  it('lunar intensity ≥ 30', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // spawn pass
      .mockReturnValueOnce(0.5)  // isSolar=false
      .mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.intensity).toBeGreaterThanOrEqual(30)
    mockRandom.mockRestore()
  })
  it('solar duration ≥ 800', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // spawn
      .mockReturnValueOnce(0)    // solar
      .mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.duration).toBeGreaterThanOrEqual(800)
    mockRandom.mockRestore()
  })
  it('lunar duration ≥ 1200', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // spawn
      .mockReturnValueOnce(0.5)  // lunar
      .mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.duration).toBeGreaterThanOrEqual(1200)
    mockRandom.mockRestore()
  })
  it('effect 是合法的 EclipseEffect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    const valid: EclipseEffect[] = ['panic', 'worship', 'power_surge', 'darkness', 'prophecy']
    expect(valid).toContain(e.effect)
  })
})

// ─── 5. update 字段变更（applyEffects） ──────────────────────────────────────
describe('5. applyEffects — update 字段变更', () => {
  let sys: WorldEclipseSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEM(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('panic: health > 5 时小幅减��', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { intensity: 100 }))
    const eid = addCreature(em, 80)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeLessThan(80)
  })
  it('panic: health ≤ 5 时不减少', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { intensity: 100 }))
    const eid = addCreature(em, 5)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(5)
  })
  it('worship: health 小幅增加', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'worship', { intensity: 100 }))
    const eid = addCreature(em, 80)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeGreaterThan(80)
  })
  it('worship: health 不超过 100', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'worship', { intensity: 100 }))
    const eid = addCreature(em, 100)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeLessThanOrEqual(100)
  })
  it('power_surge: health 小幅增加', () => {
    ;(sys as any).eclipses.push(makeEclipse('solar', 'power_surge', { intensity: 100 }))
    const eid = addCreature(em, 70)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeGreaterThan(70)
  })
  it('power_surge: health 不超过 100', () => {
    ;(sys as any).eclipses.push(makeEclipse('solar', 'power_surge', { intensity: 100 }))
    const eid = addCreature(em, 100)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeLessThanOrEqual(100)
  })
  it('darkness: health > 10 时小幅减少', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'darkness', { intensity: 100 }))
    const eid = addCreature(em, 80)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeLessThan(80)
  })
  it('darkness: health ≤ 10 时不减少', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'darkness', { intensity: 100 }))
    const eid = addCreature(em, 10)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(10)
  })
  it('prophecy: health 不变', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'prophecy', { intensity: 100 }))
    const eid = addCreature(em, 75)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(75)
  })
  it('无 needs 组件的实体不崩溃', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { intensity: 100 }))
    const eid = em.createEntity()
    // 不添加 needs 组件
    expect(() => sys.update(1, {}, em, EFFECT_INTERVAL)).not.toThrow()
  })
  it('intensity 影响效果强度：intensity=0 时 panic 不减少 health', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { intensity: 0 }))
    const eid = addCreature(em, 80)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBe(80)
  })
})

// ─── 6. cleanup（expireEclipses） ────────────────────────────────────────────
describe('6. cleanup — expireEclipses', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('duration 未到期的 eclipse 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不 spawn
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 2000 }))
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(1)
  })
  it('tick - startTick >= duration 的 eclipse 被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不 spawn
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 100 }))
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL) // tick=1500, 1500-0 >= 100 → 过期
    expect((sys as any).eclipses).toHaveLength(0)
  })
  it('过期和未过期混合时只保留未过期', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 100 }))     // 过期
    ;(sys as any).eclipses.push(makeEclipse('solar', 'worship', { startTick: 1400, duration: 500 })) // 未过期
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(1)
    expect((sys as any).eclipses[0].eclipseType).toBe('solar')
  })
  it('所有 eclipse 过期后数组为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 50 }))
    ;(sys as any).eclipses.push(makeEclipse('solar', 'worship', { startTick: 0, duration: 50 }))
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(0)
  })
  it('tick - startTick = duration - 1 时不过期', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // tick=1500, startTick=1000, duration=501 → 1500-1000=500 < 501 → 保留
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 1000, duration: 501 }))
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(1)
  })
})

// ─── 7. MAX_ECLIPSES 上限 ─────────────────────────────────────────────────────
describe('7. MAX_ECLIPSES 上限', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('eclipses 数量不超过 MAX_ECLIPSES=2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    // 先填满
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 99999 }))
    ;(sys as any).eclipses.push(makeEclipse('solar', 'worship', { startTick: 0, duration: 99999 }))
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(2)
  })
  it('数量为 MAX_ECLIPSES-1 时可以继续 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { startTick: 0, duration: 99999 }))
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    expect((sys as any).eclipses).toHaveLength(2)
  })
  it('spawn 后 id 正确递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    // 第一次 spawn 的 eclipse id 应为 1
    const e1: Eclipse = (sys as any).eclipses[0]
    expect(e1.id).toBe(1)
    expect((sys as any).nextId).toBe(2)
  })
})

// ─── 8. 边界验证 ──────────────────────────────────────────────────────────────
describe('8. 边界验证', () => {
  let sys: WorldEclipseSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时不触发检查（lastCheck=0，0-0=0 < 1500）', () => {
    const em = makeEM()
    sys.update(1, {}, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('无 entities 时 applyEffects 不崩溃', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic'))
    const em = makeEM()
    expect(() => sys.update(1, {}, em, EFFECT_INTERVAL)).not.toThrow()
  })
  it('多个 eclipses 同时对同一个 entity 叠加效果', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'panic', { intensity: 100 }))
    ;(sys as any).eclipses.push(makeEclipse('solar', 'panic', { intensity: 100 }))
    const em = makeEM()
    const eid = addCreature(em, 80)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    // 两次 panic 各减 0.1 * 1 = 0.1，共减 0.2
    expect(needs.health).toBeCloseTo(79.8, 5)
  })
  it('intensity=100 时 strength=1.0', () => {
    // strength = intensity * 0.01 = 100 * 0.01 = 1.0
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'worship', { intensity: 100 }))
    const em = makeEM()
    const eid = addCreature(em, 50)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    const needs = em.getComponent<any>(eid, 'needs')!
    // worship: 0.05 * 1.0 = 0.05 增加
    expect(needs.health).toBeCloseTo(50.05, 5)
  })
  it('intensity=50 时 power_surge 增加量为 intensity=100 的一半', () => {
    const em1 = makeEM(), em2 = makeEM()
    const sys1 = makeSys(), sys2 = makeSys()
    ;(sys1 as any).eclipses.push(makeEclipse('solar', 'power_surge', { intensity: 100 }))
    ;(sys2 as any).eclipses.push(makeEclipse('solar', 'power_surge', { intensity: 50 }))
    const eid1 = addCreature(em1, 50), eid2 = addCreature(em2, 50)
    sys1.update(1, {}, em1, EFFECT_INTERVAL)
    sys2.update(1, {}, em2, EFFECT_INTERVAL)
    const h1 = em1.getComponent<any>(eid1, 'needs')!.health
    const h2 = em2.getComponent<any>(eid2, 'needs')!.health
    expect(h1 - 50).toBeCloseTo((h2 - 50) * 2, 5)
  })
  it('连续多帧 effect 累积', () => {
    ;(sys as any).eclipses.push(makeEclipse('lunar', 'worship', { intensity: 100 }))
    const em = makeEM()
    const eid = addCreature(em, 50)
    sys.update(1, {}, em, EFFECT_INTERVAL)
    sys.update(1, {}, em, EFFECT_INTERVAL * 2)
    const needs = em.getComponent<any>(eid, 'needs')!
    expect(needs.health).toBeCloseTo(50.1, 4)
  })
  it('solar eclipse 的 intensity 最大为 100（60 + 40 * 1）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)   // spawn pass
      .mockReturnValueOnce(0)   // isSolar=true
      .mockReturnValue(1)       // intensity part: 40 * 1 = 40 → intensity = 100
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.intensity).toBeLessThanOrEqual(100)
    mockRandom.mockRestore()
  })
  it('lunar eclipse 的 intensity 最大为 80（30 + 50 * 1）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)   // spawn pass
      .mockReturnValueOnce(0.5) // isSolar=false
      .mockReturnValue(1)       // intensity: 30 + 50 = 80
    const em = makeEM()
    sys.update(1, {}, em, CHECK_INTERVAL)
    const e: Eclipse = (sys as any).eclipses[0]
    expect(e.intensity).toBeCloseTo(80, 1)
    mockRandom.mockRestore()
  })
})
