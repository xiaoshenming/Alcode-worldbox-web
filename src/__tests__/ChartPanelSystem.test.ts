import { describe, it, expect, beforeEach } from 'vitest'
import { ChartPanelSystem } from '../systems/ChartPanelSystem'
import type { ChartType } from '../systems/ChartPanelSystem'

// ChartPanelSystem 测试：
// - isVisible / show / hide / toggle → 面板可见性控制
// - setChartType(type) / nextChart() / prevChart() → 图表类型切换
// - addDataPoint(tick, data) → 环形缓冲区数据存储
// - setTimeRange(ticks) → 时间窗口设置（最小100）
// render() 依赖 CanvasRenderingContext2D，不在此测试。

function makeCPS(): ChartPanelSystem {
  return new ChartPanelSystem()
}

const makeData = (population = 100, civCount = 3, warCount = 1, avgTechLevel = 2.5, totalTerritory = 50) =>
  ({ population, civCount, warCount, avgTechLevel, totalTerritory })

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
})

describe('ChartPanelSystem.setChartType', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('设置合法图表类型后 chartIndex 更新', () => {
    cps.setChartType('wars')
    expect((cps as any).chartIndex).toBe(2)  // ['population','civilizations','wars','technology','territory']
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
})

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
    ;(cps as any).chartIndex = 4  // 最后一个
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
})

describe('ChartPanelSystem.setTimeRange', () => {
  let cps: ChartPanelSystem

  beforeEach(() => { cps = makeCPS() })

  it('设置合法时间窗口', () => {
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
})

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
    expect((cps as any).count).toBe(500)   // count 保持 MAX_BUFFER
    expect((cps as any).head).toBe(1)       // head 指向第二个位置
  })
})
