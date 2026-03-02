import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ChartPanelSystem } from '../systems/ChartPanelSystem'
import type { ChartType } from '../systems/ChartPanelSystem'

afterEach(() => vi.restoreAllMocks())

function makeCPS(): ChartPanelSystem {
  return new ChartPanelSystem()
}

const makeData = (
  population = 100,
  civCount = 3,
  warCount = 1,
  avgTechLevel = 2.5,
  totalTerritory = 50
) => ({ population, civCount, warCount, avgTechLevel, totalTerritory })

// ─── 可见性控制 ────────────────────────────────────────────────────────────

describe('ChartPanelSystem visibility', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('初始不可见', () => {
    expect(cps.isVisible).toBe(false)
  })

  it('show() 后变为可见', () => {
    cps.show()
    expect(cps.isVisible).toBe(true)
  })

  it('hide() 后变为不可见', () => {
    cps.show()
    cps.hide()
    expect(cps.isVisible).toBe(false)
  })

  it('toggle() 切换可见性', () => {
    expect(cps.isVisible).toBe(false)
    cps.toggle()
    expect(cps.isVisible).toBe(true)
    cps.toggle()
    expect(cps.isVisible).toBe(false)
  })

  it('连续 show 不出错', () => {
    cps.show()
    cps.show()
    expect(cps.isVisible).toBe(true)
  })

  it('连续 hide 不出错', () => {
    cps.hide()
    cps.hide()
    expect(cps.isVisible).toBe(false)
  })

  it('toggle 偶数次后回到初始状态', () => {
    for (let i = 0; i < 6; i++) cps.toggle()
    expect(cps.isVisible).toBe(false)
  })

  it('toggle 奇数次后为可见', () => {
    for (let i = 0; i < 5; i++) cps.toggle()
    expect(cps.isVisible).toBe(true)
  })

  it('show 后 hide 再 toggle 变可见', () => {
    cps.show()
    cps.hide()
    cps.toggle()
    expect(cps.isVisible).toBe(true)
  })

  it('isVisible 是公共属性可直接读取', () => {
    expect(typeof cps.isVisible).toBe('boolean')
  })
})

// ─── setChartType ─────────────────────────────────────────────────────────

describe('ChartPanelSystem.setChartType', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('设置合法图表类型 wars 后 chartIndex 更新', () => {
    cps.setChartType('wars')
    expect((cps as any).chartIndex).toBe(2)
  })

  it('设置非法类型时不更新', () => {
    const before = (cps as any).chartIndex
    cps.setChartType('invalid_type' as ChartType)
    expect((cps as any).chartIndex).toBe(before)
  })

  it('可设置所有 5 种图表类型', () => {
    const types: ChartType[] = ['population', 'civilizations', 'wars', 'technology', 'territory']
    types.forEach((t, i) => {
      cps.setChartType(t)
      expect((cps as any).chartIndex).toBe(i)
    })
  })

  it('setChartType("population") → index 0', () => {
    cps.setChartType('territory')
    cps.setChartType('population')
    expect((cps as any).chartIndex).toBe(0)
  })

  it('setChartType("civilizations") → index 1', () => {
    cps.setChartType('civilizations')
    expect((cps as any).chartIndex).toBe(1)
  })

  it('setChartType("technology") → index 3', () => {
    cps.setChartType('technology')
    expect((cps as any).chartIndex).toBe(3)
  })

  it('setChartType("territory") → index 4', () => {
    cps.setChartType('territory')
    expect((cps as any).chartIndex).toBe(4)
  })

  it('重复设置同一类型不变', () => {
    cps.setChartType('wars')
    cps.setChartType('wars')
    expect((cps as any).chartIndex).toBe(2)
  })

  it('空字符串不改变 chartIndex', () => {
    const before = (cps as any).chartIndex
    cps.setChartType('' as ChartType)
    expect((cps as any).chartIndex).toBe(before)
  })
})

// ─── nextChart / prevChart ─────────────────────────────────────────────────

