import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EraTransitionSystem } from '../systems/EraTransitionSystem'
import type { HistoryEntry, CivPopSample, EraName } from '../systems/EraTransitionSystem'

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

function makePopSample(tick: number, data: Record<string, number> = { human: 10 }): CivPopSample {
  return { tick, populations: new Map(Object.entries(data)) }
}

// ── triggerTransition / isTransitioning ───────────────────────────────────────

describe('EraTransitionSystem.triggerTransition', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始状态 isTransitioning() ��回 false', () => {
    expect(ets.isTransitioning()).toBe(false)
  })

  it('触发纪元转换后 isTransitioning() 返回 true', () => {
    ets.triggerTransition('stone', 'bronze', '文明进入青铜时代')
    expect(ets.isTransitioning()).toBe(true)
  })

  it('update 推进到 180 tick 后转换结束', () => {
    ets.triggerTransition('stone', 'iron', '跨越时代')
    for (let i = 0; i < 179; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(true)
    ets.update(179)
    expect(ets.isTransitioning()).toBe(false)
  })

  it('可以多次触发转换', () => {
    ets.triggerTransition('stone', 'bronze', '第一次')
    for (let i = 0; i < 180; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(false)
    ets.triggerTransition('bronze', 'iron', '第二次')
    expect(ets.isTransitioning()).toBe(true)
  })

  it('未触发转换时 update 不影响 isTransitioning', () => {
    ets.update(0)
    ets.update(1)
    expect(ets.isTransitioning()).toBe(false)
  })

  it('恰好推进 179 次仍在转换中', () => {
    ets.triggerTransition('iron', 'medieval', '铁器到中世纪')
    for (let i = 0; i < 179; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(true)
  })

  it('推进 180 次后精确结束', () => {
    ets.triggerTransition('medieval', 'renaissance', '中世纪到文艺复兴')
    for (let i = 0; i < 180; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(false)
  })

  it('触发后立即再触发会重置计时器', () => {
    ets.triggerTransition('stone', 'bronze', '第一次')
    for (let i = 0; i < 100; i++) ets.update(i)
    // 再次触发重置
    ets.triggerTransition('bronze', 'iron', '第二次')
    // 重新走 179 tick 仍在转换中
    for (let i = 0; i < 179; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(true)
  })

  it('所有 EraName 组合均不抛出异常', () => {
    const eras: EraName[] = ['stone', 'bronze', 'iron', 'medieval', 'renaissance', 'industrial']
    for (const from of eras) {
      for (const to of eras) {
        expect(() => ets.triggerTransition(from, to, '测试')).not.toThrow()
      }
    }
  })

  it('转换结束后再 update 不影响状态', () => {
    ets.triggerTransition('stone', 'bronze', '触发')
    for (let i = 0; i < 200; i++) ets.update(i)
    expect(ets.isTransitioning()).toBe(false)
    ets.update(201)
    expect(ets.isTransitioning()).toBe(false)
  })

  it('triggerTransition 接受相同 from/to era', () => {
    expect(() => ets.triggerTransition('stone', 'stone', '自转换')).not.toThrow()
    expect(ets.isTransitioning()).toBe(true)
  })
})

// ── addHistoryEntry / getHistory ──────────────────────────────────────────────

describe('EraTransitionSystem.addHistoryEntry', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

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
    expect(history[0].tick).toBe(1)
    expect(history[99].tick).toBe(100)
  })

  it('恰好 100 条时不丢弃', () => {
    for (let i = 0; i < 100; i++) ets.addHistoryEntry(makeEntry(i))
    expect(ets.getHistory()).toHaveLength(100)
    expect(ets.getHistory()[0].tick).toBe(0)
  })

  it('getHistory 返回数组类型', () => {
    expect(Array.isArray(ets.getHistory())).toBe(true)
  })

  it('支持所有 HistoryEntry.type 枚举值', () => {
    const types: HistoryEntry['type'][] = ['era_change', 'war', 'civ_fall', 'wonder', 'hero_born']
    types.forEach((type, i) => ets.addHistoryEntry(makeEntry(i, { type })))
    expect(ets.getHistory().map((h: any) => h.type)).toEqual(types)
  })

  it('addHistoryEntry 自动计算 tickStr', () => {
    ets.addHistoryEntry(makeEntry(42))
    expect(ets.getHistory()[0].tickStr).toBe('T:42')
  })

  it('addHistoryEntry 短描述不截断 descShort', () => {
    ets.addHistoryEntry(makeEntry(1, { description: '短描述' }))
    expect(ets.getHistory()[0].descShort).toBe('短描述')
  })

  it('addHistoryEntry 长描述截断到 20 字符 + ...', () => {
    const longDesc = '123456789012345678901234' // 24 chars
    ets.addHistoryEntry(makeEntry(1, { description: longDesc }))
    const entry = ets.getHistory()[0]
    expect(entry.descShort).toBe('12345678901234567890...')
  })

  it('已有 tickStr 时不覆盖', () => {
    const entry = makeEntry(5, { tickStr: 'CUSTOM:5' })
    ets.addHistoryEntry(entry)
    expect(ets.getHistory()[0].tickStr).toBe('CUSTOM:5')
  })

  it('已有 descShort 时不覆盖', () => {
    const entry = makeEntry(5, { description: '很长的描述文字超过20字符测试', descShort: '自定义摘要' })
    ets.addHistoryEntry(entry)
    expect(ets.getHistory()[0].descShort).toBe('自定义摘要')
  })

  it('添加 200 条记录后最终保持 100 条上限', () => {
    for (let i = 0; i < 200; i++) ets.addHistoryEntry(makeEntry(i))
    expect(ets.getHistory()).toHaveLength(100)
    expect(ets.getHistory()[0].tick).toBe(100)
    expect(ets.getHistory()[99].tick).toBe(199)
  })

  it('icon 字段正确保存', () => {
    ets.addHistoryEntry(makeEntry(1, { icon: '🌟' }))
    expect(ets.getHistory()[0].icon).toBe('🌟')
  })

  it('wonder 类型事件可以添加', () => {
    ets.addHistoryEntry(makeEntry(10, { type: 'wonder', description: '奇迹建成', icon: '🏛️' }))
    const h = ets.getHistory()
    expect(h[0].type).toBe('wonder')
  })

  it('连续添加同 tick 的多条记录均保留', () => {
    ets.addHistoryEntry(makeEntry(100, { type: 'war' }))
    ets.addHistoryEntry(makeEntry(100, { type: 'hero_born' }))
    expect(ets.getHistory()).toHaveLength(2)
  })
})

