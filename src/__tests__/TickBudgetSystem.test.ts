import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TickBudgetSystem, SpatialHash } from '../systems/TickBudgetSystem'

function makeSys(budget?: number) { return new TickBudgetSystem(budget) }
function makeHash(cell?: number) { return new SpatialHash(cell) }

// ---- TickBudgetSystem 初始状态 ----
describe('TickBudgetSystem - 初始状态', () => {
  let sys: TickBudgetSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getPerformanceReport 返回数组', () => {
    expect(sys.getPerformanceReport()).toBeInstanceOf(Array)
  })

  it('初始报告为空数组', () => {
    expect(sys.getPerformanceReport()).toHaveLength(0)
  })

  it('frameElapsed 初始为 0', () => {
    expect((sys as any).frameElapsed).toBe(0)
  })

  it('frameCount 初始为 0', () => {
    expect((sys as any).frameCount).toBe(0)
  })

  it('currentFps 初始为 60', () => {
    expect((sys as any).currentFps).toBe(60)
  })

  it('reportDirty 初始为 true', () => {
    expect((sys as any).reportDirty).toBe(true)
  })

  it('默认预算 12ms', () => {
    expect((sys as any).budgetMs).toBe(12)
  })

  it('自定义预算正确设置', () => {
    const s = makeSys(20)
    expect((s as any).budgetMs).toBe(20)
  })

  it('systems Map 初始为空', () => {
    expect((sys as any).systems.size).toBe(0)
  })
})

// ---- beginFrame() ----
describe('TickBudgetSystem - beginFrame()', () => {
  let sys: TickBudgetSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('beginFrame 不抛出', () => {
    expect(() => sys.beginFrame(60)).not.toThrow()
  })

  it('beginFrame 后 frameCount 增加 1', () => {
    sys.beginFrame(60)
    expect((sys as any).frameCount).toBe(1)
  })

  it('多次 beginFrame 累计 frameCount', () => {
    sys.beginFrame(60)
    sys.beginFrame(60)
    sys.beginFrame(60)
    expect((sys as any).frameCount).toBe(3)
  })

  it('beginFrame 后 currentFps 更新', () => {
    sys.beginFrame(30)
    expect((sys as any).currentFps).toBe(30)
  })

  it('beginFrame 后 frameElapsed 重置为 0', () => {
    ;(sys as any).frameElapsed = 999
    sys.beginFrame(60)
    expect((sys as any).frameElapsed).toBe(0)
  })

  it('beginFrame 后 reportDirty 为 true', () => {
    sys.beginFrame(60)
    expect((sys as any).reportDirty).toBe(true)
  })

  it('beginFrame(0) 不崩溃', () => {
    expect(() => sys.beginFrame(0)).not.toThrow()
  })

  it('beginFrame(120) 超高帧率不崩溃', () => {
    expect(() => sys.beginFrame(120)).not.toThrow()
  })

  it('beginFrame 设置 frameStart 为 performance.now() 时间戳', () => {
    const now = 12345.67
    vi.spyOn(performance, 'now').mockReturnValue(now)
    sys.beginFrame(60)
    expect((sys as any).frameStart).toBe(now)
  })
})

// ---- endFrame() ----
describe('TickBudgetSystem - endFrame()', () => {
  let sys: TickBudgetSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('endFrame 不抛出', () => {
    expect(() => sys.endFrame()).not.toThrow()
  })

  it('beginFrame + endFrame 后 frameElapsed >= 0', () => {
    sys.beginFrame(60)
    sys.endFrame()
    expect((sys as any).frameElapsed).toBeGreaterThanOrEqual(0)
  })

  it('endFrame 正确计算耗时', () => {
    const t0 = 1000
    const t1 = 1016
    const nowMock = vi.spyOn(performance, 'now')
    nowMock.mockReturnValueOnce(t0) // beginFrame
    nowMock.mockReturnValueOnce(t1) // endFrame
    sys.beginFrame(60)
    sys.endFrame()
    expect((sys as any).frameElapsed).toBeCloseTo(16, 5)
  })

  it('多次 beginFrame/endFrame 每次重新计算耗时', () => {
    const nowMock = vi.spyOn(performance, 'now')
    nowMock.mockReturnValueOnce(0).mockReturnValueOnce(8)
    sys.beginFrame(60); sys.endFrame()
    expect((sys as any).frameElapsed).toBeCloseTo(8, 5)

    nowMock.mockReturnValueOnce(100).mockReturnValueOnce(115)
    sys.beginFrame(60); sys.endFrame()
    expect((sys as any).frameElapsed).toBeCloseTo(15, 5)
  })
})

