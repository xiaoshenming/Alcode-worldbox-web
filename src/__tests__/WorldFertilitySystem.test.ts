import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldFertilitySystem } from '../systems/WorldFertilitySystem'

function makeSys(): WorldFertilitySystem { return new WorldFertilitySystem() }

function makeTiles(w: number, h: number, defaultTile = 3): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(defaultTile))
}

describe('WorldFertilitySystem - 初始状态', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => { sys = makeSys() })

  it('未初始化时isInitialized=false', () => {
    expect(sys.isInitialized()).toBe(false)
  })
  it('未初始化时getFertility越界返回0', () => {
    expect(sys.getFertility(-1, -1)).toBe(0)
  })
  it('未初始化时getAverageFertility返回0', () => {
    expect(sys.getAverageFertility()).toBe(0)
  })
  it('私有字段worldWidth初始为0', () => {
    expect((sys as any).worldWidth).toBe(0)
  })
  it('私有字段worldHeight初始为0', () => {
    expect((sys as any).worldHeight).toBe(0)
  })
  it('私有字段lastUpdate初始为0', () => {
    expect((sys as any).lastUpdate).toBe(0)
  })
  it('私有字段initialized初始为false', () => {
    expect((sys as any).initialized).toBe(false)
  })
  it('私有字段fertility初始为空Float32Array', () => {
    expect((sys as any).fertility.length).toBe(0)
  })
})

describe('WorldFertilitySystem - init初始化', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => { sys = makeSys() })

  it('init后isInitialized=true', () => {
    sys.init(10, 10, makeTiles(10, 10))
    expect(sys.isInitialized()).toBe(true)
  })
  it('init后worldWidth正确', () => {
    sys.init(20, 15, makeTiles(20, 15))
    expect((sys as any).worldWidth).toBe(20)
  })
  it('init后worldHeight正确', () => {
    sys.init(20, 15, makeTiles(20, 15))
    expect((sys as any).worldHeight).toBe(15)
  })
  it('init后fertility长度=width*height', () => {
    sys.init(10, 10, makeTiles(10, 10))
    expect((sys as any).fertility.length).toBe(100)
  })
  it('init后可查询getFertility', () => {
    sys.init(10, 10, makeTiles(10, 10))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(0)
  })
  it('草地(3)初始fertility在[60, 90)', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(60)
    expect(f).toBeLessThan(90)
  })
  it('森林(4)初始fertility在[70, 95)', () => {
    sys.init(10, 10, makeTiles(10, 10, 4))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(70)
    expect(f).toBeLessThan(95)
  })
  it('沙滩(2)初始fertility在[30, 50)', () => {
    sys.init(10, 10, makeTiles(10, 10, 2))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(30)
    expect(f).toBeLessThan(50)
  })
  it('山地(5)初始fertility在[20, 35)', () => {
    sys.init(10, 10, makeTiles(10, 10, 5))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(20)
    expect(f).toBeLessThan(35)
  })
  it('雪地(6)初始fertility在[40, 60)', () => {
    sys.init(10, 10, makeTiles(10, 10, 6))
    const f = sys.getFertility(5, 5)
    expect(f).toBeGreaterThanOrEqual(40)
    expect(f).toBeLessThan(60)
  })
  it('水(0)初始fertility=0', () => {
    sys.init(10, 10, makeTiles(10, 10, 0))
    expect(sys.getFertility(5, 5)).toBe(0)
  })
  it('岩浆(7)初始fertility=0', () => {
    sys.init(10, 10, makeTiles(10, 10, 7))
    expect(sys.getFertility(5, 5)).toBe(0)
  })
})

