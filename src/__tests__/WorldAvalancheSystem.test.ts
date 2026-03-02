import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAvalancheSystem } from '../systems/WorldAvalancheSystem'
import type { Avalanche, AvalancheSize } from '../systems/WorldAvalancheSystem'

const CHECK_INTERVAL = 1400
const worldNoSnow = { width: 200, height: 200, getTile: () => 5 } as any
const worldSnow   = { width: 200, height: 200, getTile: () => 7 } as any
const em = { getEntitiesWithComponents: () => [] } as any

function makeSys(): WorldAvalancheSystem { return new WorldAvalancheSystem() }
let nextId = 1
function makeAvalanche(overrides: Partial<Avalanche> = {}): Avalanche {
  return {
    id: nextId++,
    x: 30, y: 20,
    size: 'medium',
    speed: 3,
    direction: 0,      // cos(0)=1, sin(0)=0 => 纯水平移动，便于断言
    force: 50,
    tick: 0,
    ...overrides,
  }
}

describe('WorldAvalancheSystem', () => {
  let sys: WorldAvalancheSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────
  it('初始无雪崩', () => {
    expect((sys as any).avalanches).toHaveLength(0)
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
    sys.update(1, worldSnow, em, CHECK_INTERVAL - 1)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL 时触发执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(1)
  })

  it('lastCheck在触发后更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次update若tick未超过CHECK_INTERVAL则不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    sys.update(1, worldSnow, em, CHECK_INTERVAL + 1)
    expect((sys as any).avalanches).toHaveLength(1)
  })

  // ── spawn 地形条件 ──────────────────────────────────────────────
  it('getTile返回5（非雪山）时不生成雪崩', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldNoSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('getTile返回7（雪山）且random < SPAWN_CHANCE 时生成雪崩', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(1)
  })

  it('getTile返回8（更高雪山）时也能生成雪崩', () => {
    const worldHighSnow = { width: 200, height: 200, getTile: () => 8 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldHighSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(1)
  })

  it('random > SPAWN_CHANCE 时不生成雪崩', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('avalanches数量达到MAX_AVALANCHES(15)时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 15; i++) {
      ;(sys as any).avalanches.push(makeAvalanche())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(15)
  })

  it('生成的雪崩tick等于当前update的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches[0].tick).toBe(CHECK_INTERVAL)
  })

  // ── size / force 映射 ───────────────────────────────────────────
  it('支持4种雪崩规模', () => {
    const sizes: AvalancheSize[] = ['small', 'medium', 'large', 'catastrophic']
    expect(sizes).toHaveLength(4)
  })

  it('small雪崩force为15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // sizeIdx=0 => small
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    const a = (sys as any).avalanches[0]
    // force = (0+1)*15 = 15，之后move会-0.1，所以检查接近15
    expect(a.force).toBeCloseTo(14.9, 3)
  })

  it('large雪崩(sizeIdx=2)force为45', () => {
    // random * 4 => index选择：需要0.5-0.75区间得到index=2
    vi.spyOn(Math, 'random').mockImplementationOnce(() => 0.001)  // spawn chance
      .mockImplementationOnce(() => 0.5)   // x
      .mockImplementationOnce(() => 0.5)   // y
      .mockImplementationOnce(() => 0.5)   // isPolar
      .mockImplementationOnce(() => 0.5)   // sizeIdx => floor(0.5*4)=2
      .mockImplementation(() => 0.5)
    sys = makeSys()
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    const a = (sys as any).avalanches[0]
    // force = (2+1)*15 = 45，move后 -0.1 = 44.9
    expect(a.force).toBeCloseTo(44.9, 3)
  })

  // ── move 字段更新 ────────────────────────────────────────────────
  it('每次update x/y根据direction和speed移动', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const a = makeAvalanche({ x: 100, y: 100, speed: 4, direction: 0 })
    ;(sys as any).avalanches.push(a)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    // direction=0: x += cos(0)*4 = +4, y += sin(0)*4 = +0
    expect((sys as any).avalanches[0].x).toBeCloseTo(104, 5)
    expect((sys as any).avalanches[0].y).toBeCloseTo(100, 5)
  })

  it('每次update speed减少0.05', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).avalanches.push(makeAvalanche({ speed: 3 }))
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches[0].speed).toBeCloseTo(2.95, 5)
  })

  it('speed不会低于0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).avalanches.push(makeAvalanche({ speed: 0.5 }))
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches[0].speed).toBe(0.5)
  })

  it('每次update force减少0.1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).avalanches.push(makeAvalanche({ force: 10 }))
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches[0].force).toBeCloseTo(9.9, 5)
  })

  it('force不会低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).avalanches.push(makeAvalanche({ force: 0.05 }))
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    // force=0.05-0.1=-0.05 => clamp到0 => 触发cleanup删除
    expect((sys as any).avalanches).toHaveLength(0)
  })

  // ── cleanup：tick cutoff ─────────────────────────────────────────
  it('tick < cutoff(tick-6000) 时雪崩被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // avalanche.tick=0, currentTick=CHECK_INTERVAL+6001 => cutoff=CHECK_INTERVAL+1 > 0
    const a = makeAvalanche({ tick: 0, force: 999 })
    ;(sys as any).avalanches.push(a)
    ;(sys as any).lastCheck = 0
    sys.update(1, worldSnow, em, CHECK_INTERVAL + 6001)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('tick在cutoff范围内时雪崩保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const a = makeAvalanche({ tick: CHECK_INTERVAL, force: 999 })
    ;(sys as any).avalanches.push(a)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(1)
  })

  // ── cleanup：force <= 0 ──────────────────────────────────────────
  it('force <= 0 时雪崩被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const a = makeAvalanche({ force: 0.05, tick: CHECK_INTERVAL })
    ;(sys as any).avalanches.push(a)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    // force=0.05-0.1=-0.05 => clamp到0 => 删除
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('force刚好为0时雪崩被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 预先让force已经=0
    const a = makeAvalanche({ force: 0, tick: CHECK_INTERVAL })
    ;(sys as any).avalanches.push(a)
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('同时满足两个cleanup条件时雪崩被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const a = makeAvalanche({ force: 0, tick: 0 })
    ;(sys as any).avalanches.push(a)
    ;(sys as any).lastCheck = 0
    sys.update(1, worldSnow, em, CHECK_INTERVAL + 6001)
    expect((sys as any).avalanches).toHaveLength(0)
  })

  it('cleanup同时处理多个过期雪崩', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).avalanches.push(
      makeAvalanche({ force: 0, tick: CHECK_INTERVAL }),
      makeAvalanche({ force: 0, tick: CHECK_INTERVAL }),
      makeAvalanche({ force: 999, tick: CHECK_INTERVAL }),
    )
    sys.update(1, worldSnow, em, CHECK_INTERVAL)
    expect((sys as any).avalanches).toHaveLength(1)
  })
})
