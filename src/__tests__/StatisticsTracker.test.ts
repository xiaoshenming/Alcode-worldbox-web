import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StatisticsTracker } from '../systems/StatisticsTracker'
import type { DataPoint, StatSeries } from '../systems/StatisticsTracker'

function makeST(): StatisticsTracker {
  return new StatisticsTracker()
}

function getStats(st: StatisticsTracker) {
  return {
    totalBirths: (st as any).totalBirths as number,
    totalDeaths: (st as any).totalDeaths as number,
    totalWars: (st as any).totalWars as number,
    totalPeaces: (st as any).totalPeaces as number,
    peakPopulation: (st as any).peakPopulation as number,
    lastSampleTick: (st as any).lastSampleTick as number,
  }
}

// ── 辅助：构造最小 civManager mock ────────────────────────────────────────
function makeCivManager(civs: Array<{ id: number; name: string; color: string; population: number; territory: Set<unknown>; techLevel: number }>) {
  return {
    civilizations: new Map(civs.map(c => [c.id, { name: c.name, color: c.color, population: c.population, territory: c.territory, techLevel: c.techLevel }])),
  } as any
}

function makeEm() {
  return {} as any
}

// ── 1. recordEvent ─────────────────────────────────────────────────────────

describe('StatisticsTracker.recordEvent — 初始状态', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 totalBirths 为 0', () => {
    expect(getStats(st).totalBirths).toBe(0)
  })

  it('初始 totalDeaths 为 0', () => {
    expect(getStats(st).totalDeaths).toBe(0)
  })

  it('初始 totalWars 为 0', () => {
    expect(getStats(st).totalWars).toBe(0)
  })

  it('初始 totalPeaces 为 0', () => {
    expect(getStats(st).totalPeaces).toBe(0)
  })

  it('初始 peakPopulation 为 0', () => {
    expect(getStats(st).peakPopulation).toBe(0)
  })

  it('初始 lastSampleTick 为 -300 (=-SAMPLE_INTERVAL)', () => {
    expect(getStats(st).lastSampleTick).toBe(-300)
  })
})

describe('StatisticsTracker.recordEvent — birth 事件', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('recordEvent("birth") 默认 count=1 累加', () => {
    st.recordEvent('birth')
    expect(getStats(st).totalBirths).toBe(1)
  })

  it('recordEvent("birth") 连续调用累加', () => {
    st.recordEvent('birth')
    st.recordEvent('birth')
    expect(getStats(st).totalBirths).toBe(2)
  })

  it('recordEvent("birth", 10) 批量累加', () => {
    st.recordEvent('birth', 10)
    expect(getStats(st).totalBirths).toBe(10)
  })

  it('recordEvent("birth", 0) 不改变计数', () => {
    st.recordEvent('birth', 5)
    st.recordEvent('birth', 0)
    expect(getStats(st).totalBirths).toBe(5)
  })

  it('多次批量 birth 累加正确', () => {
    st.recordEvent('birth', 100)
    st.recordEvent('birth', 50)
    expect(getStats(st).totalBirths).toBe(150)
  })

  it('birth 不影响其他计数器', () => {
    st.recordEvent('birth', 99)
    const s = getStats(st)
    expect(s.totalDeaths).toBe(0)
    expect(s.totalWars).toBe(0)
    expect(s.totalPeaces).toBe(0)
  })
})

describe('StatisticsTracker.recordEvent — death 事件', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('recordEvent("death", 5) 累加死亡数', () => {
    st.recordEvent('death', 5)
    expect(getStats(st).totalDeaths).toBe(5)
  })

  it('death 不影响 birth', () => {
    st.recordEvent('death', 3)
    expect(getStats(st).totalBirths).toBe(0)
  })

  it('多次 death 累加', () => {
    st.recordEvent('death', 10)
    st.recordEvent('death', 20)
    expect(getStats(st).totalDeaths).toBe(30)
  })
})