describe('WorldFertilitySystem - getFertility', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => {
    sys = makeSys()
    sys.init(10, 10, makeTiles(10, 10, 3))
  })

  it('x<0时返回0', () => {
    expect(sys.getFertility(-1, 5)).toBe(0)
  })
  it('x>=width时返回0', () => {
    expect(sys.getFertility(10, 5)).toBe(0)
  })
  it('y<0时返回0', () => {
    expect(sys.getFertility(5, -1)).toBe(0)
  })
  it('y>=height时返回0', () => {
    expect(sys.getFertility(5, 10)).toBe(0)
  })
  it('合法坐标返回非负值', () => {
    expect(sys.getFertility(5, 5)).toBeGreaterThanOrEqual(0)
  })
  it('不同坐标可能有不同值', () => {
    const f1 = sys.getFertility(0, 0)
    const f2 = sys.getFertility(9, 9)
    expect(typeof f1).toBe('number')
    expect(typeof f2).toBe('number')
  })
  it('同一坐标多次查询返回相同值', () => {
    const f1 = sys.getFertility(5, 5)
    const f2 = sys.getFertility(5, 5)
    expect(f1).toBe(f2)
  })
})

describe('WorldFertilitySystem - setFertility', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => {
    sys = makeSys()
    sys.init(10, 10, makeTiles(10, 10, 3))
  })

  it('可设置fertility值', () => {
    sys.setFertility(5, 5, 75)
    expect(sys.getFertility(5, 5)).toBe(75)
  })
  it('设置后立即生效', () => {
    sys.setFertility(2, 2, 50)
    expect(sys.getFertility(2, 2)).toBe(50)
  })
  it('设置值<MIN_FERTILITY时钳制为0', () => {
    sys.setFertility(5, 5, -10)
    expect(sys.getFertility(5, 5)).toBe(0)
  })
  it('设置值>MAX_FERTILITY时钳制为100', () => {
    sys.setFertility(5, 5, 150)
    expect(sys.getFertility(5, 5)).toBe(100)
  })
  it('x<0时不设置', () => {
    sys.setFertility(-1, 5, 75)
    expect(sys.getFertility(-1, 5)).toBe(0)
  })
  it('x>=width时不设置', () => {
    sys.setFertility(10, 5, 75)
    expect(sys.getFertility(10, 5)).toBe(0)
  })
  it('y<0时不设置', () => {
    sys.setFertility(5, -1, 75)
    expect(sys.getFertility(5, -1)).toBe(0)
  })
  it('y>=height时不设置', () => {
    sys.setFertility(5, 10, 75)
    expect(sys.getFertility(5, 10)).toBe(0)
  })
})

describe('WorldFertilitySystem - update节流', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => {
    sys = makeSys()
    sys.init(10, 10, makeTiles(10, 10, 3))
  })

  it('FERTILITY_UPDATE_INTERVAL=600', () => {
    sys.update(0, makeTiles(10, 10, 3), 599)
    expect((sys as any).lastUpdate).toBe(0)
  })
  it('tick < INTERVAL时不更新lastUpdate', () => {
    sys.update(0, makeTiles(10, 10, 3), 500)
    expect((sys as any).lastUpdate).toBe(0)
  })
  it('tick >= INTERVAL时更新lastUpdate', () => {
    sys.update(0, makeTiles(10, 10, 3), 600)
    expect((sys as any).lastUpdate).toBe(600)
  })
  it('tick=599时不更新', () => {
    sys.update(0, makeTiles(10, 10, 3), 599)
    expect((sys as any).lastUpdate).toBe(0)
  })
  it('tick=600时更新', () => {
    sys.update(0, makeTiles(10, 10, 3), 600)
    expect((sys as any).lastUpdate).toBe(600)
  })
  it('第二次update在600后才触发', () => {
    sys.update(0, makeTiles(10, 10, 3), 600)
    sys.update(0, makeTiles(10, 10, 3), 1000)
    expect((sys as any).lastUpdate).toBe(600)
    sys.update(0, makeTiles(10, 10, 3), 1200)
    expect((sys as any).lastUpdate).toBe(1200)
  })
  it('未初始化时update不执行', () => {
    const sys2 = makeSys()
    sys2.update(0, makeTiles(10, 10, 3), 600)
    expect((sys2 as any).lastUpdate).toBe(0)
  })
  it('dt参数未使用', () => {
    sys.update(999, makeTiles(10, 10, 3), 600)
    expect((sys as any).lastUpdate).toBe(600)
  })
})

