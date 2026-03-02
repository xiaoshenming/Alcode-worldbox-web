import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MiniGameSystem } from '../systems/MiniGameSystem'

function makeSys() { return new MiniGameSystem() }

// 构造Canvas measureText mock（假设每字符宽度10px）
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

describe('MiniGameSystem', () => {
  let sys: MiniGameSystem

  beforeEach(() => { sys = makeSys() })

  // ── 初始状态 ────────────────────────────────────────────────────────────────

  it('getHistory初始为空', () => { expect(sys.getHistory()).toHaveLength(0) })
  it('isActive初始为false', () => { expect(sys.isActive()).toBe(false) })
  it('active初始为null', () => { expect((sys as any).active).toBeNull() })
  it('nextTriggerTick在MIN_INTERVAL(3000)到MAX_INTERVAL(5000)之间', () => {
    const t = (sys as any).nextTriggerTick
    expect(t).toBeGreaterThanOrEqual(3000)
    expect(t).toBeLessThanOrEqual(5000)
  })

  // ── getHistory 返回副本 ─────────────────────────────────────────────────────

  it('getHistory返回数组副本而非内部引用', () => {
    const h1 = sys.getHistory()
    const h2 = sys.getHistory()
    expect(h1).not.toBe(h2)
  })

  // ── triggerRandomEvent ─────────────────────────────────────────────────────

  it('triggerRandomEvent后isActive为true', () => {
    ;(sys as any).triggerRandomEvent(100)
    expect(sys.isActive()).toBe(true)
  })

  it('triggerRandomEvent设置有效的模板', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    expect(active).not.toBeNull()
    expect(active.template).toBeDefined()
    expect(active.template.title).toBeTruthy()
    expect(Array.isArray(active.template.options)).toBe(true)
    expect(active.template.options.length).toBeGreaterThan(0)
  })

  it('triggerRandomEvent初始chosenOption为null', () => {
    ;(sys as any).triggerRandomEvent(0)
    expect((sys as any).active.chosenOption).toBeNull()
  })

  it('triggerRandomEvent初始descLines和resultLines为null（懒计算）', () => {
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    expect(active.descLines).toBeNull()
    expect(active.resultLines).toBeNull()
  })

  // ── update: 触发事件 ────────────────────────────────────────────────────────

  it('tick达到nextTriggerTick后触发事件', () => {
    const trigger = (sys as any).nextTriggerTick
    expect(sys.isActive()).toBe(false)
    sys.update(trigger)
    expect(sys.isActive()).toBe(true)
  })

  it('tick未达到nextTriggerTick时不触发事件', () => {
    const trigger = (sys as any).nextTriggerTick
    sys.update(trigger - 1)
    expect(sys.isActive()).toBe(false)
  })

  it('已有active事件时update不再触发新事件', () => {
    ;(sys as any).triggerRandomEvent(0)
    const firstTemplate = (sys as any).active.template
    // 强制tick>=nextTriggerTick
    ;(sys as any).nextTriggerTick = 0
    sys.update(9999)  // 有active，应跳过触发
    // active还是第一个
    expect((sys as any).active.template).toBe(firstTemplate)
  })

  // ── update: 结果超时关闭 ────────────────────────────────────────────────────

  it('选择选项后3000ms内事件保持active', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 9500  // 500ms前，未超时
    sys.update(100)
    expect(sys.isActive()).toBe(true)
    nowSpy.mockRestore()
  })

  it('选择选项后3000ms后事件自动关闭', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10000)
    ;(sys as any).triggerRandomEvent(0)
    const active = (sys as any).active
    active.chosenOption = active.template.options[0]
    active.resultShownAt = 6000  // 4000ms前，已超过3000ms
    sys.update(100)
    expect(sys.isActive()).toBe(false)
    nowSpy.mockRestore()
  })

  // ── computeWrappedLines ─────────────────────────────────────────────────────

  it('computeWrappedLines短文本不换行', () => {
    const ctx = makeCtx(10)  // 每字符10px
    const lines = (sys as any).computeWrappedLines(ctx, 'abc', 100)  // maxW=100, 3字符=30px
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('abc')
  })

  it('computeWrappedLines超宽文本按maxW换行', () => {
    const ctx = makeCtx(10)
    // maxW=50px = 5字符，"abcdefghij"=10字符，应换2行
    const lines = (sys as any).computeWrappedLines(ctx, 'abcdefghij', 50)
    expect(lines.length).toBeGreaterThan(1)
    // 所有字符拼合等于原文本
    expect(lines.join('')).toBe('abcdefghij')
  })

  it('computeWrappedLines空字符串返回空数组', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, '', 100)
    expect(lines).toHaveLength(0)
  })

  it('computeWrappedLines不超宽的中文字符串保持单行', () => {
    const ctx = makeCtx(10)
    const lines = (sys as any).computeWrappedLines(ctx, '你好', 300)
    expect(lines).toHaveLength(1)
  })
})
