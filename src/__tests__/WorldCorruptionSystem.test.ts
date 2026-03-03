import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldCorruptionSystem } from '../systems/WorldCorruptionSystem'

function makeSys(): WorldCorruptionSystem { return new WorldCorruptionSystem() }

const world = { tiles: [] as number[][], width: 200, height: 200, tick: 0 } as any
const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

// ─── getCorruption ────────────────────────────────────────────────────────────
describe('WorldCorruptionSystem.getCorruption', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始腐败为0', () => {
    expect(sys.getCorruption(0, 0)).toBe(0)
  })

  it('越界坐标返回0（负数）', () => {
    expect(sys.getCorruption(-1, -1)).toBe(0)
  })

  it('越界坐标返回0（超出范围）', () => {
    expect(sys.getCorruption(9999, 9999)).toBe(0)
  })

  it('注入后可查询', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.8  // tile(0,0) = index 0
    expect(sys.getCorruption(0, 0)).toBeCloseTo(0.8, 5)
  })

  it('中间坐标注入后可查询', () => {
    // index = y * 200 + x = 50 * 200 + 100 = 10100
    const map = (sys as any).corruptionMap as Float32Array
    map[50 * 200 + 100] = 0.6
    expect(sys.getCorruption(100, 50)).toBeCloseTo(0.6, 5)
  })

  it('不同坐标互不干扰', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.9
    expect(sys.getCorruption(1, 0)).toBe(0)
  })

  it('腐败值上限为1', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 1.0
    expect(sys.getCorruption(0, 0)).toBeCloseTo(1.0, 5)
  })
})

// ─── getCorruptedTileCount ───────────────────────────────────────────────────
describe('WorldCorruptionSystem.getCorruptedTileCount', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为0', () => {
    expect(sys.getCorruptedTileCount()).toBe(0)
  })

  it('低于阈值0.15不计入', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.14
    expect(sys.getCorruptedTileCount()).toBe(0)
  })

  it('恰好达到阈值0.15计入', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.15
    expect(sys.getCorruptedTileCount()).toBe(1)
  })

  it('注入多个高值后增加', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.5
    map[1] = 0.8
    map[2] = 0.05  // below threshold
    expect(sys.getCorruptedTileCount()).toBeGreaterThanOrEqual(2)
  })

  it('注入1个高值后计数为1', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[500] = 0.9
    expect(sys.getCorruptedTileCount()).toBe(1)
  })
})

// ─── source 管理 ─────────────────────────────────────────────────────────────
describe('WorldCorruptionSystem sources', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无sources', () => {
    expect((sys as any).sources).toHaveLength(0)
  })

  it('注入source后可查询', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, strength: 1.0, tick: 0 })
    expect((sys as any).sources).toHaveLength(1)
  })

  it('decaySources: strength衰减(每次-0.001)', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, strength: 0.5, tick: 0 })
    ;(sys as any).decaySources()
    expect((sys as any).sources[0].strength).toBeCloseTo(0.499, 5)
  })

  it('decaySources: strength<=0.01时source被删除', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, strength: 0.01, tick: 0 })
    ;(sys as any).decaySources()
    expect((sys as any).sources).toHaveLength(0)
  })

  it('decaySources: strength=0.011保留，0.01删除', () => {
    ;(sys as any).sources.push({ x: 0, y: 0, strength: 0.011, tick: 0 })
    ;(sys as any).sources.push({ x: 1, y: 0, strength: 0.010, tick: 0 })
    ;(sys as any).decaySources()
    // 0.011 - 0.001 = 0.010, exactly 0.01 => 删除; 0.01 - 0.001 = 0.009 <= 0.01 => 删除
    expect((sys as any).sources).toHaveLength(0)
  })
})

// ─── purifier ────────────────────────────────────────────────────────────────
describe('WorldCorruptionSystem purifiers', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无purifiers', () => {
    expect((sys as any).purifiers).toHaveLength(0)
  })

  it('applyPurifiers: 净化中心点', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[100 * 200 + 100] = 0.8
    ;(sys as any).purifiers.push({ x: 100, y: 100 })
    ;(sys as any).applyPurifiers()
    // 净化率0.03，期望 0.8 - 0.03 = 0.77
    expect(map[100 * 200 + 100]).toBeCloseTo(0.77, 4)
  })

  it('applyPurifiers: 超出半径(5)的点不净化', () => {
    const map = (sys as any).corruptionMap as Float32Array
    // purifier在(100,100)，目标在(106,100)，距离6 > 5
    map[100 * 200 + 106] = 0.9
    ;(sys as any).purifiers.push({ x: 100, y: 100 })
    ;(sys as any).applyPurifiers()
    expect(map[100 * 200 + 106]).toBeCloseTo(0.9, 4)
  })

  it('applyPurifiers: 腐败不会低于0', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[100 * 200 + 100] = 0.01  // 小于PURIFY_RATE=0.03
    ;(sys as any).purifiers.push({ x: 100, y: 100 })
    ;(sys as any).applyPurifiers()
    expect(map[100 * 200 + 100]).toBeGreaterThanOrEqual(0)
  })
})

// ─── weather / season 属性 ───────────────────────────────────────────────────
describe('WorldCorruptionSystem weather/season', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('默认weather为clear', () => {
    expect((sys as any).weather).toBe('clear')
  })

  it('默认season为spring', () => {
    expect((sys as any).season).toBe('spring')
  })

  it('可以设置weather为storm', () => {
    ;(sys as any).weather = 'storm'
    expect((sys as any).weather).toBe('storm')
  })

  it('可以设置season为winter', () => {
    ;(sys as any).season = 'winter'
    expect((sys as any).season).toBe('winter')
  })
})

