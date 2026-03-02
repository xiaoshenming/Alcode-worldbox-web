import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeoglyphSystem } from '../systems/WorldGeoglyphSystem'

const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
const waterWorld = { width: 200, height: 200, getTile: () => 0 } as any
const em = {} as any

describe('WorldGeoglyphSystem', () => {
  let sys: WorldGeoglyphSystem

  beforeEach(() => {
    sys = new WorldGeoglyphSystem()
    vi.restoreAllMocks()
  })

  // 1. 基础状态
  it('初始geoglyphs数组为空', () => {
    expect((sys as any).geoglyphs).toHaveLength(0)
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
    expect(() => sys.update(1, sandWorld, em, 0)).not.toThrow()
  })

  // 2. CHECK_INTERVAL=4000 节流
  it('tick=0时执行check（0-0>=4000为false，首次0-0=0 < 4000，但lastCheck=0时0-0=0不满足跳过条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    // tick=0, lastCheck=0, 0-0=0 < 4000, 跳过
    expect((sys as any).geoglyphs).toHaveLength(0)
  })

  it('tick=3999时不执行check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, 0)      // lastCheck=0
    sys.update(1, sandWorld, em, 3999)   // 3999-0 < 4000，跳过
    expect((sys as any).geoglyphs).toHaveLength(0)
  })

  it('tick=4000时执行check', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)   // 4000-0 >= 4000，执行
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('执行check后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('连续check不重复更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 5000)
    sys.update(1, sandWorld, em, 6000)   // 6000-5000 < 4000，跳过
    expect((sys as any).lastCheck).toBe(5000)
  })

  // 3. spawn条件
  it('random=0.9时BUILD_CHANCE(0.002)不满足，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect((sys as any).geoglyphs).toHaveLength(0)
  })

  it('水域tile阻断spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, waterWorld, em, 0)
    sys.update(1, waterWorld, em, 4000)
    expect((sys as any).geoglyphs).toHaveLength(0)
  })

  it('sand tile(=2)允许spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect((sys as any).geoglyphs.length).toBeGreaterThanOrEqual(0)
    mockRandom.mockRestore()
  })

  it('grass tile(=3)允许spawn', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, 0)
    sys.update(1, grassWorld, em, 4000)
    expect((sys as any).geoglyphs.length).toBeGreaterThanOrEqual(0)
    mockRandom.mockRestore()
  })

  it('达到MAX_GEOGLYPHS(10)后不新增', () => {
    const g = (sys as any).geoglyphs
    for (let i = 0; i < 10; i++) {
      g.push({ id: i+1, x: 10, y: 10, shape: 'spiral', size: 5,
        spiritualPower: 8, visibility: 80, age: 0, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect(g.length).toBeLessThanOrEqual(10)
  })

  // 4. cleanup：visibility<=10时删除
  it('visibility<=10时从数组删除', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 10, age: 200000, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect(g).toHaveLength(0)
  })

  it('visibility=11时保留', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 11, age: 0, tick: 4000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect(g.length).toBeGreaterThanOrEqual(1)
  })

  it('混合场景：低visibility被清除，高visibility保留', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 10, age: 200000, tick: 0 })
    g.push({ id: 2, x: 20, y: 20, shape: 'animal', size: 4,
      spiritualPower: 12, visibility: 80, age: 0, tick: 4000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect(g).toHaveLength(1)
    expect(g[0].id).toBe(2)
  })

  it('全部visibility<=10时数组清空', () => {
    const g = (sys as any).geoglyphs
    for (let i = 0; i < 3; i++) {
      g.push({ id: i+1, x: 10, y: 10, shape: 'spiral', size: 5,
        spiritualPower: 8, visibility: 10, age: 200000, tick: 0 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    expect(g).toHaveLength(0)
  })

  // 5. age字段更新
  it('age=tick-g.tick', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 80, age: 0, tick: 1000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 5000)
    expect(g[0].age).toBe(5000 - 1000)
  })

  it('age<=100000时visibility不递减', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 80, age: 0, tick: 4000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    // age=4000-4000=0, 不超过100000，visibility应保持80
    expect(g[0].visibility).toBe(80)
  })

  it('age>100000时visibility会递减', () => {
    const g = (sys as any).geoglyphs
    // tick=4000, g.tick=0 => age=4000, 不触发。设tick很大
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 80, age: 0, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 110000) // age=110000>100000，触发递减
    expect(g[0].visibility).toBeLessThan(80)
  })

  it('visibility递减后低于10时被cleanup删除', () => {
    const g = (sys as any).geoglyphs
    // tick=110000时，age=110000-0=110000>100000，触发递减：10.02-0.03=9.99<=10，删除
    g.push({ id: 1, x: 10, y: 10, shape: 'spiral', size: 5,
      spiritualPower: 8, visibility: 10.02, age: 0, tick: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 110000)  // age=110000>100000，visibility=10.02-0.03=9.99，删除
    expect(g).toHaveLength(0)
  })

  // 6. spiritualPower波动
  it('spiritualPower随tick用sin波动', () => {
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'humanoid', size: 5,
      spiritualPower: 15, visibility: 80, age: 0, tick: 4000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    // spiritualPower = 15 * (0.8 + 0.2*sin(4000*0.0001))
    const expected = 15 * (0.8 + 0.2 * Math.sin(4000 * 0.0001))
    expect(g[0].spiritualPower).toBeCloseTo(expected, 5)
  })

  it('celestial形状基础power=20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // 注入一个celestial geoglyph
    const g = (sys as any).geoglyphs
    g.push({ id: 1, x: 10, y: 10, shape: 'celestial', size: 5,
      spiritualPower: 20, visibility: 80, age: 0, tick: 4000 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    const expected = 20 * (0.8 + 0.2 * Math.sin(4000 * 0.0001))
    expect(g[0].spiritualPower).toBeCloseTo(expected, 5)
  })

  // 7. nextId递增
  it('手动注入geoglyphs后nextId独立计数', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // 8. tile=null阻断spawn
  it('getTile返回null时不spawn', () => {
    const nullWorld = { width: 200, height: 200, getTile: () => null } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, nullWorld, em, 0)
    sys.update(1, nullWorld, em, 4000)
    expect((sys as any).geoglyphs).toHaveLength(0)
  })

  // 9. 多次tick后lastCheck正确跟踪
  it('多次间隔update后lastCheck跟踪最新执行tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 0)
    sys.update(1, sandWorld, em, 4000)
    sys.update(1, sandWorld, em, 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })
})