describe('StatisticsTracker.recordEvent — war/peace 事件', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('recordEvent("war", 3) 累加战争数', () => {
    st.recordEvent('war', 3)
    expect(getStats(st).totalWars).toBe(3)
  })

  it('recordEvent("peace") 累加和平数', () => {
    st.recordEvent('peace')
    expect(getStats(st).totalPeaces).toBe(1)
  })

  it('peace 不影响 war 计数', () => {
    st.recordEvent('war', 2)
    st.recordEvent('peace', 1)
    expect(getStats(st).totalWars).toBe(2)
  })

  it('war 不影响 peace 计数', () => {
    st.recordEvent('peace', 4)
    st.recordEvent('war', 1)
    expect(getStats(st).totalPeaces).toBe(4)
  })

  it('多种事件混合累计', () => {
    st.recordEvent('birth', 100)
    st.recordEvent('death', 40)
    st.recordEvent('war', 3)
    st.recordEvent('peace', 2)
    const s = getStats(st)
    expect(s.totalBirths).toBe(100)
    expect(s.totalDeaths).toBe(40)
    expect(s.totalWars).toBe(3)
    expect(s.totalPeaces).toBe(2)
  })
})

// ── 2. getPopulationHistory ────────────────────────────────────────────────

describe('StatisticsTracker.getPopulationHistory — 结构', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('初始只有 Total 序列', () => {
    const hist = st.getPopulationHistory()
    expect(hist).toHaveLength(1)
  })

  it('Total 序列 label 为 "Total"', () => {
    expect(st.getPopulationHistory()[0].label).toBe('Total')
  })

  it('Total 序列初始 data 为空数组', () => {
    expect(st.getPopulationHistory()[0].data).toHaveLength(0)
  })

  it('Total 序列 color 为 "#ffffff"', () => {
    expect(st.getPopulationHistory()[0].color).toBe('#ffffff')
  })

  it('每次调用返回新数组（引用不同）', () => {
    expect(st.getPopulationHistory()).not.toBe(st.getPopulationHistory())
  })

  it('注入 totalPopHistory 后数据点可见', () => {
    ;(st as any).totalPopHistory.push({ tick: 100, value: 50 })
    ;(st as any).totalPopHistory.push({ tick: 200, value: 80 })
    const hist = st.getPopulationHistory()
    expect(hist[0].data).toHaveLength(2)
    expect(hist[0].data[0].value).toBe(50)
    expect(hist[0].data[1].value).toBe(80)
  })

  it('注入一个文明后结果长度为 2', () => {
    ;(st as any).civPopHistory.set(1, { label: 'HK', color: '#f00', data: [] })
    expect(st.getPopulationHistory()).toHaveLength(2)
  })

  it('注入文明后 Total 仍是第一个', () => {
    ;(st as any).civPopHistory.set(1, { label: 'HK', color: '#f00', data: [] })
    expect(st.getPopulationHistory()[0].label).toBe('Total')
  })

  it('文明序列排在 Total 之后', () => {
    ;(st as any).civPopHistory.set(1, { label: 'Human Kingdom', color: '#ff0000', data: [{ tick: 100, value: 20 }] })
    const hist = st.getPopulationHistory()
    expect(hist[1].label).toBe('Human Kingdom')
    expect(hist[1].data[0].value).toBe(20)
  })

  it('多个文明均出现在结果中', () => {
    ;(st as any).civPopHistory.set(1, { label: 'A', color: '#f00', data: [] })
    ;(st as any).civPopHistory.set(2, { label: 'B', color: '#0f0', data: [] })
    expect(st.getPopulationHistory()).toHaveLength(3)
  })
})

// ── 3. getTerritoryHistory ─────────────────────────────────────────────────

describe('StatisticsTracker.getTerritoryHistory', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('初始无领土历史', () => {
    expect(st.getTerritoryHistory()).toHaveLength(0)
  })

  it('每次调用返回新数组', () => {
    expect(st.getTerritoryHistory()).not.toBe(st.getTerritoryHistory())
  })

  it('注入一个文明领土序列后长度为 1', () => {
    ;(st as any).civTerritoryHistory.set(2, { label: 'Elf Empire', color: '#0f0', data: [{ tick: 300, value: 15 }] })
    expect(st.getTerritoryHistory()).toHaveLength(1)
  })

  it('注入文明领土序列后 label 正确', () => {
    ;(st as any).civTerritoryHistory.set(2, { label: 'Elf Empire', color: '#0f0', data: [{ tick: 300, value: 15 }, { tick: 600, value: 25 }] })
    const hist = st.getTerritoryHistory()
    expect(hist[0].label).toBe('Elf Empire')
  })

  it('注入后数据值正确', () => {
    ;(st as any).civTerritoryHistory.set(2, { label: 'Elf Empire', color: '#0f0', data: [{ tick: 300, value: 15 }, { tick: 600, value: 25 }] })
    const hist = st.getTerritoryHistory()
    expect(hist[0].data[1].value).toBe(25)
  })

  it('注入两个文明领土序列后长度为 2', () => {
    ;(st as any).civTerritoryHistory.set(1, { label: 'A', color: '#f00', data: [] })
    ;(st as any).civTerritoryHistory.set(2, { label: 'B', color: '#0f0', data: [] })
    expect(st.getTerritoryHistory()).toHaveLength(2)
  })
})

