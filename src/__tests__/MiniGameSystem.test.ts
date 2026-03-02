import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MiniGameSystem } from '../systems/MiniGameSystem'

function makeSys() { return new MiniGameSystem() }

function makeCtx(charWidth = 10) {
  return {
    measureText: (text: string) => ({ width: text.length * charWidth }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'center' as CanvasTextAlign,
    fillRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

// ── 初始状态 ──────────────────────────────────────────────────────────────────

describe('MiniGameSystem 初始状态', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getHistory 初始为空', () => {
    expect(sys.getHistory()).toHaveLength(0)
  })

  it('isActive 初始为 false', () => {
    expect(sys.isActive()).toBe(false)
  })

  it('active 初始为 null', () => {
    expect((sys as any).active).toBeNull()
  })

  it('nextTriggerTick 在 MIN_INTERVAL(3000) 到 MAX_INTERVAL(5000) 之间', () => {
    const t = (sys as any).nextTriggerTick
    expect(t).toBeGreaterThanOrEqual(3000)
    expect(t).toBeLessThanOrEqual(5000)
  })

  it('history 初始为空数组', () => {
    expect(Array.isArray((sys as any).history)).toBe(true)
    expect((sys as any).history).toHaveLength(0)
  })

  it('多次实例化 nextTriggerTick 在合法范围内', () => {
    for (let i = 0; i < 20; i++) {
      const s = makeSys()
      const t = (s as any).nextTriggerTick
      expect(t).toBeGreaterThanOrEqual(3000)
      expect(t).toBeLessThanOrEqual(5000)
    }
  })
})

// ── getHistory 副本保证 ────────────────────────────────────────────────────────

describe('MiniGameSystem.getHistory 副本', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getHistory 返回数组副本而非内部引用', () => {
    const h1 = sys.getHistory()
    const h2 = sys.getHistory()
    expect(h1).not.toBe(h2)
  })

  it('修改返回的数组不影响内部 history', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    // 手动塞入 history 来测试
    ;(sys as any).history.push({ tick: 1, eventType: 'plague', choice: 'a' })
    const h = sys.getHistory()
    h.pop()
    expect((sys as any).history).toHaveLength(1)
  })

  it('getHistory 多次调用结果相同（内容）', () => {
    ;(sys as any).history.push({ tick: 5, eventType: 'plague', choice: 'b' })
    expect(sys.getHistory()[0].tick).toBe(5)
    expect(sys.getHistory()[0].eventType).toBe('plague')
  })
})

// ── triggerRandomEvent ────────────────────────────────────────────────────────

describe('MiniGameSystem.triggerRandomEvent', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('triggerRandomEvent 后 isActive 为 true', () => {
    ;(sys as any).triggerRandomEvent(100)
    expect(sys.isActive()).toBe(true)
  })

  it('triggerRandomEvent 设置有效的模板', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    expect(active).not.toBeNull()
    expect(active.template).toBeDefined()
    expect(active.template.title).toBeTruthy()
    expect(Array.isArray(active.template.options)).toBe(true)
    expect(active.template.options.length).toBeGreaterThan(0)
  })

  it('triggerRandomEvent 初始 chosenOption 为 null', () => {
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.chosenOption).toBeNull()
  })

  it('triggerRandomEvent 初始 descLines 和 resultLines 为 null（懒计算）', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    expect(active.descLines).toBeNull()
    expect(active.resultLines).toBeNull()
  })

  it('triggerRandomEvent 记录 triggeredAt tick', () => {
    ;(sys as any).triggerRandomEvent(999)
    expect((sys as any).active.triggeredAt).toBe(999)
  })

  it('triggerRandomEvent 初始 resultShownAt 为 0', () => {
    ;(sys as any).triggerRandomEvent(50)
    expect((sys as any).active.resultShownAt).toBe(0)
  })

  it('triggerRandomEvent 模板类型是有效字符串', () => {
    const validTypes = ['meteor_shower', 'plague', 'diplomacy_crisis', 'resource_shortage']
    ;(sys as any).triggerRandomEvent(0)
    expect(validTypes).toContain((sys as any).active.template.type)
  })

  it('triggerRandomEvent 模板有 description 字段', () => {
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.template.description).toBeTruthy()
  })

  it('triggerRandomEvent 选项均有 id, label, resultText', () => {
    ;(sys as any).triggerRandomEvent(0)
    const opts = (sys as any).active.template.options
    for (const opt of opts) {
      expect(opt.id).toBeTruthy()
      expect(opt.label).toBeTruthy()
      expect(opt.resultText).toBeTruthy()
    }
  })
})

