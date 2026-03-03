import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAuroraSystem } from '../systems/WorldAuroraSystem'
import type { AuroraEvent, AuroraColorPattern } from '../systems/WorldAuroraSystem'

const CHECK_INTERVAL = 3600
const MAX_AURORAS = 8
const world = { width: 200, height: 200, getTile: () => 5 } as any
const em = { getEntitiesWithComponents: () => [] } as any

function makeSys(): WorldAuroraSystem { return new WorldAuroraSystem() }
let nextId = 1
function makeAurora(overrides: Partial<AuroraEvent> = {}): AuroraEvent {
  return {
    id: nextId++,
    x: 20, y: 10,
    colorPattern: 'green',
    intensity: 60,
    width: 30, height: 15,
    active: true,
    tick: 0,
    ...overrides,
  }
}

describe('WorldAuroraSystem', () => {
  let sys: WorldAuroraSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────────────
  it('初始无极光事件', () => {
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('auroras是数组', () => {
    expect(Array.isArray((sys as any).auroras)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).auroras.push(makeAurora())
    expect((s2 as any).auroras).toHaveLength(0)
  })

  // ── CHECK_INTERVAL���流 ─────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn ─────────────────────────────────────────────────────────
  it('random > SPAWN_CHANCE(0.003)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('random < SPAWN_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('MAX_AURORAS(8)上限不超出', () => {
    for (let i = 0; i < MAX_AURORAS; i++) {
      ;(sys as any).auroras.push(makeAurora({ tick: 99999, active: true }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras.length).toBeLessThanOrEqual(MAX_AURORAS)
  })
  it('spawn后aurora active=true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const a = (sys as any).auroras[0]
    if (a) expect(a.active).toBe(true)
  })
  it('spawn后aurora tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const a = (sys as any).auroras[0]
    if (a) expect(a.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后aurora colorPattern有效', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const a = (sys as any).auroras[0]
    if (a) {
      expect(['green', 'purple', 'blue', 'multicolor']).toContain(a.colorPattern)
    }
  })
  it('spawn后aurora包含intensity字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    const a = (sys as any).auroras[0]
    if (a) expect(typeof a.intensity).toBe('number')
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    if ((sys as any).auroras.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  // ── 字段更新 ─────────────────────────────────────────────────────
  it('intensity随tick振荡', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ colorPattern: 'green', tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    // intensity = PATTERN_INTENSITY['green'] * (0.5 + 0.5 * sin(tick*0.0004 + id*2))
    // intensity is in range [0, 50] for green
    const a = (sys as any).auroras[0]
    expect(a.intensity).toBeGreaterThanOrEqual(0)
    expect(a.intensity).toBeLessThanOrEqual(50)
  })
  it('age > 180000时active变为false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ tick: 0, active: true }))
    // tick=200000, age = 200000 > 180000
    sys.update(1, world, em, 200000)
    // aurora may still be in array before cleanup but active=false
    // after cleanup (splice) it's removed
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('age <= 180000时active保持true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ tick: CHECK_INTERVAL, active: true }))
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    // age = CHECK_INTERVAL < 180000 → still active
    expect((sys as any).auroras).toHaveLength(1)
    expect((sys as any).auroras[0].active).toBe(true)
  })

  // ── cleanup（active=false时删除）────────────────────────────────
  it('active=false的aurora被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ active: false, tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })
  it('active=true的aurora不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ active: true, tick: CHECK_INTERVAL }))
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('混合active/inactive：只删inactive的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ active: false, tick: 0 }))
    ;(sys as any).auroras.push(makeAurora({ active: true, tick: CHECK_INTERVAL }))
    sys.update(1, world, em, CHECK_INTERVAL * 2)
    expect((sys as any).auroras).toHaveLength(1)
    expect((sys as any).auroras[0].active).toBe(true)
  })
  it('所有aurora都inactive时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).auroras.push(makeAurora({ active: false, tick: 0 }))
    }
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras).toHaveLength(0)
  })

  // ── 颜色模式覆盖 ───────────────────────────────────────────────
  it('green模式intensity基础值为50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ colorPattern: 'green', tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    // intensity = 50 * (0.5 + 0.5 * sin(...)) in [0,50]
    expect((sys as any).auroras[0].intensity).toBeLessThanOrEqual(50)
  })
  it('multicolor模式intensity基础值为80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).auroras.push(makeAurora({ colorPattern: 'multicolor', tick: 0 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).auroras[0].intensity).toBeLessThanOrEqual(80)
  })

  // ── 手动注入 ────────────────────────────────────────────────────
  it('手动注入aurora后长度正确', () => {
    ;(sys as any).auroras.push(makeAurora())
    expect((sys as any).auroras).toHaveLength(1)
  })
  it('手动注入多个aurora', () => {
    for (let i = 0; i < 4; i++) (sys as any).auroras.push(makeAurora())
    expect((sys as any).auroras).toHaveLength(4)
  })

  // ── 边界条件 ─────────────────────────────────────────────────────
  it('tick=0不触发', () => {
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, 9999999)).not.toThrow()
  })
  it('空auroras时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, world, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('aurora字段结构完整', () => {
    const a = makeAurora()
    expect(typeof a.id).toBe('number')
    expect(typeof a.x).toBe('number')
    expect(typeof a.y).toBe('number')
    expect(typeof a.colorPattern).toBe('string')
    expect(typeof a.intensity).toBe('number')
    expect(typeof a.width).toBe('number')
    expect(typeof a.height).toBe('number')
    expect(typeof a.active).toBe('boolean')
    expect(typeof a.tick).toBe('number')
  })
})