// ---- getPerformanceReport() ----
describe('TickBudgetSystem - getPerformanceReport()', () => {
  let sys: TickBudgetSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('空系统返回空数组', () => {
    expect(sys.getPerformanceReport()).toHaveLength(0)
  })

  it('两次调用返回同一缓存数组（dirty=false 后）', () => {
    const r1 = sys.getPerformanceReport()
    const r2 = sys.getPerformanceReport()
    expect(r1).toBe(r2)
  })

  it('reportDirty=false 后不重新计算', () => {
    sys.getPerformanceReport() // dirty → false
    ;(sys as any).reportDirty = false
    const r1 = sys.getPerformanceReport()
    const r2 = sys.getPerformanceReport()
    expect(r1).toBe(r2)
  })

  it('beginFrame 后 reportDirty=true，report 重新生成', () => {
    sys.getPerformanceReport()             // dirty → false
    sys.beginFrame(60)                     // dirty → true
    // 手动注入一个 system record 以验证重新生成
    ;(sys as any).systems.set('test', {
      priority: 'high', times: new Float64Array(60), writeIdx: 0,
      sum: 0, lastTime: 0, skipCount: 0, frequency: 1, frameCounter: 0, startMark: 0
    })
    const report = sys.getPerformanceReport()
    expect(report).toHaveLength(1)
    expect(report[0].name).toBe('test')
  })

  it('report 包含正确字段', () => {
    ;(sys as any).systems.set('movement', {
      priority: 'critical', times: new Float64Array(60), writeIdx: 0,
      sum: 120, lastTime: 2.5, skipCount: 3, frequency: 1, frameCounter: 0, startMark: 0
    })
    ;(sys as any).reportDirty = true
    const report = sys.getPerformanceReport()
    expect(report[0]).toMatchObject({
      name: 'movement',
      priority: 'critical',
      lastTime: 2.5,
      skipCount: 3,
      frequency: 1,
    })
  })

  it('avgTime = sum / 60', () => {
    ;(sys as any).systems.set('ai', {
      priority: 'medium', times: new Float64Array(60), writeIdx: 0,
      sum: 600, lastTime: 10, skipCount: 0, frequency: 1, frameCounter: 0, startMark: 0
    })
    ;(sys as any).reportDirty = true
    const report = sys.getPerformanceReport()
    expect(report[0].avgTime).toBeCloseTo(600 / 60, 5)
  })
})

// ---- adaptFrequencies() 内部频率调整 ----
describe('TickBudgetSystem - adaptFrequencies() 频率调整', () => {
  let sys: TickBudgetSystem

  function addSystem(name: string, priority: 'critical' | 'high' | 'medium' | 'low', freq = 1) {
    ;(sys as any).systems.set(name, {
      priority, times: new Float64Array(60), writeIdx: 0,
      sum: 0, lastTime: 0, skipCount: 0, frequency: freq, frameCounter: 0, startMark: 0
    })
  }
  function getFreq(name: string) {
    return (sys as any).systems.get(name).frequency as number
  }

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('critical 系统始终 frequency=1（高 fps）', () => {
    addSystem('render', 'critical', 2)
    sys.beginFrame(60)
    expect(getFreq('render')).toBe(1)
  })

  it('critical 系统始终 frequency=1（低 fps < 30）', () => {
    addSystem('render', 'critical', 3)
    sys.beginFrame(20)
    expect(getFreq('render')).toBe(1)
  })

  it('fps < 30 时 low 系统 frequency=4', () => {
    addSystem('decoration', 'low', 1)
    sys.beginFrame(25)
    expect(getFreq('decoration')).toBe(4)
  })

  it('fps < 30 时 medium 系统 frequency=2', () => {
    addSystem('ai', 'medium', 1)
    sys.beginFrame(25)
    expect(getFreq('ai')).toBe(2)
  })

  it('fps < 30 时 high 系统 frequency=1', () => {
    addSystem('physics', 'high', 1)
    sys.beginFrame(25)
    expect(getFreq('physics')).toBe(1)
  })

  it('fps < 45 时 low 系统 frequency=2', () => {
    addSystem('decoration', 'low', 1)
    sys.beginFrame(40)
    expect(getFreq('decoration')).toBe(2)
  })

  it('fps < 45 时 medium 系统 frequency=2', () => {
    addSystem('ai', 'medium', 1)
    sys.beginFrame(40)
    expect(getFreq('ai')).toBe(2)
  })

  it('fps < 45 时 high 系统 frequency=1', () => {
    addSystem('physics', 'high', 1)
    sys.beginFrame(40)
    expect(getFreq('physics')).toBe(1)
  })

  it('fps >= 55 时 frequency > 1 的系统降低 1', () => {
    addSystem('decoration', 'low', 4)
    sys.beginFrame(60)
    expect(getFreq('decoration')).toBe(3)
  })

  it('fps >= 55 时 frequency=1 的系统不变', () => {
    addSystem('physics', 'high', 1)
    sys.beginFrame(60)
    expect(getFreq('physics')).toBe(1)
  })
})

