import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldArroyoSystem } from '../systems/WorldArroyoSystem'
import type { Arroyo } from '../systems/WorldArroyoSystem'

const CHECK_INTERVAL = 2550
const MAX_ARROYOS = 15
const CUTOFF = 86000

let nextId = 1
function makeSys() { return new WorldArroyoSystem() }
function makeArroyo(overrides: Partial<Arroyo> = {}): Arroyo {
  return {
    id: nextId++,
    x: 15, y: 25,
    length: 20,
    depth: 3,
    waterPresence: 40,
    sedimentLoad: 20,
    flashFloodRisk: 30,
    spectacle: 25,
    tick: 0,
    ...overrides,
  }
}

const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
const makeWorldSand = () => ({ width: 200, height: 200, getTile: () => 2 }) as any
const makeWorldGrass = () => ({ width: 200, height: 200, getTile: () => 3 }) as any
const em = {} as any

describe('WorldArroyoSystem', () => {
  let sys: WorldArroyoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ─── 初始状态 ───
  it('初始arroyos为空', () => {
    expect((sys as any).arroyos).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('arroyos是数组', () => {
    expect(Array.isArray((sys as any).arroyos)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).arroyos.push(makeArroyo())
    expect((s2 as any).arroyos).toHaveLength(0)
  })

  // ─── 节流逻辑 ───
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn ───
  it('非SAND/GRASS地形不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos).toHaveLength(0)
  })
  it('SAND地形+random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('GRASS地形+random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('FORM_CHANCE超出时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos).toHaveLength(0)
  })
  it('MAX_ARROYOS(15)上限不超出', () => {
    for (let i = 0; i < MAX_ARROYOS; i++) {
      ;(sys as any).arroyos.push(makeArroyo({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos.length).toBeLessThanOrEqual(MAX_ARROYOS)
  })
  it('spawn后arroyo包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    const a = (sys as any).arroyos[0]
    if (a) {
      expect(typeof a.id).toBe('number')
      expect(typeof a.x).toBe('number')
      expect(typeof a.length).toBe('number')
      expect(typeof a.depth).toBe('number')
      expect(typeof a.tick).toBe('number')
    }
  })
  it('spawn后arroyo tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    const a = (sys as any).arroyos[0]
    if (a) expect(a.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorldSand(), em, CHECK_INTERVAL)
    if ((sys as any).arroyos.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  // ─── 字段更新 ───
  it('waterPresence每次update变化（受random影响）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ waterPresence: 40, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // waterPresence = max(0, min(80, 40+(0.9-0.52)*0.3)) = max(0, min(80, 40.114)) = 40.114
    expect((sys as any).arroyos[0].waterPresence).toBeCloseTo(40.114, 4)
  })
  it('waterPresence不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).arroyos.push(makeArroyo({ waterPresence: 0, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].waterPresence).toBeGreaterThanOrEqual(0)
  })
  it('waterPresence不高于80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).arroyos.push(makeArroyo({ waterPresence: 80, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].waterPresence).toBeLessThanOrEqual(80)
  })
  it('depth随sedimentLoad慢慢增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ depth: 3, sedimentLoad: 20, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // depth = min(20, 3 + 20*0.00003) = min(20, 3.0006)
    expect((sys as any).arroyos[0].depth).toBeCloseTo(3.0006, 5)
  })
  it('depth最大不超过20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ depth: 20, sedimentLoad: 100, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].depth).toBe(20)
  })
  it('flashFloodRisk不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).arroyos.push(makeArroyo({ flashFloodRisk: 5, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].flashFloodRisk).toBeGreaterThanOrEqual(5)
  })
  it('flashFloodRisk不高于80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).arroyos.push(makeArroyo({ flashFloodRisk: 80, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].flashFloodRisk).toBeLessThanOrEqual(80)
  })
  it('spectacle不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).arroyos.push(makeArroyo({ spectacle: 5, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].spectacle).toBeGreaterThanOrEqual(5)
  })
  it('spectacle不高于60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).arroyos.push(makeArroyo({ spectacle: 60, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].spectacle).toBeLessThanOrEqual(60)
  })

  // ─── cleanup ───
  it('tick < cutoff(tick-86000)时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).arroyos).toHaveLength(0)
  })
  it('tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 100000
    const cutoff = bigTick - CUTOFF  // 14000
    ;(sys as any).arroyos.push(makeArroyo({ tick: cutoff }))
    sys.update(1, makeWorld(), em, bigTick)
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ tick: 0 }))
    ;(sys as any).arroyos.push(makeArroyo({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).arroyos).toHaveLength(1)
    expect((sys as any).arroyos[0].tick).toBe(50000)
  })

  // ─── 手动注入 ───
  it('手动注入后长度正确', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(1)
  })
  it('手动注入多个后长度正确', () => {
    for (let i = 0; i < 4; i++) (sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(4)
  })

  // ─── 边界条件 ───
  it('tick=0不触发', () => {
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 9999999)).not.toThrow()
  })
  it('空arroyos时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, CHECK_INTERVAL)).not.toThrow()
  })
  it('arroyo字段结构完整', () => {
    const a = makeArroyo()
    expect(typeof a.id).toBe('number')
    expect(typeof a.x).toBe('number')
    expect(typeof a.y).toBe('number')
    expect(typeof a.length).toBe('number')
    expect(typeof a.depth).toBe('number')
    expect(typeof a.waterPresence).toBe('number')
    expect(typeof a.sedimentLoad).toBe('number')
    expect(typeof a.flashFloodRisk).toBe('number')
    expect(typeof a.spectacle).toBe('number')
    expect(typeof a.tick).toBe('number')
  })
})