describe('ChartPanelSystem.nextChart / prevChart', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('nextChart() 递增 chartIndex', () => {
    cps.nextChart()
    expect((cps as any).chartIndex).toBe(1)
    cps.nextChart()
    expect((cps as any).chartIndex).toBe(2)
  })

  it('nextChart() 在末尾循环回 0', () => {
    ;(cps as any).chartIndex = 4
    cps.nextChart()
    expect((cps as any).chartIndex).toBe(0)
  })

  it('prevChart() 递减 chartIndex', () => {
    ;(cps as any).chartIndex = 3
    cps.prevChart()
    expect((cps as any).chartIndex).toBe(2)
  })

  it('prevChart() 在开头循环到末尾', () => {
    ;(cps as any).chartIndex = 0
    cps.prevChart()
    expect((cps as any).chartIndex).toBe(4)
  })

  it('nextChart 5 次后回到初始索引 0', () => {
    for (let i = 0; i < 5; i++) cps.nextChart()
    expect((cps as any).chartIndex).toBe(0)
  })

  it('prevChart 5 次后回到初始索引 0', () => {
    for (let i = 0; i < 5; i++) cps.prevChart()
    expect((cps as any).chartIndex).toBe(0)
  })

  it('nextChart 后 prevChart 回到原位置', () => {
    const start = (cps as any).chartIndex
    cps.nextChart()
    cps.prevChart()
    expect((cps as any).chartIndex).toBe(start)
  })

  it('prevChart 后 nextChart 回到原位置', () => {
    ;(cps as any).chartIndex = 2
    cps.prevChart()
    cps.nextChart()
    expect((cps as any).chartIndex).toBe(2)
  })

  it('连续 10 次 nextChart 仍在有效范围 [0,4]', () => {
    for (let i = 0; i < 10; i++) cps.nextChart()
    expect((cps as any).chartIndex).toBeGreaterThanOrEqual(0)
    expect((cps as any).chartIndex).toBeLessThanOrEqual(4)
  })

  it('连续 10 次 prevChart 仍在有效范围 [0,4]', () => {
    for (let i = 0; i < 10; i++) cps.prevChart()
    expect((cps as any).chartIndex).toBeGreaterThanOrEqual(0)
    expect((cps as any).chartIndex).toBeLessThanOrEqual(4)
  })
})

// ─── setTimeRange ─────────────────────────────────────────────────────────

describe('ChartPanelSystem.setTimeRange', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('设置合法时间窗口 1000', () => {
    cps.setTimeRange(1000)
    expect((cps as any).timeRange).toBe(1000)
  })

  it('小于最小值 100 时强制为 100', () => {
    cps.setTimeRange(50)
    expect((cps as any).timeRange).toBe(100)
  })

  it('设置 100 不被截断', () => {
    cps.setTimeRange(100)
    expect((cps as any).timeRange).toBe(100)
  })

  it('设置 0 时强制为 100', () => {
    cps.setTimeRange(0)
    expect((cps as any).timeRange).toBe(100)
  })

  it('设置负数时强制为 100', () => {
    cps.setTimeRange(-500)
    expect((cps as any).timeRange).toBe(100)
  })

  it('设置 99 时强制为 100', () => {
    cps.setTimeRange(99)
    expect((cps as any).timeRange).toBe(100)
  })

  it('设置 101 正常保留', () => {
    cps.setTimeRange(101)
    expect((cps as any).timeRange).toBe(101)
  })

  it('设置超大值正常保留', () => {
    cps.setTimeRange(1_000_000)
    expect((cps as any).timeRange).toBe(1_000_000)
  })

  it('默认 timeRange 为 5000', () => {
    expect((cps as any).timeRange).toBe(5000)
  })

  it('多次设置取最后一次的值', () => {
    cps.setTimeRange(200)
    cps.setTimeRange(1500)
    expect((cps as any).timeRange).toBe(1500)
  })
})

// ─── addDataPoint ─────────────────────────────────────────────────────────

describe('ChartPanelSystem.addDataPoint', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('添加数据点后 count 增加', () => {
    cps.addDataPoint(100, makeData())
    expect((cps as any).count).toBe(1)
  })

  it('添加多个数据点', () => {
    cps.addDataPoint(100, makeData(50))
    cps.addDataPoint(200, makeData(60))
    cps.addDataPoint(300, makeData(70))
    expect((cps as any).count).toBe(3)
  })

  it('数据点包含正确的 tick 和数据', () => {
    cps.addDataPoint(500, makeData(200, 5))
    const point = (cps as any).buffer[0]
    expect(point.tick).toBe(500)
    expect(point.population).toBe(200)
    expect(point.civCount).toBe(5)
  })

  it('超过 MAX_BUFFER(500) 后环形覆盖（head 递增）', () => {
    for (let i = 0; i < 501; i++) {
      cps.addDataPoint(i, makeData(i))
    }
    expect((cps as any).count).toBe(500)
    expect((cps as any).head).toBe(1)
  })

  it('buffer 初始为空数组', () => {
    expect((cps as any).buffer).toHaveLength(0)
  })

  it('head 初始为 0', () => {
    expect((cps as any).head).toBe(0)
  })

  it('count 初始为 0', () => {
    expect((cps as any).count).toBe(0)
  })

  it('第一个数据点写入 buffer[0]', () => {
    cps.addDataPoint(42, makeData(99))
    expect((cps as any).buffer[0].tick).toBe(42)
    expect((cps as any).buffer[0].population).toBe(99)
  })

  it('500 个数据点时 count 为 500，head 为 0', () => {
    for (let i = 0; i < 500; i++) cps.addDataPoint(i, makeData(i))
    expect((cps as any).count).toBe(500)
    expect((cps as any).head).toBe(0)
  })

  it('501 个数据点时 head 为 1，count 仍为 500', () => {
    for (let i = 0; i < 501; i++) cps.addDataPoint(i, makeData(i))
    expect((cps as any).head).toBe(1)
    expect((cps as any).count).toBe(500)
  })

  it('502 个数据点时 head 为 2', () => {
    for (let i = 0; i < 502; i++) cps.addDataPoint(i, makeData(i))
    expect((cps as any).head).toBe(2)
  })

  it('数据点中 warCount 字段被正确存储', () => {
    cps.addDataPoint(10, makeData(100, 3, 7))
    expect((cps as any).buffer[0].warCount).toBe(7)
  })

  it('数据点中 avgTechLevel 字段被正确存储', () => {
    cps.addDataPoint(10, makeData(100, 3, 1, 3.14))
    expect((cps as any).buffer[0].avgTechLevel).toBe(3.14)
  })

  it('数据点中 totalTerritory 字段被正确存储', () => {
    cps.addDataPoint(10, makeData(100, 3, 1, 2.5, 777))
    expect((cps as any).buffer[0].totalTerritory).toBe(777)
  })

  it('环形覆盖时最旧数据被新数据覆盖', () => {
    // 写入 500 个
    for (let i = 0; i < 500; i++) cps.addDataPoint(i, makeData(i))
    // 第 501 个写入 buffer[0]（head=0 位置）
    cps.addDataPoint(9999, makeData(9999))
    // buffer[0] 现在是新数据
    expect((cps as any).buffer[0].tick).toBe(9999)
    expect((cps as any).head).toBe(1)
  })

  it('addDataPoint 不会超出 MAX_BUFFER 分配', () => {
    for (let i = 0; i < 600; i++) cps.addDataPoint(i, makeData(i))
    expect((cps as any).buffer.length).toBeLessThanOrEqual(500)
  })
})