// ============================================================
// SpatialHash 测试
// ============================================================

// ---- SpatialHash 初始状态 ----
describe('SpatialHash - 初始状态', () => {
  let hash: SpatialHash

  beforeEach(() => { hash = makeHash() })
  afterEach(() => { vi.restoreAllMocks() })

  it('实例化不抛出', () => {
    expect(() => new SpatialHash()).not.toThrow()
  })

  it('默认 cellSize=16 时 invCell=1/16', () => {
    expect((hash as any).invCell).toBeCloseTo(1 / 16, 10)
  })

  it('自定义 cellSize 正确计算 invCell', () => {
    const h = makeHash(32)
    expect((h as any).invCell).toBeCloseTo(1 / 32, 10)
  })

  it('query 空 hash 返回空数组', () => {
    expect(hash.query(0, 0, 5)).toHaveLength(0)
  })

  it('queryRect 空 hash 返回空数组', () => {
    expect(hash.queryRect(0, 0, 10, 10)).toHaveLength(0)
  })
})

// ---- SpatialHash insert() & query() ----
describe('SpatialHash - insert() & query()', () => {
  let hash: SpatialHash

  function insert(id: number, x: number, y: number) {
    const cells = (hash as any).cells as Map<number, number[]>
    const ic = (hash as any).invCell as number
    const cx = Math.floor(x * ic)
    const cy = Math.floor(y * ic)
    const key = cy * 100000 + cx
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(id)
  }

  beforeEach(() => { hash = makeHash(16) })
  afterEach(() => { vi.restoreAllMocks() })

  it('插入并 query 命中', () => {
    insert(42, 8, 8)
    const result = hash.query(8, 8, 1)
    expect(result).toContain(42)
  })

  it('多实体同格均命中', () => {
    insert(1, 8, 8)
    insert(2, 10, 10)
    const result = hash.query(8, 8, 16)
    expect(result).toContain(1)
    expect(result).toContain(2)
  })

  it('远处实体不命中', () => {
    insert(99, 1000, 1000)
    const result = hash.query(0, 0, 5)
    expect(result).not.toContain(99)
  })

  it('query 结果无重复', () => {
    insert(7, 8, 8)
    insert(7, 8, 8) // 手动重复插入
    const result = hash.query(8, 8, 16)
    const count = result.filter(x => x === 7).length
    expect(count).toBe(1)
  })

  it('queryRect 命中范围内实体', () => {
    insert(5, 10, 10)
    const result = hash.queryRect(0, 0, 20, 20)
    expect(result).toContain(5)
  })

  it('queryRect 不命中范围外实体', () => {
    insert(5, 500, 500)
    const result = hash.queryRect(0, 0, 20, 20)
    expect(result).not.toContain(5)
  })

  it('queryRect 边界实体命中', () => {
    insert(10, 16, 16)
    const result = hash.queryRect(0, 0, 20, 20)
    expect(result).toContain(10)
  })

  it('大半径 query 返回多实体', () => {
    for (let i = 0; i < 5; i++) insert(i, i * 10, i * 10)
    const result = hash.query(0, 0, 100)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

// ---- SpatialHash clear() ----
describe('SpatialHash - clear()', () => {
  let hash: SpatialHash

  function insert(id: number, x: number, y: number) {
    const cells = (hash as any).cells as Map<number, number[]>
    const ic = (hash as any).invCell as number
    const cx = Math.floor(x * ic)
    const cy = Math.floor(y * ic)
    const key = cy * 100000 + cx
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(id)
  }

  beforeEach(() => { hash = makeHash(16) })
  afterEach(() => { vi.restoreAllMocks() })

  it('clear 后 query 返回空', () => {
    insert(1, 8, 8)
    hash.clear()
    expect(hash.query(8, 8, 16)).toHaveLength(0)
  })

  it('clear 后 queryRect 返回空', () => {
    insert(2, 10, 10)
    hash.clear()
    expect(hash.queryRect(0, 0, 50, 50)).toHaveLength(0)
  })

  it('clear 后可重新 insert', () => {
    insert(1, 8, 8)
    hash.clear()
    insert(99, 8, 8)
    expect(hash.query(8, 8, 1)).toContain(99)
  })

  it('空 hash clear 不崩溃', () => {
    expect(() => hash.clear()).not.toThrow()
  })

  it('多次 clear 不崩溃', () => {
    insert(1, 5, 5)
    expect(() => { hash.clear(); hash.clear() }).not.toThrow()
  })
})
