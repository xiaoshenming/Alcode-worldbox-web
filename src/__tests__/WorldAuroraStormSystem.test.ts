import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAuroraStormSystem } from '../systems/WorldAuroraStormSystem'
import type { AuroraStorm } from '../systems/WorldAuroraStormSystem'

const CHECK_INTERVAL = 600
const world = { width: 200, height: 200, getTile: () => 5 } as any
const em = { getEntitiesWithComponents: () => [] } as any

function makeSys(): WorldAuroraStormSystem { return new WorldAuroraStormSystem() }
let nextId = 1
function makeStorm(overrides: Partial<AuroraStorm> = {}): AuroraStorm {
  return {
    id: nextId++,
    x: 50, y: 50,
    radius: 20, intensity: 80, hue: 120,
    duration: 500, maxDuration: 1000,
    active: true,
    ...overrides,
  }
}

describe('WorldAuroraStormSystem', () => {
  let sys: WorldAuroraStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────
  it('初始无极光风暴', () => {
    expect((sys as any).storms).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 节流 CHECK_INTERVAL ─────────────────────────────────────────
  it('tick < CHECK_INTERVAL 时不执行任何逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL - 1)
    expect((sys as any).storms).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL 时触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(1)
  })

  it('lastCheck在触发后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update若tick未超过CHECK_INTERVAL则不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    // 下一次tick仅+1，未超过下一检查点
    sys.update(1, world, em, CHECK_INTERVAL + 1)
    // 只应生成1个storm
    expect((sys as any).storms).toHaveLength(1)
  })

  // ── spawn 逻辑 ──────────────────────────────────────────────────
  it('random < FORM_CHANCE(0.01) 时生成极光风暴', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(1)
  })

  it('random > FORM_CHANCE 时不生成极光风暴', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(0)
  })

  it('storms数量达到MAX_STORMS(3)时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm(), makeStorm(), makeStorm())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(3)
  })

  it('生成的极光风暴active初始为true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms[0].active).toBe(true)
  })

  it('生成的极光风暴duration初始为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, CHECK_INTERVAL)
    // duration在evolve时会++，所以spawn后立即evolve变为1
    expect((sys as any).storms[0].duration).toBe(1)
  })

  // ── evolve 字段更新 ─────────────────────────────────────────────
  it('每次update storm.duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm({ duration: 10 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms[0].duration).toBe(11)
  })

  it('每次update hue递增0.5并对360取模', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // random()-0.5 = 0，intensity/radius不变
    ;(sys as any).storms.push(makeStorm({ hue: 359.8 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    const hue = (sys as any).storms[0].hue
    expect(hue).toBeCloseTo(0.3, 5)
  })

  it('intensity被钳制在[20, 100]范围内', () => {
    // 模拟极端情况：intensity=20，random=0 => delta=-5 => clamp到20
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).storms.push(makeStorm({ intensity: 20 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms[0].intensity).toBeGreaterThanOrEqual(20)
    expect((sys as any).storms[0].intensity).toBeLessThanOrEqual(100)
  })

  it('radius被钳制在[8, 40]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // delta=+1
    ;(sys as any).storms.push(makeStorm({ radius: 40 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms[0].radius).toBeLessThanOrEqual(40)
    expect((sys as any).storms[0].radius).toBeGreaterThanOrEqual(8)
  })

  // ── duration >= maxDuration → active=false ─────────────────────
  it('duration达到maxDuration时storm变为inactive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // duration=999, maxDuration=1000，evolve后duration=1000 >= maxDuration => active=false
    ;(sys as any).storms.push(makeStorm({ duration: 999, maxDuration: 1000 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    // cleanup后storm被删除
    expect((sys as any).storms).toHaveLength(0)
  })

  it('duration超过maxDuration时storm被cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm({ duration: 1000, maxDuration: 1000, active: false }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(0)
  })

  // ── cleanup ─────────────────────────────────────────────────────
  it('cleanup删除active=false的storm', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm({ active: false }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(0)
  })

  it('cleanup保留active=true的storm', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(makeStorm({ active: true, duration: 0, maxDuration: 5000 }))
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(1)
  })

  it('cleanup同时处理多个inactive storm', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).storms.push(
      makeStorm({ active: false }),
      makeStorm({ active: false }),
      makeStorm({ active: true, duration: 0, maxDuration: 5000 }),
    )
    sys.update(1, world, em, CHECK_INTERVAL)
    expect((sys as any).storms).toHaveLength(1)
  })

  // ── getActiveStorms ─────────────────────────────────────────────
  it('初始状态getActiveStorms返回空数组', () => {
    expect(sys.getActiveStorms()).toHaveLength(0)
  })

  it('getActiveStorms只返回active=true的storms', () => {
    ;(sys as any).storms.push(makeStorm({ active: true }))
    ;(sys as any).storms.push(makeStorm({ active: false }))
    expect(sys.getActiveStorms()).toHaveLength(1)
  })

  it('getActiveStorms返回内部复用buffer引用', () => {
    const r1 = sys.getActiveStorms()
    const r2 = sys.getActiveStorms()
    expect(r1).toBe(r2)
  })

  it('getActiveStorms返回正确的storm对象', () => {
    const storm = makeStorm({ active: true, hue: 240 })
    ;(sys as any).storms.push(storm)
    const active = sys.getActiveStorms()
    expect(active[0].hue).toBe(240)
  })
})
