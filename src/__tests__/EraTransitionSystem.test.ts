import { describe, it, expect, beforeEach } from 'vitest'
import { EraTransitionSystem } from '../systems/EraTransitionSystem'
import type { HistoryEntry, CivPopSample } from '../systems/EraTransitionSystem'

// EraTransitionSystem 的纯状态逻辑测试：
// - triggerTransition / isTransitioning / update（计时器推进）
// - addHistoryEntry / getHistory（含容量上限 100）
// - addPopulationSample（含容量上限 200）
// - toggleHistory / togglePopulationChart / toggleTechPreview（互斥开关）

function makeETS(): EraTransitionSystem {
  return new EraTransitionSystem()
}

function makeEntry(tick: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    tick,
    type: 'era_change',
    description: `Event at tick ${tick}`,
    icon: '⚔️',
    ...overrides,
  }
}

// ── triggerTransition / isTransitioning ───────────────────────────────────────

describe('EraTransitionSystem.triggerTransition', () => {
  let ets: EraTransitionSystem

  beforeEach(() => {
    ets = makeETS()
  })

  it('初始状态 isTransitioning() 返回 false', () => {
    expect(ets.isTransitioning()).toBe(false)
  })

  it('触发纪元转换后 isTransitioning() 返回 true', () => {
    ets.triggerTransition('stone', 'bronze', '文明进入青铜时代')
    expect(ets.isTransitioning()).toBe(true)
  })

  it('update 推进到 180 tick 后转换结束', () => {
    ets.triggerTransition('stone', 'iron', '跨越时代')
    // 推进 179 次，应该还在转换中
    for (let i = 0; i < 179; i++) {
      ets.update(i)
    }
    expect(ets.isTransitioning()).toBe(true)
    // 第 180 次后，转换结束
    ets.update(179)
    expect(ets.isTransitioning()).toBe(false)
  })

  it('可以多次触发转换', () => {
    ets.triggerTransition('stone', 'bronze', '第一次')
    // 推进到结束
    for (let i = 0; i < 180; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(false)

    // 再次触发
    ets.triggerTransition('bronze', 'iron', '第二次')
    expect(ets.isTransitioning()).toBe(true)
  })

  it('未触发转换时 update 不影响 isTransitioning', () => {
    ets.update(0)
    ets.update(1)
    expect(ets.isTransitioning()).toBe(false)
  })
})

// ── addHistoryEntry / getHistory ──────────────────────────────────────────────

describe('EraTransitionSystem.addHistoryEntry', () => {
  let ets: EraTransitionSystem

  beforeEach(() => {
    ets = makeETS()
  })

  it('初始历史记录为空', () => {
    expect(ets.getHistory()).toHaveLength(0)
  })

  it('添加一条记录后可查询到', () => {
    ets.addHistoryEntry(makeEntry(10, { type: 'war', description: '大战开始' }))
    const history = ets.getHistory()
    expect(history).toHaveLength(1)
    expect(history[0].tick).toBe(10)
    expect(history[0].type).toBe('war')
    expect(history[0].description).toBe('大战开始')
  })

  it('多条记录都能查询到', () => {
    ets.addHistoryEntry(makeEntry(1))
    ets.addHistoryEntry(makeEntry(2, { type: 'hero_born' }))
    ets.addHistoryEntry(makeEntry(3, { type: 'civ_fall' }))
    expect(ets.getHistory()).toHaveLength(3)
  })

  it('超出 100 条上限时自动丢弃最老条目', () => {
    for (let i = 0; i < 101; i++) {
      ets.addHistoryEntry(makeEntry(i, { description: `Event ${i}` }))
    }
    const history = ets.getHistory()
    expect(history).toHaveLength(100)
    // 第 0 条被移除，最早的是 tick=1
    expect(history[0].tick).toBe(1)
    expect(history[99].tick).toBe(100)
  })

  it('恰好 100 条时不丢弃', () => {
    for (let i = 0; i < 100; i++) {
      ets.addHistoryEntry(makeEntry(i))
    }
    expect(ets.getHistory()).toHaveLength(100)
    // 第 0 条仍在
    expect(ets.getHistory()[0].tick).toBe(0)
  })

  it('getHistory 返回数组类型', () => {
    expect(Array.isArray(ets.getHistory())).toBe(true)
  })

  it('支持所有 HistoryEntry.type 枚举值', () => {
    const types: HistoryEntry['type'][] = ['era_change', 'war', 'civ_fall', 'wonder', 'hero_born']
    types.forEach((type, i) => {
      ets.addHistoryEntry(makeEntry(i, { type }))
    })
    const history = ets.getHistory()
    expect(history.map(h => h.type)).toEqual(types)
  })
})

// ── addPopulationSample ───────────────────────────────────────────────────────

describe('EraTransitionSystem.addPopulationSample', () => {
  let ets: EraTransitionSystem

  beforeEach(() => {
    ets = makeETS()
  })

  it('添加人口采样后状态正确（内部不崩溃）', () => {
    const sample: CivPopSample = {
      tick: 100,
      populations: new Map([['human', 50], ['elf', 30]]),
    }
    // 只需验证不抛出异常
    expect(() => ets.addPopulationSample(sample)).not.toThrow()
  })

  it('超出 200 条上限时仍不崩溃', () => {
    for (let i = 0; i < 202; i++) {
      ets.addPopulationSample({
        tick: i,
        populations: new Map([['human', i]]),
      })
    }
    // 只要不崩溃即可（内部字段是 private，无法直接断言长度）
  })
})

// ── toggle 互斥开关 ────────────────────────────────────────────────────────────

describe('EraTransitionSystem toggle visibility', () => {
  let ets: EraTransitionSystem

  beforeEach(() => {
    ets = makeETS()
  })

  it('toggleHistory 不抛出异常（两次切换）', () => {
    expect(() => {
      ets.toggleHistory()
      ets.toggleHistory()
    }).not.toThrow()
  })

  it('togglePopulationChart 不抛出异常', () => {
    expect(() => {
      ets.togglePopulationChart()
      ets.togglePopulationChart()
    }).not.toThrow()
  })

  it('toggleTechPreview 不抛出异常', () => {
    expect(() => {
      ets.toggleTechPreview()
      ets.toggleTechPreview()
    }).not.toThrow()
  })

  it('setTechData 不抛出异常', () => {
    expect(() => {
      ets.setTechData([
        { name: 'Agriculture', researched: true, progress: 1.0 },
        { name: 'Writing', researched: false, progress: 0.4 },
      ])
    }).not.toThrow()
  })
})