// ── addPopulationSample ───────────────────────────────────────────────────────

describe('EraTransitionSystem.addPopulationSample', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

  it('添加人口采样后状态正确（内部不崩溃）', () => {
    const sample: CivPopSample = {
      tick: 100,
      populations: new Map([['human', 50], ['elf', 30]]),
    }
    expect(() => ets.addPopulationSample(sample)).not.toThrow()
  })

  it('超出 200 条上限时仍不崩溃', () => {
    for (let i = 0; i < 202; i++) {
      ets.addPopulationSample(makePopSample(i, { human: i }))
    }
  })

  it('addPopulationSample 自动计算 tickStr', () => {
    ets.addPopulationSample(makePopSample(77))
    const samples = (ets as any).popSamples
    expect(samples[0].tickStr).toBe('T:77')
  })

  it('已有 tickStr 时不覆盖', () => {
    const sample: CivPopSample = { tick: 5, populations: new Map(), tickStr: 'CUSTOM' }
    ets.addPopulationSample(sample)
    expect((ets as any).popSamples[0].tickStr).toBe('CUSTOM')
  })

  it('popSamples 容量上限 200 — 第 201 条后保持 200', () => {
    for (let i = 0; i < 201; i++) ets.addPopulationSample(makePopSample(i))
    const samples = (ets as any).popSamples
    expect(samples.length).toBe(200)
  })

  it('popSamples 丢弃后最旧 tick 递增', () => {
    for (let i = 0; i < 202; i++) ets.addPopulationSample(makePopSample(i))
    const samples = (ets as any).popSamples
    expect(samples[0].tick).toBe(2)
    expect(samples[samples.length - 1].tick).toBe(201)
  })

  it('空 populations Map 不崩溃', () => {
    expect(() => ets.addPopulationSample({ tick: 1, populations: new Map() })).not.toThrow()
  })

  it('多文明 populations 均可保存', () => {
    ets.addPopulationSample({
      tick: 10,
      populations: new Map([['human', 100], ['elf', 80], ['dwarf', 60], ['orc', 40]]),
    })
    const samples = (ets as any).popSamples
    expect(samples[0].populations.get('elf')).toBe(80)
  })
})

