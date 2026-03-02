import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TimelineSystem } from '../systems/TimelineSystem'
import type { HistoricalEvent } from '../systems/TimelineSystem'

function makeSys(): TimelineSystem { return new TimelineSystem() }

function makeEvent(type: HistoricalEvent['type'] = 'war', tick = 100): HistoricalEvent {
  return { tick, era: 'Bronze Age', type, description: 'A test event' }
}

// ERA tick thresholds（与源码同步）
const ERA_TICKS = {
  DAWN:        0,
  TRIBAL:   7200,
  BRONZE:  21600,
  IRON:    43200,
  CLASSICAL: 72000,
  MEDIEVAL: 108000,
  RENAISSANCE: 162000,
  MODERN:  252000,
}

describe('TimelineSystem — 构造器初始状态', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 history 长度为 1（预置 Dawn Age 事件）', () => {
    expect(sys.getHistory()).toHaveLength(1)
  })
  it('预置事件 type 为 era_change', () => {
    expect(sys.getHistory()[0].type).toBe('era_change')
  })
  it('预置事件 era 为 Dawn Age', () => {
    expect(sys.getHistory()[0].era).toBe('Dawn Age')
  })
  it('预置事件 tick 为 0', () => {
    expect(sys.getHistory()[0].tick).toBe(0)
  })
  it('预置事件 description 非空', () => {
    expect(sys.getHistory()[0].description.length).toBeGreaterThan(0)
  })
  it('初始 currentEraIndex 为 0', () => {
    expect((sys as any).currentEraIndex).toBe(0)
  })
  it('初始 maxEvents 为 200', () => {
    expect((sys as any).maxEvents).toBe(200)
  })
  it('getHistory() 返回同一数组引用', () => {
    expect(sys.getHistory()).toBe(sys.getHistory())
  })
})

describe('TimelineSystem — getEraDefinitions()', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('返回数组长度 >= 5', () => {
    expect(sys.getEraDefinitions().length).toBeGreaterThanOrEqual(5)
  })
  it('返回数组长度为 8', () => {
    expect(sys.getEraDefinitions().length).toBe(8)
  })
  it('第一个时代是 Dawn Age', () => {
    expect(sys.getEraDefinitions()[0].name).toBe('Dawn Age')
  })
  it('最后一个时代是 Modern Age', () => {
    const defs = sys.getEraDefinitions()
    expect(defs[defs.length - 1].name).toBe('Modern Age')
  })
  it('每个时代都有 name 字段', () => {
    for (const def of sys.getEraDefinitions()) {
      expect(def).toHaveProperty('name')
    }
  })
  it('每个时代都有 tickThreshold 字段', () => {
    for (const def of sys.getEraDefinitions()) {
      expect(def).toHaveProperty('tickThreshold')
    }
  })
  it('每个时代都有 color 字段', () => {
    for (const def of sys.getEraDefinitions()) {
      expect(def).toHaveProperty('color')
    }
  })
  it('tickThreshold 单调递增', () => {
    const defs = sys.getEraDefinitions()
    for (let i = 1; i < defs.length; i++) {
      expect(defs[i].tickThreshold).toBeGreaterThan(defs[i - 1].tickThreshold)
    }
  })
  it('Dawn Age tickThreshold 为 0', () => {
    expect(sys.getEraDefinitions()[0].tickThreshold).toBe(0)
  })
  it('Tribal Age tickThreshold 为 7200', () => {
    expect(sys.getEraDefinitions()[1].tickThreshold).toBe(ERA_TICKS.TRIBAL)
  })
  it('Bronze Age tickThreshold 为 21600', () => {
    expect(sys.getEraDefinitions()[2].tickThreshold).toBe(ERA_TICKS.BRONZE)
  })
  it('color 字段以 # 开头', () => {
    for (const def of sys.getEraDefinitions()) {
      expect(def.color).toMatch(/^#/)
    }
  })
})