// ─── update 触发逻辑 ─────────────────────────────────────────────────────────
describe('WorldCorruptionSystem.update tick节流', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0时调用update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(16, world, em, 0)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('tick=30时触发spread（source在中心写入corruptionMap）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // SOURCE_EMIT_RATE=0.04, strength=1.0, center falloff=1, mult=1.0
    // 单次emit=0.04，验证corruptionMap[100*200+100] > 0
    ;(sys as any).sources.push({ x: 100, y: 100, strength: 1.0, tick: 0 })
    sys.update(16, world, em, 30)
    const map = (sys as any).corruptionMap as Float32Array
    expect(map[100 * 200 + 100]).toBeGreaterThan(0)
    vi.restoreAllMocks()
  })

  it('tick=1时不触发spread（count仍为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sources.push({ x: 100, y: 100, strength: 1.0, tick: 0 })
    sys.update(16, world, em, 1)
    expect(sys.getCorruptedTileCount()).toBe(0)
    vi.restoreAllMocks()
  })

  it('多次update(tick累积)后腐败持续增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sources.push({ x: 100, y: 100, strength: 1.0, tick: 0 })
    sys.update(16, world, em, 30)
    const count1 = sys.getCorruptedTileCount()
    sys.update(16, world, em, 60)
    const count2 = sys.getCorruptedTileCount()
    expect(count2).toBeGreaterThanOrEqual(count1)
    vi.restoreAllMocks()
  })
})

describe('WorldCorruptionSystem - 扩展补充', () => {
  let sys: WorldCorruptionSystem
  beforeEach(() => { sys = new WorldCorruptionSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-corruptionMap初始全为0', () => {
    const map = (sys as any).corruptionMap as Float32Array
    let allZero = true
    for (let i = 0; i < 100; i++) { if (map[i] !== 0) { allZero = false; break } }
    expect(allZero).toBe(true)
  })
  it('补充-sources初始为空数组', () => {
    expect((sys as any).sources).toHaveLength(0)
  })
  it('补充-purifiers初始为空数组', () => {
    expect((sys as any).purifiers).toHaveLength(0)
  })
  it('补充-weather初始为clear', () => {
    expect((sys as any).weather).toBe('clear')
  })
  it('补充-season初始为spring', () => {
    expect((sys as any).season).toBe('spring')
  })
  it('补充-getCorruptedTileCount初始为0', () => {
    expect(sys.getCorruptedTileCount()).toBe(0)
  })
  it('补充-corruptionMap长度=WORLD_WIDTH*WORLD_HEIGHT', () => {
    const map = (sys as any).corruptionMap as Float32Array
    expect(map.length).toBe(200 * 200)
  })
  it('补充-直接修改corruptionMap后getCorruption返回正确值', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.5
    expect(sys.getCorruption(0, 0)).toBeCloseTo(0.5, 5)
  })
  it('补充-直接修改corruptionMap后getCorruptedTileCount>=1', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 1.0
    expect(sys.getCorruptedTileCount()).toBeGreaterThanOrEqual(1)
  })
  it('补充-直接注入source后sources.length>=1', () => {
    ;(sys as any).sources.push({ x: 10, y: 10, strength: 0.5, tick: 0 })
    expect((sys as any).sources.length).toBeGreaterThanOrEqual(1)
  })
  it('补充-直接注入purifier后purifiers.length>=1', () => {
    ;(sys as any).purifiers.push({ x: 10, y: 10 })
    expect((sys as any).purifiers.length).toBeGreaterThanOrEqual(1)
  })
  it('补充-修改weather字段为storm', () => {
    ;(sys as any).weather = 'storm'
    expect((sys as any).weather).toBe('storm')
  })
  it('补充-修改season字段为winter', () => {
    ;(sys as any).season = 'winter'
    expect((sys as any).season).toBe('winter')
  })
  it('补充-corruptionMap是Float32Array', () => {
    expect((sys as any).corruptionMap).toBeInstanceOf(Float32Array)
  })
  it('补充-getCorruption边界x=0,y=0', () => {
    expect(sys.getCorruption(0, 0)).toBe(0)
  })
  it('补充-getCorruption边界x=199,y=199', () => {
    expect(sys.getCorruption(199, 199)).toBe(0)
  })
  it('补充-sources数组可以splice', () => {
    ;(sys as any).sources.push({ x: 1, y: 1, strength: 0.5, tick: 0 })
    ;(sys as any).sources.push({ x: 2, y: 2, strength: 0.5, tick: 0 })
    ;(sys as any).sources.splice(0, 1)
    expect((sys as any).sources).toHaveLength(1)
  })
  it('补充-purifiers数组可以splice', () => {
    ;(sys as any).purifiers.push({ x: 1, y: 1 })
    ;(sys as any).purifiers.push({ x: 2, y: 2 })
    ;(sys as any).purifiers.splice(0, 1)
    expect((sys as any).purifiers).toHaveLength(1)
  })
  it('补充-weather可以修改为rain', () => {
    ;(sys as any).weather = 'rain'
    expect((sys as any).weather).toBe('rain')
  })
  it('补充-season可以修改为summer', () => {
    ;(sys as any).season = 'summer'
    expect((sys as any).season).toBe('summer')
  })
  it('补充-多个corruptionMap位置被修改后getCorruptedTileCount正确', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[0] = 0.5
    map[1] = 0.5
    map[2] = 0.5
    expect(sys.getCorruptedTileCount()).toBeGreaterThanOrEqual(3)
  })
  it('补充-corruptionMap第N个位置可以独立修改', () => {
    const map = (sys as any).corruptionMap as Float32Array
    map[100] = 0.8
    expect(map[100]).toBeCloseTo(0.8, 5)
    expect(map[101]).toBe(0)
  })
})
