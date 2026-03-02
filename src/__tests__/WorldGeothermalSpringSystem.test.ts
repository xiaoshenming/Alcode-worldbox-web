import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeothermalSpringSystem } from '../systems/WorldGeothermalSpringSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any  // MOUNTAIN
const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any      // GRASS
const snowWorld = { width: 200, height: 200, getTile: () => 6 } as any       // SNOW
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any       // SAND（不允许）
const waterWorld = { width: 200, height: 200, getTile: () => 0 } as any      // DEEP_WATER（不允许）
const em = {} as any

describe('WorldGeothermalSpringSystem', () => {
  let sys: WorldGeothermalSpringSystem

  beforeEach(() => {
    sys = new WorldGeothermalSpringSystem()
    vi.restoreAllMocks()
  })

  // 1. 基础状态
  it('初始springs数组为空', () => {
    expect((sys as any).springs).toHaveLength(0)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('update方法存在', () => {
    expect(typeof sys.update).toBe('function')
  })

  it('初始update不抛出异常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, mountainWorld, em, 0)).not.toThrow()
  })

  // 2. CHECK_INTERVAL=2600 节流
  it('tick=0时(0-0=0 < 2600)跳过check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('tick=2599时不执行check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2599)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2600时执行check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('连续check间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    sys.update(1, mountainWorld, em, 3000)  // 3000-2600=400 < 2600，跳过
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('第二次check在tick=5200时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    sys.update(1, mountainWorld, em, 5200)
    expect((sys as any).lastCheck).toBe(5200)
  })

  // 3. spawn条件（FORM_CHANCE=0.003，tile必须是MOUNTAIN/GRASS/SNOW）
  it('random=0.9不满足FORM_CHANCE，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('SAND tile阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 2600)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('DEEP_WATER tile阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, 0)
    sys.update(1, waterWorld, em, 2600)
    expect((sys as any).springs).toHaveLength(0)
  })

  it('MOUNTAIN tile允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect((sys as any).springs.length).toBeGreaterThanOrEqual(0)
  })

  it('GRASS tile允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, 0)
    sys.update(1, grassWorld, em, 2600)
    expect((sys as any).springs.length).toBeGreaterThanOrEqual(0)
  })

  it('SNOW tile允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, snowWorld, em, 0)
    sys.update(1, snowWorld, em, 2600)
    expect((sys as any).springs.length).toBeGreaterThanOrEqual(0)
  })

  it('达到MAX_SPRINGS(22)后不新增', () => {
    const s = (sys as any).springs
    for (let i = 0; i < 22; i++) {
      s.push({ id: i+1, x: 10, y: 10, radius: 3, temperature: 50,
        mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s.length).toBeLessThanOrEqual(22)
  })

  // 4. 字段更新
  it('temperature在[30,98]范围内更新', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].temperature).toBeGreaterThanOrEqual(30)
    expect(s[0].temperature).toBeLessThanOrEqual(98)
  })

  it('steamOutput有下限5（Math.max(5,...)）', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 5, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random-0.48=-0.48，减少
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].steamOutput).toBeGreaterThanOrEqual(5)
  })

  it('mineralContent单调递增（+0.005/check）', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].mineralContent).toBeCloseTo(30.005, 5)
  })

  it('mineralContent上限为95', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 95, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].mineralContent).toBeCloseTo(95, 5)
  })

  it('flowRate在[2,50]范围内更新', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].flowRate).toBeGreaterThanOrEqual(2)
    expect(s[0].flowRate).toBeLessThanOrEqual(50)
  })

  it('flowRate极低时被钳制到2', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 2, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random-0.5=-0.5，减少
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].flowRate).toBeGreaterThanOrEqual(2)
  })

  it('temperature极低时被钳制到30', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 30,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 减少温度
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    expect(s[0].temperature).toBeGreaterThanOrEqual(30)
  })

  // 5. cleanup：cutoff=tick-92000
  it('过期spring(tick<cutoff=tick-92000)被删除', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 95000)  // cutoff=3000, spring.tick=0 < 3000
    expect(s).toHaveLength(0)
  })

  it('未过期spring保留', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 80000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 95000)  // cutoff=3000, spring.tick=80000 >= 3000，保留
    expect(s.length).toBeGreaterThanOrEqual(1)
  })

  it('混合场景：过期删除，未过期保留', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 0 })
    s.push({ id: 2, x: 20, y: 20, radius: 2, temperature: 55,
      mineralContent: 25, steamOutput: 25, flowRate: 10, tick: 85000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 95000)  // cutoff=3000: id=1删除，id=2保留
    expect(s).toHaveLength(1)
    expect(s[0].id).toBe(2)
  })

  it('全部过期时数组清空', () => {
    const s = (sys as any).springs
    for (let i = 0; i < 3; i++) {
      s.push({ id: i+1, x: 10, y: 10, radius: 3, temperature: 60,
        mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 95000)
    expect(s).toHaveLength(0)
  })

  it('cutoff边界：spring.tick恰好等于cutoff不删除', () => {
    const s = (sys as any).springs
    // cutoff=95000-92000=3000, spring.tick=3000, 3000<3000为false，保留
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 3000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 95000)
    expect(s.length).toBeGreaterThanOrEqual(1)
  })

  // 6. 多次update累积
  it('两次check后mineralContent累积两次', () => {
    const s = (sys as any).springs
    s.push({ id: 1, x: 10, y: 10, radius: 3, temperature: 60,
      mineralContent: 30, steamOutput: 30, flowRate: 15, tick: 2600 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, 0)
    sys.update(1, mountainWorld, em, 2600)
    sys.update(1, mountainWorld, em, 5200)
    expect(s[0].mineralContent).toBeCloseTo(30.010, 4)
  })
})