describe('TimelineSystem — getCurrentEra()', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始时代名称为 Dawn Age', () => {
    expect(sys.getCurrentEra().name).toBe('Dawn Age')
  })
  it('初始时代 index 为 0', () => {
    expect(sys.getCurrentEra().index).toBe(0)
  })
  it('返回对象有 name/color/index 字段', () => {
    const era = sys.getCurrentEra()
    expect(era).toHaveProperty('name')
    expect(era).toHaveProperty('color')
    expect(era).toHaveProperty('index')
  })
  it('返回同一对象引用（缓存优化）', () => {
    const e1 = sys.getCurrentEra()
    const e2 = sys.getCurrentEra()
    expect(e1).toBe(e2)
  })
  it('update 到 Tribal Age 后 getCurrentEra 更新', () => {
    sys.update(ERA_TICKS.TRIBAL)
    expect(sys.getCurrentEra().name).toBe('Tribal Age')
  })
  it('update 到 Bronze Age 后 getCurrentEra 更新', () => {
    // update() 每次只推进一个时代，需调用两次才能 Dawn->Tribal->Bronze
    sys.update(ERA_TICKS.BRONZE)
    sys.update(ERA_TICKS.BRONZE)
    expect(sys.getCurrentEra().name).toBe('Bronze Age')
  })
  it('update 到 Iron Age 后 index 为 3', () => {
    // Dawn(0)->Tribal(1)->Bronze(2)->Iron(3)，需调用 3 次
    sys.update(ERA_TICKS.IRON)
    sys.update(ERA_TICKS.IRON)
    sys.update(ERA_TICKS.IRON)
    expect(sys.getCurrentEra().index).toBe(3)
  })
  it('update 到 Modern Age 后 index 为 7', () => {
    // 从 index 0 推进到 7，需调用 7 次
    for (let i = 0; i < 7; i++) {
      sys.update(ERA_TICKS.MODERN)
    }
    expect(sys.getCurrentEra().index).toBe(7)
  })
})

describe('TimelineSystem — getEraProgress()', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 时进度 >= 0', () => {
    expect(sys.getEraProgress(0)).toBeGreaterThanOrEqual(0)
  })
  it('tick=0 时进度为 0', () => {
    expect(sys.getEraProgress(0)).toBe(0)
  })
  it('返回 [0, 1] 区间内的值 (tick=5000)', () => {
    const p = sys.getEraProgress(5000)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
  it('tick = Tribal Age threshold 时进度为 1', () => {
    // 当前在 Dawn Age，Tribal Age 开始时进度满
    expect(sys.getEraProgress(ERA_TICKS.TRIBAL)).toBe(1)
  })
  it('tick > Tribal Age threshold 时进度不超过 1', () => {
    expect(sys.getEraProgress(ERA_TICKS.TRIBAL + 100)).toBeLessThanOrEqual(1)
  })
  it('中间 tick 进度介于 0 和 1 之间', () => {
    const mid = ERA_TICKS.TRIBAL / 2
    const p = sys.getEraProgress(mid)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })
  it('最后一个时代时进度返回 1.0', () => {
    sys.update(ERA_TICKS.MODERN)
    expect(sys.getEraProgress(ERA_TICKS.MODERN + 999999)).toBe(1.0)
  })
  it('进度随 tick 增大而增大（单调）', () => {
    const p1 = sys.getEraProgress(1000)
    const p2 = sys.getEraProgress(3000)
    expect(p2).toBeGreaterThanOrEqual(p1)
  })
})

describe('TimelineSystem — recordEvent()', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('recordEvent 后 history 长度增加', () => {
    const before = sys.getHistory().length
    sys.recordEvent(100, 'war', 'A war started')
    expect(sys.getHistory().length).toBe(before + 1)
  })
  it('记录的事件 type 正确', () => {
    sys.recordEvent(200, 'disaster', 'A flood')
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.type).toBe('disaster')
  })
  it('记录的事件 description 正确', () => {
    sys.recordEvent(300, 'achievement', 'First city')
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.description).toBe('First city')
  })
  it('记录的事件 tick 正确', () => {
    sys.recordEvent(500, 'founding', 'New civilization')
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.tick).toBe(500)
  })
  it('记录的事件 era 来自当前时代', () => {
    sys.recordEvent(100, 'war', 'test')
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.era).toBe('Dawn Age')
  })
  it('支持所有 6 种事件类型', () => {
    const types: HistoricalEvent['type'][] = ['era_change', 'war', 'disaster', 'achievement', 'founding', 'collapse']
    for (const t of types) {
      sys.recordEvent(100, t, `Event of type ${t}`)
    }
    const history = sys.getHistory()
    // 1 预置 + 6 记录
    expect(history.length).toBe(7)
  })
  it('超过 maxEvents 时最旧事件被移除', () => {
    const maxEvents: number = (sys as any).maxEvents
    for (let i = 0; i < maxEvents + 5; i++) {
      sys.recordEvent(i, 'war', `event ${i}`)
    }
    expect(sys.getHistory().length).toBeLessThanOrEqual(maxEvents)
  })
  it('collapse 事件可以记录', () => {
    sys.recordEvent(999, 'collapse', 'Civilization fell')
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.type).toBe('collapse')
  })
})

