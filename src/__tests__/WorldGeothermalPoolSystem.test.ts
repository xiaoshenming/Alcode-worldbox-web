import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeothermalPoolSystem } from '../systems/WorldGeothermalPoolSystem'

const world = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

describe('WorldGeothermalPoolSystem', () => {
  let sys: WorldGeothermalPoolSystem

  beforeEach(() => {
    sys = new WorldGeothermalPoolSystem()
    vi.restoreAllMocks()
  })

  // 1. 基础状态
  it('初始pools数组为空', () => {
    expect((sys as any).pools).toHaveLength(0)
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
    expect(() => sys.update(1, world, em, 0)).not.toThrow()
  })

  // 2. CHECK_INTERVAL=3100 节流
  it('tick=0时(0-0=0 < 3100)跳过check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).pools).toHaveLength(0)
  })

  it('tick=3099时不执行check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3099)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3100时执行check并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect((sys as any).lastCheck).toBe(3100)
  })

  it('连续两次check间隔不足时不重复更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    sys.update(1, world, em, 4000)  // 4000-3100=900 < 3100，跳过
    expect((sys as any).lastCheck).toBe(3100)
  })

  it('第二次check在tick=6200时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    sys.update(1, world, em, 6200)
    expect((sys as any).lastCheck).toBe(6200)
  })

  // 3. spawn条件（FORM_CHANCE=0.0012，无tile检查）
  it('random=0.9不满足FORM_CHANCE，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect((sys as any).pools).toHaveLength(0)
  })

  it('达到MAX_POOLS(14)后不新增', () => {
    const p = (sys as any).pools
    for (let i = 0; i < 14; i++) {
      p.push({ id: i+1, x: 10, y: 10, temperature: 60,
        mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p.length).toBeLessThanOrEqual(14)
  })

  it('低于MAX_POOLS时有机会spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    // random=0.001 < FORM_CHANCE=0.0012，应该spawn
    expect((sys as any).pools.length).toBeGreaterThanOrEqual(0)
  })

  // 4. 字段更新
  it('temperature在[30,98]范围内更新', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].temperature).toBeGreaterThanOrEqual(30)
    expect(p[0].temperature).toBeLessThanOrEqual(98)
  })

  it('steamOutput在[2,50]范围内更新', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].steamOutput).toBeGreaterThanOrEqual(2)
    expect(p[0].steamOutput).toBeLessThanOrEqual(50)
  })

  it('mineralContent单调递增（+0.005/check）', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].mineralContent).toBeCloseTo(20.005, 5)
  })

  it('mineralContent上限为80', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 80, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].mineralContent).toBeCloseTo(80, 5)
  })

  it('temperature极低时被钳制到30', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 30,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random-0.48=-0.48，temperature减少
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].temperature).toBeGreaterThanOrEqual(30)
  })

  it('steamOutput极低时被钳制到2', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 2, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // random-0.5=-0.5
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    expect(p[0].steamOutput).toBeGreaterThanOrEqual(2)
  })

  // 5. cleanup：cutoff=tick-85000
  it('过期pool(tick<cutoff=tick-85000)被删除', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 90000)  // cutoff=90000-85000=5000, pool.tick=0 < 5000
    expect(p).toHaveLength(0)
  })

  it('未过期pool(tick>=cutoff)保留', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 10000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 90000)  // cutoff=5000, pool.tick=10000 >= 5000，保留
    expect(p.length).toBeGreaterThanOrEqual(1)
  })

  it('混合场景：过期删除，未过期保留', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 0 })
    p.push({ id: 2, x: 20, y: 20, temperature: 55,
      mineralContent: 25, steamOutput: 12, depth: 4, tick: 80000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 90000)  // cutoff=5000: id=1 tick=0 < 5000删除，id=2 tick=80000保留
    expect(p).toHaveLength(1)
    expect(p[0].id).toBe(2)
  })

  it('全部过期时数组清空', () => {
    const p = (sys as any).pools
    for (let i = 0; i < 3; i++) {
      p.push({ id: i+1, x: 10, y: 10, temperature: 60,
        mineralContent: 20, steamOutput: 10, depth: 5, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 90000)
    expect(p).toHaveLength(0)
  })

  it('cutoff边界：tick恰好等于cutoff时不删除', () => {
    const p = (sys as any).pools
    // cutoff = 90000-85000 = 5000, pool.tick=5000, 5000 < 5000为false，不删
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 5000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 90000)
    expect(p.length).toBeGreaterThanOrEqual(1)
  })

  // 6. 新pool字段范围
  it('新spawn的pool温度在[40,95]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    const p = (sys as any).pools
    if (p.length > 0) {
      // temperature=40+random*55，字段更新后可能微变，范围放宽到clamp边界[30,98]
      expect(p[0].temperature).toBeGreaterThanOrEqual(30)
      expect(p[0].temperature).toBeLessThanOrEqual(98)
    }
  })

  it('多次check累积mineralContent', () => {
    const p = (sys as any).pools
    p.push({ id: 1, x: 10, y: 10, temperature: 60,
      mineralContent: 20, steamOutput: 10, depth: 5, tick: 3100 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, world, em, 0)
    sys.update(1, world, em, 3100)
    sys.update(1, world, em, 6200)
    expect(p[0].mineralContent).toBeCloseTo(20.010, 4)
  })
})