// ── toggle 互斥开关 ────────────────────────────────────────────────────────────

describe('EraTransitionSystem toggle visibility', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

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

  it('toggleHistory 开启后 historyVisible 为 true', () => {
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(true)
  })

  it('toggleHistory 两次后 historyVisible 回 false', () => {
    ets.toggleHistory()
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(false)
  })

  it('toggleHistory 开启时 chartVisible 关闭（互斥��', () => {
    ets.togglePopulationChart()
    expect((ets as any).chartVisible).toBe(true)
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(true)
    expect((ets as any).chartVisible).toBe(false)
  })

  it('toggleHistory 开启时 techVisible 关闭（互斥）', () => {
    ets.toggleTechPreview()
    expect((ets as any).techVisible).toBe(true)
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(true)
    expect((ets as any).techVisible).toBe(false)
  })

  it('togglePopulationChart 开启时 historyVisible 关闭（互斥）', () => {
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(true)
    ets.togglePopulationChart()
    expect((ets as any).chartVisible).toBe(true)
    expect((ets as any).historyVisible).toBe(false)
  })

  it('togglePopulationChart 开启时 techVisible 关闭（互斥）', () => {
    ets.toggleTechPreview()
    expect((ets as any).techVisible).toBe(true)
    ets.togglePopulationChart()
    expect((ets as any).chartVisible).toBe(true)
    expect((ets as any).techVisible).toBe(false)
  })

  it('toggleTechPreview 开启时 historyVisible 关闭（互斥）', () => {
    ets.toggleHistory()
    expect((ets as any).historyVisible).toBe(true)
    ets.toggleTechPreview()
    expect((ets as any).techVisible).toBe(true)
    expect((ets as any).historyVisible).toBe(false)
  })

  it('toggleTechPreview 开启时 chartVisible 关闭（互斥）', () => {
    ets.togglePopulationChart()
    expect((ets as any).chartVisible).toBe(true)
    ets.toggleTechPreview()
    expect((ets as any).techVisible).toBe(true)
    expect((ets as any).chartVisible).toBe(false)
  })

  it('初始三个 visible 均为 false', () => {
    expect((ets as any).historyVisible).toBe(false)
    expect((ets as any).chartVisible).toBe(false)
    expect((ets as any).techVisible).toBe(false)
  })
})

// ── setTechData ───────────────────────────────────────────────────────────────