describe('TimelineSystem — update() 时代进阶', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update(0) 不崩溃', () => {
    expect(() => sys.update(0)).not.toThrow()
  })
  it('update 到 Tribal Age 阈值时 history 增加 era_change 事件', () => {
    const before = sys.getHistory().length
    sys.update(ERA_TICKS.TRIBAL)
    expect(sys.getHistory().length).toBe(before + 1)
    expect(sys.getHistory()[sys.getHistory().length - 1].type).toBe('era_change')
  })
  it('update 到 Bronze Age 阈值时 era 为 Bronze Age', () => {
    // update() 每次只推进一个时代：先进入 Tribal，再进入 Bronze
    sys.update(ERA_TICKS.BRONZE)  // Dawn -> Tribal
    sys.update(ERA_TICKS.BRONZE)  // Tribal -> Bronze
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.era).toBe('Bronze Age')
  })
  it('update 多次在同一时代不重复添加 era_change', () => {
    sys.update(ERA_TICKS.TRIBAL)
    const countAfterFirst = sys.getHistory().filter(e => e.type === 'era_change').length
    sys.update(ERA_TICKS.TRIBAL + 100)
    const countAfterSecond = sys.getHistory().filter(e => e.type === 'era_change').length
    expect(countAfterSecond).toBe(countAfterFirst)
  })
  it('从 Dawn 一次跳到 Iron Age 只记录下一个时代（Tribal）', () => {
    const before = sys.getHistory().length
    sys.update(ERA_TICKS.IRON)
    // update 每次只推进一个时代
    expect(sys.getHistory().length).toBe(before + 1)
    expect(sys.getHistory()[sys.getHistory().length - 1].era).toBe('Tribal Age')
  })
  it('到达最后时代后 update 不再添加事件', () => {
    // 快速推进到最后时代
    const defs = sys.getEraDefinitions()
    for (let i = 0; i < defs.length; i++) {
      sys.update(defs[defs.length - 1].tickThreshold)
    }
    const countBefore = sys.getHistory().length
    sys.update(defs[defs.length - 1].tickThreshold + 100000)
    expect(sys.getHistory().length).toBe(countBefore)
  })
  it('时代变化的事件 description 包含新时代名称', () => {
    sys.update(ERA_TICKS.TRIBAL)
    const last = sys.getHistory()[sys.getHistory().length - 1]
    expect(last.description).toContain('Tribal Age')
  })
})

describe('TimelineSystem — getWorldAge()', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick < 3600 时返回 Year 0', () => {
    expect(sys.getWorldAge(0)).toBe('Year 0')
    expect(sys.getWorldAge(3599)).toBe('Year 0')
  })
  it('tick = 3600 时返回 Year 1', () => {
    expect(sys.getWorldAge(3600)).toBe('Year 1')
  })
  it('tick = 7200 时返回 Year 2', () => {
    expect(sys.getWorldAge(7200)).toBe('Year 2')
  })
  it('tick = 36000 时返回 Year 10', () => {
    expect(sys.getWorldAge(36000)).toBe('Year 10')
  })
  it('返回格式以 Year 开头', () => {
    expect(sys.getWorldAge(100000)).toMatch(/^Year \d+$/)
  })
  it('getWorldAge 是纯计算，不修改状态', () => {
    const hist1 = sys.getHistory().length
    sys.getWorldAge(999999)
    expect(sys.getHistory().length).toBe(hist1)
  })
})

describe('TimelineSystem — 事件 history 引用行为', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('直接 push 到 getHistory() 引用可增长历史', () => {
    const initialLen = sys.getHistory().length
    sys.getHistory().push(makeEvent())
    expect(sys.getHistory()).toHaveLength(initialLen + 1)
  })
  it('事件顺序保持插入顺序', () => {
    sys.recordEvent(10, 'war', 'first')
    sys.recordEvent(20, 'disaster', 'second')
    const hist = sys.getHistory()
    const warIdx = hist.findIndex(e => e.description === 'first')
    const disIdx = hist.findIndex(e => e.description === 'second')
    expect(warIdx).toBeLessThan(disIdx)
  })
  it('getHistory 中可以找到所有记录的事件', () => {
    sys.recordEvent(1, 'founding', 'city alpha')
    sys.recordEvent(2, 'collapse', 'city beta')
    const hist = sys.getHistory()
    expect(hist.some(e => e.description === 'city alpha')).toBe(true)
    expect(hist.some(e => e.description === 'city beta')).toBe(true)
  })
})