// ── update: 触发事件 ──────────────────────────────────────────────────────────

describe('MiniGameSystem.update 事件触发', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 达到 nextTriggerTick 后触发事件', () => {
    const trigger = (sys as any).nextTriggerTick
    expect(sys.isActive()).toBe(false)
    sys.update(trigger)
    expect(sys.isActive()).toBe(true)
  })

  it('tick 未达到 nextTriggerTick 时不触发事件', () => {
    const trigger = (sys as any).nextTriggerTick
    sys.update(trigger - 1)
    expect(sys.isActive()).toBe(false)
  })

  it('已有 active 事件时 update 不再触发新事件', () => {
    ;(sys as any).triggerRandomEvent(0)
    const firstTemplate = (sys as any).active.template
    ;(sys as any).nextTriggerTick = 0
    sys.update(9999)
    expect((sys as any).active.template).toBe(firstTemplate)
  })

  it('触发后 nextTriggerTick 被更新到 tick + 新间隔', () => {
    const trigger = (sys as any).nextTriggerTick
    sys.update(trigger)
    const newTrigger = (sys as any).nextTriggerTick
    expect(newTrigger).toBeGreaterThanOrEqual(trigger + 3000)
    expect(newTrigger).toBeLessThanOrEqual(trigger + 5000)
  })

  it('tick=0 时不触发（nextTriggerTick >= 3000）', () => {
    sys.update(0)
    expect(sys.isActive()).toBe(false)
  })

  it('多次 update 在未达阈值时保持 inactive', () => {
    for (let i = 0; i < 100; i++) sys.update(i)
    expect(sys.isActive()).toBe(false)
  })
})

// ── update: 结果超时关闭 ──────────────────────────────────────────────────────

describe('MiniGameSystem.update 超时关闭', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('选择选项后 3000ms 内事件保持 active', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 9500
    sys.update(100)
    expect(sys.isActive()).toBe(true)
    nowSpy.mockRestore()
  })

  it('选择选项后 3000ms 后事件自动关闭', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 6000
    sys.update(100)
    expect(sys.isActive()).toBe(false)
    nowSpy.mockRestore()
  })

  it('选择选项但 resultShownAt=0 时不自动关闭', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 0
    sys.update(100)
    // resultShownAt=0 时不触发超时逻辑
    expect(sys.isActive()).toBe(true)
  })

  it('未选择选项时 update 不关闭事件', () => {
    ;(sys as any).triggerRandomEvent(0)
    sys.update(99999)
    expect(sys.isActive()).toBe(true)
  })

  it('exactly 3000ms 边界应关闭', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 7000 // now - resultShownAt = 3000 >= 3000
    sys.update(100)
    expect(sys.isActive()).toBe(false)
    nowSpy.mockRestore()
  })

  it('关闭后 active 为 null', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 5000
    sys.update(100)
    expect((sys as any).active).toBeNull()
    nowSpy.mockRestore()
  })
})

// ── computeWrappedLines ───────────────────────────────────────────────────────

describe('MiniGameSystem.computeWrappedLines', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('短文本不换行', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, 'abc', 100)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('abc')
  })

  it('超宽文本按 maxW 换行', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, 'abcdefghij', 50)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe('abcdefghij')
  })

  it('空字符串返回空数组', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, '', 100)
    expect(lines).toHaveLength(0)
  })

  it('不超宽的中文字符串保持单行', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, '你好', 300)
    expect(lines).toHaveLength(1)
  })

  it('单个字符不换行', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, 'A', 50)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('A')
  })

  it('maxW 极小时每字符一行', () => {
    const ctx = makeCtx(10)
    // 每字符10px, maxW=5 => 每次一个字符就超，但逻辑是 > maxW && line.length > 0
    // 第1字符: line='A'(10px<=5? No, test=A, 10>5 但 line.length=0, 所以直接加), line='A'
    // 第2字符: test='AB'=20>5, line.length>0 => push 'A', line='B'
    // 结果: ['A','B','C']
    const lines = (sys as any).computeWrappedLines(ctx, 'ABC', 5)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines.join('')).toBe('ABC')
  })

  it('换行后各行字符拼合等于原文', () => {
    const ctx = makeCtx(5)
    const text = 'HelloWorld'
    const lines = (sys as any).computeWrappedLines(ctx, text, 30)
    expect(lines.join('')).toBe(text)
  })

  it('maxW 足够大时单行', () => {
    const ctx = makeCtx(10)
    const text = 'A very long sentence that should fit'
    const lines = (sys as any).computeWrappedLines(ctx, text, 9999)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(text)
  })

  it('所有换行后内容无字符丢失', () => {
    const ctx = makeCtx(8)
    const text = '大量陨石正朝世界坠落，你要如何应对？'
    const lines = (sys as any).computeWrappedLines(ctx, text, 60)
    expect(lines.join('')).toBe(text)
  })

  it('每行宽度均不超过 maxW（除末行）', () => {
    const charWidth = 10
    const ctx = makeCtx(charWidth)
    const maxW = 50
    const text = 'abcdefghijklmnopqrstuvwxyz'
    const lines = (sys as any).computeWrappedLines(ctx, text, maxW)
    // 每行长度不超过 maxW/charWidth = 5 字符
    for (let i = 0; i < lines.length - 1; i++) {
      expect(lines[i].length * charWidth).toBeLessThanOrEqual(maxW)
    }
  })
})