describe('WorldFertilitySystem - update字段变更', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => {
    sys = makeSys()
    sys.init(10, 10, makeTiles(10, 10, 3))
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('水(0)和岩浆(7)fertility强制为0', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 0)
    sys.update(0, tiles, 600)
    expect(sys.getFertility(2, 2)).toBe(0)
  })
  it('非水非岩浆地形fertility自然增长', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(50)
  })
  it('fertility<MAX时增长REGEN_RATE=0.01', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(50)
  })
  it('森林(4)regenerate速度*2', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 4)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(50)
  })
  it('草地(3)regenerate速度*1.5', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(50)
  })
  it('fertility不超过MAX_FERTILITY=100', () => {
    sys.setFertility(2, 2, 99.99)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    expect(sys.getFertility(2, 2)).toBeLessThanOrEqual(100)
  })
  it('Math.random()<0.01时随机波动', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.005).mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(typeof after).toBe('number')
  })
  it('随机波动幅度在[-1.5, 1.5]', () => {
    sys.setFertility(2, 2, 50)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.005).mockReturnValue(0.5)
    sys.update(0, tiles, 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(48)
    expect(after).toBeLessThanOrEqual(52)
  })
  it('波动后fertility不低于MIN_FERTILITY=0', () => {
    sys.setFertility(2, 2, 1)
    const tiles = makeTiles(10, 10, 3)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.005).mockReturnValue(0)
    sys.update(0, tiles, 600)
    expect(sys.getFertility(2, 2)).toBeGreaterThanOrEqual(0)
  })
})

describe('WorldFertilitySystem - getAverageFertility', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => {
    sys = makeSys()
  })

  it('未初始化时返回0', () => {
    expect(sys.getAverageFertility()).toBe(0)
  })
  it('初始化后返回非负值', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    expect(sys.getAverageFertility()).toBeGreaterThanOrEqual(0)
  })
  it('全部为0时返回0', () => {
    sys.init(10, 10, makeTiles(10, 10, 0))
    expect(sys.getAverageFertility()).toBe(0)
  })
  it('采样间隔为4', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    const avg = sys.getAverageFertility()
    expect(avg).toBeGreaterThan(0)
  })
  it('平均值在合理范围内', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    const avg = sys.getAverageFertility()
    expect(avg).toBeGreaterThanOrEqual(0)
    expect(avg).toBeLessThanOrEqual(100)
  })
})

describe('WorldFertilitySystem - 边界验证', () => {
  let sys: WorldFertilitySystem
  beforeEach(() => { sys = makeSys() })

  it('width=0时init不崩溃', () => {
    expect(() => sys.init(0, 10, [])).not.toThrow()
  })
  it('height=0时init不崩溃', () => {
    expect(() => sys.init(10, 0, [])).not.toThrow()
  })
  it('tiles为空数组时不崩溃', () => {
    expect(() => sys.init(10, 10, [])).not.toThrow()
  })
  it('tiles行数不足时使用默认值', () => {
    sys.init(10, 10, [])
    expect(sys.getFertility(5, 5)).toBe(0)
  })
  it('tiles列数不足时使用默认值', () => {
    sys.init(10, 10, [[]])
    expect(sys.getFertility(5, 5)).toBe(0)
  })
  it('MAX_FERTILITY=100', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    sys.setFertility(5, 5, 200)
    expect(sys.getFertility(5, 5)).toBe(100)
  })
  it('MIN_FERTILITY=0', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    sys.setFertility(5, 5, -50)
    expect(sys.getFertility(5, 5)).toBe(0)
  })
  it('REGEN_RATE=0.01', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    sys.setFertility(2, 2, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(0, makeTiles(10, 10, 3), 600)
    const after = sys.getFertility(2, 2)
    expect(after).toBeGreaterThanOrEqual(50)
  })
  it('update采样步长为2', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    sys.update(0, makeTiles(10, 10, 3), 600)
    expect((sys as any).lastUpdate).toBe(600)
  })
  it('fertility使用Float32Array', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    expect((sys as any).fertility instanceof Float32Array).toBe(true)
  })
  it('索引计算公式=y*width+x', () => {
    sys.init(10, 10, makeTiles(10, 10, 3))
    sys.setFertility(5, 3, 88)
    expect((sys as any).fertility[3 * 10 + 5]).toBe(88)
  })
})
