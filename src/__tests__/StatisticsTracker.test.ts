import { describe, it, expect, beforeEach } from 'vitest'
import { StatisticsTracker } from '../systems/StatisticsTracker'

function makeST(): StatisticsTracker {
  return new StatisticsTracker()
}

// 使用 as any 直接访问私有字段（getSummary 已作为死代码删除）
function getStats(st: StatisticsTracker) {
  return {
    totalBirths: (st as any).totalBirths as number,
    totalDeaths: (st as any).totalDeaths as number,
    totalWars: (st as any).totalWars as number,
    peakPopulation: (st as any).peakPopulation as number,
  }
}

describe('StatisticsTracker.recordEvent', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })

  it('初始计数全零', () => {
    const s = getStats(st)
    expect(s.totalBirths).toBe(0)
    expect(s.totalDeaths).toBe(0)
    expect(s.totalWars).toBe(0)
    expect(s.peakPopulation).toBe(0)
  })

  it('recordEvent(birth) 累加出生数', () => {
    st.recordEvent('birth')
    st.recordEvent('birth')
    expect(getStats(st).totalBirths).toBe(2)
  })

  it('recordEvent(birth, count) 批量累加', () => {
    st.recordEvent('birth', 10)
    expect(getStats(st).totalBirths).toBe(10)
  })

  it('recordEvent(death) 累加死亡数', () => {
    st.recordEvent('death', 5)
    expect(getStats(st).totalDeaths).toBe(5)
  })

  it('recordEvent(war) 累加战争数', () => {
    st.recordEvent('war', 3)
    expect(getStats(st).totalWars).toBe(3)
  })

  it('recordEvent(peace) 不影响 war 计数', () => {
    st.recordEvent('war', 2)
    st.recordEvent('peace', 1)
    expect(getStats(st).totalWars).toBe(2)
  })

  it('多种事件混合累计', () => {
    st.recordEvent('birth', 100)
    st.recordEvent('death', 40)
    st.recordEvent('war', 3)
    const s = getStats(st)
    expect(s.totalBirths).toBe(100)
    expect(s.totalDeaths).toBe(40)
    expect(s.totalWars).toBe(3)
  })

  it('各计数器相互独立', () => {
    st.recordEvent('birth', 5)
    expect(getStats(st).totalDeaths).toBe(0)
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
  it('直接注入后反映在私有字段', () => {
    const st = makeST()
    ;(st as any).peakPopulation = 999
    expect(getStats(st).peakPopulation).toBe(999)
  })
})
