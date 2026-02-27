import { describe, it, expect, beforeEach } from 'vitest'
import { StatisticsTracker } from '../systems/StatisticsTracker'

// StatisticsTracker 测试：
// - recordEvent(type)         → 累计出生/死亡/战争/和平计数
// - getSummary()              → 返回累计统计数据快照
// - getPopulationHistory()    → 返回总人口+各文明序列
// - getTerritoryHistory()     → 返回各文明领土序列
// - getTechHistory()          → 返回各文明科技序列
// 通过 as any 注入私有字段进行测试。

function makeST(): StatisticsTracker {
  return new StatisticsTracker()
}

describe('StatisticsTracker.recordEvent + getSummary', () => {
  let st: StatisticsTracker

  beforeEach(() => { st = makeST() })

  it('初始 summary 全零', () => {
    const s = st.getSummary()
    expect(s.totalBirths).toBe(0)
    expect(s.totalDeaths).toBe(0)
    expect(s.totalWars).toBe(0)
    expect(s.peakPopulation).toBe(0)
  })

  it('recordEvent(birth) 累加出生数', () => {
    st.recordEvent('birth')
    st.recordEvent('birth')
    expect(st.getSummary().totalBirths).toBe(2)
  })

  it('recordEvent(birth, count) 批量累加', () => {
    st.recordEvent('birth', 10)
    expect(st.getSummary().totalBirths).toBe(10)
  })

  it('recordEvent(death) 累加死亡数', () => {
    st.recordEvent('death', 5)
    expect(st.getSummary().totalDeaths).toBe(5)
  })

  it('recordEvent(war) 累加战争数', () => {
    st.recordEvent('war', 3)
    expect(st.getSummary().totalWars).toBe(3)
  })

  it('recordEvent(peace) 不影响 war 计数', () => {
    st.recordEvent('war', 2)
    st.recordEvent('peace', 1)
    expect(st.getSummary().totalWars).toBe(2)
  })

  it('多种事件混合累计', () => {
    st.recordEvent('birth', 100)
    st.recordEvent('death', 40)
    st.recordEvent('war', 3)
    const s = st.getSummary()
    expect(s.totalBirths).toBe(100)
    expect(s.totalDeaths).toBe(40)
    expect(s.totalWars).toBe(3)
  })

  it('getSummary 返回新对象（修改不影响内部）', () => {
    st.recordEvent('birth', 5)
    const s = st.getSummary()
    s.totalBirths = 9999
    expect(st.getSummary().totalBirths).toBe(5)
  })
})

describe('StatisticsTracker.getPopulationHistory', () => {
  it('初始只有 Total 序列且数据为空', () => {
    const st = makeST()
    const hist = st.getPopulationHistory()
    expect(hist).toHaveLength(1)
    expect(hist[0].label).toBe('Total')
    expect(hist[0].data).toHaveLength(0)
  })

  it('注入 totalPopHistory 数据点后出现在 Total 序列', () => {
    const st = makeST()
    ;(st as any).totalPopHistory.push({ tick: 100, value: 50 })
    ;(st as any).totalPopHistory.push({ tick: 200, value: 80 })
    const hist = st.getPopulationHistory()
    expect(hist[0].data).toHaveLength(2)
    expect(hist[0].data[0].value).toBe(50)
    expect(hist[0].data[1].value).toBe(80)
  })

  it('注入文明人口序列后出现在结果末尾', () => {
    const st = makeST()
    ;(st as any).civPopHistory.set(1, {
      label: 'Human Kingdom', color: '#ff0000',
      data: [{ tick: 100, value: 20 }],
    })
    const hist = st.getPopulationHistory()
    expect(hist).toHaveLength(2)
    expect(hist[1].label).toBe('Human Kingdom')
    expect(hist[1].data[0].value).toBe(20)
  })

  it('每次调用返回新数组', () => {
    const st = makeST()
    expect(st.getPopulationHistory()).not.toBe(st.getPopulationHistory())
  })
})

describe('StatisticsTracker.getTerritoryHistory', () => {
  it('初始无领土历史', () => {
    expect(makeST().getTerritoryHistory()).toHaveLength(0)
  })

  it('注入文明领土序列后可查询', () => {
    const st = makeST()
    ;(st as any).civTerritoryHistory.set(2, {
      label: 'Elf Empire', color: '#00ff00',
      data: [{ tick: 300, value: 15 }, { tick: 600, value: 25 }],
    })
    const hist = st.getTerritoryHistory()
    expect(hist).toHaveLength(1)
    expect(hist[0].label).toBe('Elf Empire')
    expect(hist[0].data[1].value).toBe(25)
  })

  it('多个文明全部返回', () => {
    const st = makeST()
    ;(st as any).civTerritoryHistory.set(1, { label: 'A', color: '#f00', data: [] })
    ;(st as any).civTerritoryHistory.set(2, { label: 'B', color: '#0f0', data: [] })
    ;(st as any).civTerritoryHistory.set(3, { label: 'C', color: '#00f', data: [] })
    expect(st.getTerritoryHistory()).toHaveLength(3)
  })
})

describe('StatisticsTracker.getTechHistory', () => {
  it('初始无科技历史', () => {
    expect(makeST().getTechHistory()).toHaveLength(0)
  })

  it('注入文明科技序列后可查询', () => {
    const st = makeST()
    ;(st as any).civTechHistory.set(1, {
      label: 'Dwarf Clan', color: '#aaa',
      data: [{ tick: 100, value: 3 }],
    })
    const hist = st.getTechHistory()
    expect(hist).toHaveLength(1)
    expect(hist[0].data[0].value).toBe(3)
  })
})

describe('StatisticsTracker peakPopulation tracking', () => {
  it('直接注入后反映在 getSummary', () => {
    const st = makeST()
    ;(st as any).peakPopulation = 999
    expect(st.getSummary().peakPopulation).toBe(999)
  })
})