// ─── 内部辅助方法 niceScale ────────────────────────────────────────────────

describe('ChartPanelSystem - 内部 niceScale', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('maxVal <= 0 时 max=10, step=2', () => {
    const result = (cps as any).niceScale(0)
    expect(result.max).toBe(10)
    expect(result.step).toBe(2)
  })

  it('maxVal 负数时 max=10, step=2', () => {
    const result = (cps as any).niceScale(-5)
    expect(result.max).toBe(10)
    expect(result.step).toBe(2)
  })

  it('niceScale 返回 max > 0', () => {
    const result = (cps as any).niceScale(100)
    expect(result.max).toBeGreaterThan(0)
  })

  it('niceScale 返回 step > 0', () => {
    const result = (cps as any).niceScale(100)
    expect(result.step).toBeGreaterThan(0)
  })

  it('niceScale max >= maxVal', () => {
    [1, 10, 100, 1000, 5000].forEach(v => {
      const r = (cps as any).niceScale(v)
      expect(r.max).toBeGreaterThanOrEqual(v)
    })
  })

  it('niceScale step = max/5', () => {
    const result = (cps as any).niceScale(100)
    expect(result.step).toBeCloseTo(result.max / 5, 5)
  })

  it('niceScale 返回可复用对象（同一引用）', () => {
    const r1 = (cps as any).niceScale(100)
    const r2 = (cps as any).niceScale(200)
    expect(r1).toBe(r2)
  })
})

// ─── 内部辅助方法 getOrderedData / filterByRange ──────────────────────────

describe('ChartPanelSystem - 内部 getOrderedData / filterByRange', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('无数据时 getOrderedData 返回空数组', () => {
    const data = (cps as any).getOrderedData()
    expect(data).toHaveLength(0)
  })

  it('添加 3 个数据后 getOrderedData 返回 3 个', () => {
    cps.addDataPoint(1, makeData())
    cps.addDataPoint(2, makeData())
    cps.addDataPoint(3, makeData())
    const data = (cps as any).getOrderedData()
    expect(data).toHaveLength(3)
  })

  it('filterByRange 对空数组返回空数组', () => {
    const result = (cps as any).filterByRange([])
    expect(result).toHaveLength(0)
  })

  it('filterByRange 按 timeRange 过滤旧数据', () => {
    cps.setTimeRange(100)
    cps.addDataPoint(0, makeData())    // 超出范围（maxTick=200, minTick=100）
    cps.addDataPoint(100, makeData())  // 恰好在边界
    cps.addDataPoint(200, makeData())  // 最新
    const ordered = (cps as any).getOrderedData()
    const filtered = (cps as any).filterByRange(ordered)
    // tick >= 200-100=100 → 保留 tick=100 和 tick=200
    expect(filtered).toHaveLength(2)
  })

  it('getOrderedData 返回可复用数组（同一引用）', () => {
    cps.addDataPoint(1, makeData())
    const r1 = (cps as any).getOrderedData()
    const r2 = (cps as any).getOrderedData()
    expect(r1).toBe(r2)
  })
})