// ── 4. getTechHistory ──────────────────────────────────────────────────────

describe('StatisticsTracker.getTechHistory', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('初始无科技历史', () => {
    expect(st.getTechHistory()).toHaveLength(0)
  })

  it('每次调用返回新数组', () => {
    expect(st.getTechHistory()).not.toBe(st.getTechHistory())
  })

  it('注入科技序列后可查询', () => {
    ;(st as any).civTechHistory.set(1, { label: 'Dwarf Clan', color: '#aaa', data: [{ tick: 100, value: 3 }] })
    const hist = st.getTechHistory()
    expect(hist).toHaveLength(1)
    expect(hist[0].data[0].value).toBe(3)
  })

  it('注入科技序列后 label 正确', () => {
    ;(st as any).civTechHistory.set(1, { label: 'Dwarf Clan', color: '#aaa', data: [] })
    expect(st.getTechHistory()[0].label).toBe('Dwarf Clan')
  })

  it('注入多个科技序列', () => {
    ;(st as any).civTechHistory.set(1, { label: 'A', color: '#f00', data: [] })
    ;(st as any).civTechHistory.set(2, { label: 'B', color: '#0f0', data: [] })
    expect(st.getTechHistory()).toHaveLength(2)
  })
})

// ── 5. peakPopulation 追踪 ─────────────────────────────────────────────────

describe('StatisticsTracker — peakPopulation 追踪', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('直接注入 peakPopulation 后私有字段反映', () => {
    ;(st as any).peakPopulation = 999
    expect(getStats(st).peakPopulation).toBe(999)
  })

  it('update 时超过当前峰值会更新 peakPopulation', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 500, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect(getStats(st).peakPopulation).toBe(500)
  })

  it('update 时不超过峰值不降低 peakPopulation', () => {
    ;(st as any).peakPopulation = 1000
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 200, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect(getStats(st).peakPopulation).toBe(1000)
  })

  it('多文明人口累加后更新峰值', () => {
    const cm = makeCivManager([
      { id: 1, name: 'A', color: '#f00', population: 300, territory: new Set(), techLevel: 1 },
      { id: 2, name: 'B', color: '#0f0', population: 400, territory: new Set(), techLevel: 1 },
    ])
    st.update(0, cm, makeEm())
    expect(getStats(st).peakPopulation).toBe(700)
  })
})

// ── 6. update — SAMPLE_INTERVAL 节流 ──────────────────────────────────────

describe('StatisticsTracker.update — SAMPLE_INTERVAL 节流', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < SAMPLE_INTERVAL(300) 时不更新 lastSampleTick', () => {
    const cm = makeCivManager([])
    ;(st as any).lastSampleTick = 0
    st.update(100, cm, makeEm())
    expect(getStats(st).lastSampleTick).toBe(0)
  })

  it('tick差值 >= SAMPLE_INTERVAL(300) 时更新 lastSampleTick', () => {
    const cm = makeCivManager([])
    ;(st as any).lastSampleTick = 0
    st.update(300, cm, makeEm())
    expect(getStats(st).lastSampleTick).toBe(300)
  })

  it('tick=299 时不触发采样', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    ;(st as any).lastSampleTick = 0
    st.update(299, cm, makeEm())
    expect((st as any).totalPopHistory).toHaveLength(0)
  })

  it('tick=300 时触发采样并记录数据', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    ;(st as any).lastSampleTick = 0
    st.update(300, cm, makeEm())
    expect((st as any).totalPopHistory).toHaveLength(1)
  })

  it('触发采样后再次差值不足不重复采样', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    ;(st as any).lastSampleTick = 0
    st.update(300, cm, makeEm())   // 触发
    st.update(400, cm, makeEm())   // 400-300=100 < 300，不触发
    expect((st as any).totalPopHistory).toHaveLength(1)
  })

  it('连续两次采样间隔 >= 300 时各记录一次', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    ;(st as any).lastSampleTick = 0
    st.update(300, cm, makeEm())
    st.update(600, cm, makeEm())
    expect((st as any).totalPopHistory).toHaveLength(2)
  })
})

// ── 7. update — pushPoint & MAX_SAMPLES 裁剪 ──────────────────────────────