describe('EraTransitionSystem.setTechData', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 techs 为空数组', () => {
    expect((ets as any).techs).toHaveLength(0)
  })

  it('setTechData 设置多个科技后长度正确', () => {
    ets.setTechData([
      { name: 'A', researched: false, progress: 0 },
      { name: 'B', researched: true, progress: 1 },
    ])
    expect((ets as any).techs).toHaveLength(2)
  })

  it('setTechData 科技名正确', () => {
    ets.setTechData([{ name: 'Writing', researched: false, progress: 0.3 }])
    expect((ets as any).techs[0].name).toBe('Writing')
  })

  it('setTechData researched 字段正确', () => {
    ets.setTechData([{ name: 'X', researched: true, progress: 1 }])
    expect((ets as any).techs[0].researched).toBe(true)
  })

  it('setTechData progress 字段正确', () => {
    ets.setTechData([{ name: 'X', researched: false, progress: 0.75 }])
    expect((ets as any).techs[0].progress).toBe(0.75)
  })

  it('setTechData 计算 progressStr 百分比（75%）', () => {
    ets.setTechData([{ name: 'X', researched: false, progress: 0.75 }])
    expect((ets as any).techs[0].progressStr).toBe('75%')
  })

  it('setTechData 计算 progressStr 百分比（0%）', () => {
    ets.setTechData([{ name: 'X', researched: false, progress: 0 }])
    expect((ets as any).techs[0].progressStr).toBe('0%')
  })

  it('setTechData 计算 progressStr 百分比（100%）', () => {
    ets.setTechData([{ name: 'X', researched: true, progress: 1 }])
    expect((ets as any).techs[0].progressStr).toBe('100%')
  })

  it('setTechData 覆盖更新：第二次调用后使用新数据', () => {
    ets.setTechData([{ name: 'Old', researched: false, progress: 0.1 }])
    ets.setTechData([
      { name: 'New1', researched: true, progress: 1 },
      { name: 'New2', researched: false, progress: 0.5 },
    ])
    const techs = (ets as any).techs
    expect(techs).toHaveLength(2)
    expect(techs[0].name).toBe('New1')
    expect(techs[1].name).toBe('New2')
  })

  it('setTechData 缩减数量时 techs 长度减少', () => {
    ets.setTechData([{ name: 'A', researched: false, progress: 0 }, { name: 'B', researched: false, progress: 0 }])
    ets.setTechData([{ name: 'C', researched: false, progress: 0 }])
    expect((ets as any).techs).toHaveLength(1)
  })

  it('setTechData 空数组后 techs 为空', () => {
    ets.setTechData([{ name: 'A', researched: false, progress: 0 }])
    ets.setTechData([])
    expect((ets as any).techs).toHaveLength(0)
  })

  it('setTechData progress=0.333 时 progressStr 四舍五入为 33%', () => {
    ets.setTechData([{ name: 'X', researched: false, progress: 0.333 }])
    expect((ets as any).techs[0].progressStr).toBe('33%')
  })

  it('setTechData progress=0.999 时 progressStr 四舍五入为 100%', () => {
    ets.setTechData([{ name: 'X', researched: false, progress: 0.999 }])
    expect((ets as any).techs[0].progressStr).toBe('100%')
  })
})

// ── update 内部字段 ───────────────────────────────────────────────────────────

describe('EraTransitionSystem.update 内部字段', () => {
  let ets: EraTransitionSystem

  beforeEach(() => { ets = makeETS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 transitionTick 为 0', () => {
    expect((ets as any).transitionTick).toBe(0)
  })

  it('触发转换后 transitionTick 从 0 开始计数', () => {
    ets.triggerTransition('stone', 'bronze', '测试')
    expect((ets as any).transitionTick).toBe(0)
    ets.update(0)
    expect((ets as any).transitionTick).toBe(1)
  })

  it('未激活转换时 update 不改变 transitionTick', () => {
    ets.update(0)
    expect((ets as any).transitionTick).toBe(0)
  })

  it('fromEra 和 toEra 被正确记录', () => {
    ets.triggerTransition('bronze', 'medieval', '跨越')
    expect((ets as any).fromEra).toBe('bronze')
    expect((ets as any).toEra).toBe('medieval')
  })

  it('eraDescription 被正确记录', () => {
    ets.triggerTransition('stone', 'bronze', '伟大的转变')
    expect((ets as any).eraDescription).toBe('伟大的转变')
  })

  it('transitionActive 初始为 false', () => {
    expect((ets as any).transitionActive).toBe(false)
  })

  it('触发后 transitionActive 变为 true', () => {
    ets.triggerTransition('stone', 'bronze', '')
    expect((ets as any).transitionActive).toBe(true)
  })

  it('结束后 transitionActive 变为 false', () => {
    ets.triggerTransition('stone', 'bronze', '')
    for (let i = 0; i < 180; i++) ets.update(i)
    expect((ets as any).transitionActive).toBe(false)
  })
})