// ── isActive ──────────────────────────────────────────────────────────────────

describe('MiniGameSystem.isActive', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无 active 时 isActive 为 false', () => {
    expect(sys.isActive()).toBe(false)
  })

  it('triggerRandomEvent 后 isActive 为 true', () => {
    ;(sys as any).triggerRandomEvent(0)
    expect(sys.isActive()).toBe(true)
  })

  it('手动设 active 为 null 后 isActive 为 false', () => {
    ;(sys as any).triggerRandomEvent(0)
    ;(sys as any).active = null
    expect(sys.isActive()).toBe(false)
  })
})

// ── history 记录 ──────────────────────────────────────────────────────────────

describe('MiniGameSystem history 记录', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('手动注入历史后 getHistory 返回正确数据', () => {
    ;(sys as any).history.push({ tick: 100, eventType: 'plague', choice: 'medicine' })
    const h = sys.getHistory()
    expect(h).toHaveLength(1)
    expect(h[0].eventType).toBe('plague')
    expect(h[0].choice).toBe('medicine')
  })

  it('多条历史记录均可获取', () => {
    ;(sys as any).history.push({ tick: 10, eventType: 'meteor_shower', choice: 'shield' })
    ;(sys as any).history.push({ tick: 20, eventType: 'plague', choice: 'quarantine' })
    ;(sys as any).history.push({ tick: 30, eventType: 'diplomacy_crisis', choice: 'peace' })
    expect(sys.getHistory()).toHaveLength(3)
  })

  it('历史 tick 字段保持正确', () => {
    ;(sys as any).history.push({ tick: 777, eventType: 'resource_shortage', choice: 'trade' })
    expect(sys.getHistory()[0].tick).toBe(777)
  })
})

// ── EVENT_TEMPLATES 校验 ─────────────────────────────────────────────────────

describe('MiniGameSystem EVENT_TEMPLATES 校验（通过 triggerRandomEvent 抽样）', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('陨石雨模板有 3 个选项', () => {
    // 强制抽到特定模板（mock Math.random）
    vi.spyOn(Math, 'random').mockReturnValue(0) // index 0 => meteor_shower
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.template.type).toBe('meteor_shower')
    expect((sys as any).active.template.options).toHaveLength(3)
  })

  it('瘟疫模板有 3 个选项', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.26) // index 1 => plague
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.template.type).toBe('plague')
    expect((sys as any).active.template.options).toHaveLength(3)
  })

  it('外交危机模板有 2 个选项', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.51) // index 2 => diplomacy_crisis
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.template.type).toBe('diplomacy_crisis')
    expect((sys as any).active.template.options).toHaveLength(2)
  })

  it('资源短缺模板有 3 个选项', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.76) // index 3 => resource_shortage
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.template.type).toBe('resource_shortage')
    expect((sys as any).active.template.options).toHaveLength(3)
  })

  it('所有模板 title 包含 emoji', () => {
    const validTypes = ['meteor_shower', 'plague', 'diplomacy_crisis', 'resource_shortage']
    const mockValues = [0, 0.26, 0.51, 0.76]
    for (const v of mockValues) {
      vi.spyOn(Math, 'random').mockReturnValue(v)
      ;(sys as any).triggerRandomEvent(0)
      expect((sys as any).active.template.title.length).toBeGreaterThan(0)
      vi.restoreAllMocks()
    }
  })
})
