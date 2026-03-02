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

// DEEP_WATER=0, SHALLOW_WATER=1 — 全水域允许spawn
const makeWorldAllDeepWater = () => ({
  width: 200,
  height: 200,
  getTile: () => 0,  // DEEP_WATER
}) as any

// getTile返回3(GRASS)，不是DEEP_WATER，spawn检查失败
const makeWorldGrass = () => ({
  width: 200,
  height: 200,
  getTile: () => 3,  // GRASS
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
    // mock=0.0005时spawn后还有update循环（age++, coralHealth随机浮动, lagoonDepth-0.001）
    // coralHealth = max(10, min(100, (50+0.0005*40) + (0.0005-0.48)*2)) ≈ 49.06，用系统夹紧下限10
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
    expect(a.sandAccumulation).toBeCloseTo(0.05)  // spawn后update循环执行一次+0.05
    expect(a.age).toBe(1)  // spawn后update循环执行一次age++
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

  // --- Cleanup 清理（WorldAtollSystem无cleanup逻辑，验证不删除） ---
  it('注入的atoll在update后保留（无时间淘汰逻辑）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))
    // 用一个很大的tick验证不会被清除
    sys.update(1, makeWorldGrass(), em, 999999)
    expect((sys as any).atolls).toHaveLength(1)
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
})
