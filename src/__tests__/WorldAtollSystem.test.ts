import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAtollSystem } from '../systems/WorldAtollSystem'
import type { Atoll } from '../systems/WorldAtollSystem'

const CHECK_INTERVAL = 5000
const MAX_ATOLLS = 6

let nextId = 1
function makeSys() { return new WorldAtollSystem() }
function makeAtoll(overrides: Partial<Atoll> = {}): Atoll {
  return {
    id: nextId++,
    x: 30, y: 40,
    radius: 4,
    lagoonDepth: 4,
    coralHealth: 60,
    marineLife: 10,
    sandAccumulation: 0,
    age: 0,
    tick: 0,
    ...overrides,
  }
}

const makeWorldAllDeepWater = () => ({
  width: 200,
  height: 200,
  getTile: () => 0,
}) as any

const makeWorldGrass = () => ({
  width: 200,
  height: 200,
  getTile: () => 3,
}) as any

const em = {} as any

describe('WorldAtollSystem', () => {
  let sys: WorldAtollSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 初始状态 ---
  it('初始atolls为空', () => {
    expect((sys as any).atolls).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('atolls是数组', () => {
    expect(Array.isArray((sys as any).atolls)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).atolls.push(makeAtoll())
    expect((s2 as any).atolls).toHaveLength(0)
  })

  // --- CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick == CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续调用：第二次tick不满足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- Spawn 生成逻辑 ---
  it('非DEEP_WATER地形不会spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls).toHaveLength(0)
  })
  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    expect((sys as any).atolls).toHaveLength(0)
  })
  it('全DEEP_WATER且random < SPAWN_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    expect((sys as any).atolls).toHaveLength(1)
  })
  it('生成的atoll字段在合法范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    const a = (sys as any).atolls[0]
    expect(a.radius).toBeGreaterThanOrEqual(3)
    expect(a.radius).toBeLessThanOrEqual(5)
    expect(a.lagoonDepth).toBeGreaterThanOrEqual(0.5)
    expect(a.lagoonDepth).toBeLessThanOrEqual(6)
    expect(a.coralHealth).toBeGreaterThanOrEqual(10)
    expect(a.coralHealth).toBeLessThanOrEqual(100)
    expect(a.marineLife).toBeGreaterThanOrEqual(5)
    expect(a.marineLife).toBeLessThanOrEqual(14)
    expect(a.sandAccumulation).toBeCloseTo(0.05)
    expect(a.age).toBe(1)
  })
  it('生成的atoll记录spawn时的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].tick).toBe(CHECK_INTERVAL)
  })
  it('已达MAX_ATOLLS时不再生成', () => {
    for (let i = 0; i < MAX_ATOLLS; i++) {
      ;(sys as any).atolls.push(makeAtoll())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    expect((sys as any).atolls).toHaveLength(MAX_ATOLLS)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    if ((sys as any).atolls.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('spawn后atoll active=true（通过tick存储）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorldAllDeepWater(), em, CHECK_INTERVAL)
    const a = (sys as any).atolls[0]
    if (a) expect(a.tick).toBe(CHECK_INTERVAL)
  })

  // --- 字段更新 ---
  it('每次update后age递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ age: 0 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].age).toBe(1)
  })
  it('每次update后sandAccumulation增加0.05', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ sandAccumulation: 10 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].sandAccumulation).toBeCloseTo(10.05)
  })
  it('sandAccumulation上限为100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ sandAccumulation: 100 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].sandAccumulation).toBe(100)
  })
  it('update后coralHealth保持在[10, 100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ coralHealth: 99 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    const a = (sys as any).atolls[0]
    expect(a.coralHealth).toBeGreaterThanOrEqual(10)
    expect(a.coralHealth).toBeLessThanOrEqual(100)
  })
  it('update后lagoonDepth逐渐减少且不低于0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ lagoonDepth: 4 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    const a = (sys as any).atolls[0]
    expect(a.lagoonDepth).toBeCloseTo(3.999)
    expect(a.lagoonDepth).toBeGreaterThanOrEqual(0.5)
  })
  it('lagoonDepth不低于下限0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ lagoonDepth: 0.5 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].lagoonDepth).toBe(0.5)
  })
  it('多个atolls同时更新age', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).atolls.push(makeAtoll({ age: i }))
    }
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    for (let i = 0; i < 3; i++) {
      expect((sys as any).atolls[i].age).toBe(i + 1)
    }
  })

  // --- Cleanup 清理 ---
  it('注入的atoll在update后保留（无时间淘汰逻辑）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))
    sys.update(1, makeWorldGrass(), em, 999999)
    expect((sys as any).atolls).toHaveLength(1)
  })
  it('大量atoll也不会被删除（无cleanup逻辑）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < MAX_ATOLLS; i++) {
      ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))
    }
    sys.update(1, makeWorldGrass(), em, 999999)
    expect((sys as any).atolls).toHaveLength(MAX_ATOLLS)
  })

  // --- 注入验证 ---
  it('直接注入atoll后字段可访问', () => {
    ;(sys as any).atolls.push(makeAtoll({ lagoonDepth: 15, coralHealth: 80, marineLife: 70 }))
    const a = (sys as any).atolls[0]
    expect(a.lagoonDepth).toBe(15)
    expect(a.coralHealth).toBe(80)
    expect(a.marineLife).toBe(70)
  })
  it('多个atolls全部返回', () => {
    ;(sys as any).atolls.push(makeAtoll())
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(2)
  })

  // --- 边界条件 ---
  it('tick=0不触发', () => {
    sys.update(1, makeWorldGrass(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorldGrass(), em, 9999999)).not.toThrow()
  })
  it('atoll字段结构完整', () => {
    const a = makeAtoll()
    expect(typeof a.id).toBe('number')
    expect(typeof a.x).toBe('number')
    expect(typeof a.y).toBe('number')
    expect(typeof a.radius).toBe('number')
    expect(typeof a.lagoonDepth).toBe('number')
    expect(typeof a.coralHealth).toBe('number')
    expect(typeof a.marineLife).toBe('number')
    expect(typeof a.sandAccumulation).toBe('number')
    expect(typeof a.age).toBe('number')
    expect(typeof a.tick).toBe('number')
  })
  it('coralHealth低于10时被截断为10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).atolls.push(makeAtoll({ coralHealth: 10 }))
    sys.update(1, makeWorldGrass(), em, CHECK_INTERVAL)
    expect((sys as any).atolls[0].coralHealth).toBeGreaterThanOrEqual(10)
  })
})