describe('StatisticsTracker — pushPoint & MAX_SAMPLES(200) 裁剪', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('采样数 <= 200 时不裁剪', () => {
    const arr: DataPoint[] = (st as any).totalPopHistory
    for (let i = 0; i < 200; i++) arr.push({ tick: i, value: i })
    // pushPoint 内部：只有 arr.length > MAX_SAMPLES 才裁剪
    ;(st as any).pushPoint(arr, 201, 999)
    // 201 > 200 -> splice(0, 1) -> length stays at 200
    expect(arr.length).toBe(200)
    expect(arr[arr.length - 1].value).toBe(999)
  })

  it('采样数 < 200 时 pushPoint 只追加', () => {
    const arr: DataPoint[] = []
    ;(st as any).pushPoint(arr, 1, 42)
    expect(arr).toHaveLength(1)
    expect(arr[0].value).toBe(42)
  })

  it('超过 MAX_SAMPLES 后最旧数据被裁剪', () => {
    const arr: DataPoint[] = []
    for (let i = 0; i < 200; i++) arr.push({ tick: i, value: i })
    ;(st as any).pushPoint(arr, 200, 999)
    expect(arr).toHaveLength(200)
    expect(arr[0].tick).toBe(1)  // 旧 tick=0 已被裁剪
    expect(arr[arr.length - 1].value).toBe(999)
  })
})

// ── 8. update — 按文明采样 & pruneDeadCivs ───────────────────────────────

describe('StatisticsTracker.update — 文明采样', () => {
  let st: StatisticsTracker
  beforeEach(() => { st = makeST() })
  afterEach(() => vi.restoreAllMocks())

  it('有文明时文明人口序列被创建', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect((st as any).civPopHistory.has(1)).toBe(true)
  })

  it('有文明时文明领土序列被创建', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set([1, 2]), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect((st as any).civTerritoryHistory.has(1)).toBe(true)
  })

  it('有文明时文明科技序列被创建', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 3 }])
    st.update(0, cm, makeEm())
    expect((st as any).civTechHistory.has(1)).toBe(true)
  })

  it('采样时文明 label 使用 civ.name', () => {
    const cm = makeCivManager([{ id: 1, name: 'Human Kingdom', color: '#f00', population: 50, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect((st as any).civPopHistory.get(1).label).toBe('Human Kingdom')
  })

  it('采样时文明 color 正确', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#abcdef', population: 50, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    expect((st as any).civPopHistory.get(1).color).toBe('#abcdef')
  })

  it('采样时文明领土 size 正确记录', () => {
    const terr = new Set([1, 2, 3])
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 50, territory: terr, techLevel: 1 }])
    st.update(0, cm, makeEm())
    const data: DataPoint[] = (st as any).civTerritoryHistory.get(1).data
    expect(data[0].value).toBe(3)
  })

  it('采样时文明 techLevel 正确记录', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 50, territory: new Set(), techLevel: 5 }])
    st.update(0, cm, makeEm())
    const data: DataPoint[] = (st as any).civTechHistory.get(1).data
    expect(data[0].value).toBe(5)
  })

  it('文明消失后 pruneDeadCivs 清除三个历史记录', () => {
    // 第一次采样：civId=1 存在
    const cm1 = makeCivManager([{ id: 1, name: 'A', color: '#f00', population: 100, territory: new Set(), techLevel: 1 }])
    st.update(0, cm1, makeEm())
    // 第二次采样：civId=1 不再存在
    const cm2 = makeCivManager([])
    ;(st as any).lastSampleTick = 0
    st.update(300, cm2, makeEm())
    expect((st as any).civPopHistory.has(1)).toBe(false)
    expect((st as any).civTerritoryHistory.has(1)).toBe(false)
    expect((st as any).civTechHistory.has(1)).toBe(false)
  })

  it('文明名称更新后 label 也随之更新', () => {
    const cm = makeCivManager([{ id: 1, name: 'Old Name', color: '#f00', population: 50, territory: new Set(), techLevel: 1 }])
    st.update(0, cm, makeEm())
    // 模拟文明改名
    cm.civilizations.get(1).name = 'New Name'
    ;(st as any).lastSampleTick = 0
    st.update(300, cm, makeEm())
    expect((st as any).civPopHistory.get(1).label).toBe('New Name')
  })

  it('无文明时 totalPopHistory 数据值为 0', () => {
    const cm = makeCivManager([])
    st.update(0, cm, makeEm())
    expect((st as any).totalPopHistory[0].value).toBe(0)
  })
})
