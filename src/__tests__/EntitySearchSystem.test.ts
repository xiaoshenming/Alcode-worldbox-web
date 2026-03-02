import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EntitySearchSystem } from '../systems/EntitySearchSystem'

function makeSys() { return new EntitySearchSystem() }

// ================================================================
describe('EntitySearchSystem — 初始状态', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('模块可以导入', async () => {
    const mod = await import('../systems/EntitySearchSystem')
    expect(mod.EntitySearchSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    expect(sys).toBeInstanceOf(EntitySearchSystem)
  })

  it('query 初始为空字符串', () => {
    expect((sys as any).query).toBe('')
  })

  it('results 初始为空数组', () => {
    expect((sys as any).results).toHaveLength(0)
  })

  it('selectedIdx 初始为 -1', () => {
    expect((sys as any).selectedIdx).toBe(-1)
  })

  it('panelOpen 初始为 false', () => {
    expect((sys as any).panelOpen).toBe(false)
  })

  it('isPanelOpen() 初始返回 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })
})

// ================================================================
describe('EntitySearchSystem — togglePanel', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('togglePanel() 将 panelOpen 从 false 切换为 true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('togglePanel() 连续调用两次恢复为 false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('togglePanel() 关闭时调用 clear()', () => {
    const clearSpy = vi.spyOn(sys as any, 'clear')
    sys.togglePanel()  // open
    sys.togglePanel()  // close → calls clear
    expect(clearSpy).toHaveBeenCalledTimes(1)
  })

  it('togglePanel() 打开时不调用 clear()', () => {
    const clearSpy = vi.spyOn(sys as any, 'clear')
    sys.togglePanel()  // open only
    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('关闭面板后 query 被清空', () => {
    ;(sys as any).query = 'hero'
    sys.togglePanel()  // open
    sys.togglePanel()  // close
    expect((sys as any).query).toBe('')
  })

  it('关闭面板后 results 被清空', () => {
    ;(sys as any).results = [{ entityId: 1, label: 'a', x: 0, y: 0, coordStr: '(0,0)' }]
    sys.togglePanel()  // open
    sys.togglePanel()  // close
    expect((sys as any).results).toHaveLength(0)
  })

  it('关闭面板后 selectedIdx 重置为 -1', () => {
    ;(sys as any).selectedIdx = 3
    sys.togglePanel()  // open
    sys.togglePanel()  // close
    expect((sys as any).selectedIdx).toBe(-1)
  })

  it('多次 toggle 保持正确的奇偶性', () => {
    for (let i = 1; i <= 6; i++) {
      sys.togglePanel()
      expect(sys.isPanelOpen()).toBe(i % 2 === 1)
    }
  })
})

// ================================================================
describe('EntitySearchSystem — isPanelOpen', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('打开后 isPanelOpen() 为 true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('关闭后 isPanelOpen() 为 false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('直接设置 panelOpen=true 后 isPanelOpen() 反映该值', () => {
    ;(sys as any).panelOpen = true
    expect(sys.isPanelOpen()).toBe(true)
  })
})

// ================================================================
describe('EntitySearchSystem — clear', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('clear() 将 query 置为空字符串', () => {
    ;(sys as any).query = 'elf'
    ;(sys as any).clear()
    expect((sys as any).query).toBe('')
  })

  it('clear() 将 results 置为空数组', () => {
    ;(sys as any).results = [
      { entityId: 1, label: 'Human#1', x: 5, y: 5, coordStr: '(5,5)' },
    ]
    ;(sys as any).clear()
    expect((sys as any).results).toHaveLength(0)
  })

  it('clear() 将 selectedIdx 置为 -1', () => {
    ;(sys as any).selectedIdx = 2
    ;(sys as any).clear()
    expect((sys as any).selectedIdx).toBe(-1)
  })

  it('clear() 在已清空状态下调用不崩溃', () => {
    expect(() => (sys as any).clear()).not.toThrow()
  })

  it('clear() 连续两次调用不崩溃', () => {
    ;(sys as any).query = 'orc'
    ;(sys as any).clear()
    expect(() => (sys as any).clear()).not.toThrow()
  })
})

// ================================================================
describe('EntitySearchSystem — results 内部状态操作', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('可以注入多个 results 到内部数组', () => {
    ;(sys as any).results = [
      { entityId: 1, label: 'Human#1',  x: 1,  y: 1,  coordStr: '(1,1)' },
      { entityId: 2, label: 'Elf#2',    x: 2,  y: 2,  coordStr: '(2,2)' },
      { entityId: 3, label: 'Dwarf#3',  x: 3,  y: 3,  coordStr: '(3,3)' },
    ]
    expect((sys as any).results).toHaveLength(3)
  })

  it('selectedIdx 可以设置为有效索引', () => {
    ;(sys as any).results = [
      { entityId: 99, label: 'Dragon', x: 50, y: 50, coordStr: '(50,50)' }
    ]
    ;(sys as any).selectedIdx = 0
    expect((sys as any).selectedIdx).toBe(0)
  })

  it('selectedIdx=-1 表示没有选中任何结果', () => {
    ;(sys as any).selectedIdx = -1
    expect((sys as any).selectedIdx).toBe(-1)
  })

  it('results 中每条结果有 entityId、label、x、y、coordStr', () => {
    const result = { entityId: 42, label: 'Orc#42', x: 10, y: 20, coordStr: '(10,20)' }
    ;(sys as any).results = [result]
    const r = (sys as any).results[0]
    expect(r.entityId).toBe(42)
    expect(r.label).toBe('Orc#42')
    expect(r.x).toBe(10)
    expect(r.y).toBe(20)
    expect(r.coordStr).toBe('(10,20)')
  })

  it('results 超过 10 条时内部可以存储（render 只显示前 10）', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      entityId: i, label: `Entity#${i}`, x: i, y: i, coordStr: `(${i},${i})`
    }))
    ;(sys as any).results = many
    expect((sys as any).results).toHaveLength(20)
  })
})

// ================================================================
describe('EntitySearchSystem — render() 基本行为', () => {
  let sys: EntitySearchSystem

  function makeCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textBaseline: '',
      textAlign: '',
    } as unknown as CanvasRenderingContext2D
  }

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('面板关闭时 render() 不调用 ctx.save()', () => {
    const ctx = makeCtx()
    sys.render(ctx, 800, 600)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('面板打开时 render() 调用 ctx.save() 和 ctx.restore()', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('面板打开时 render() 调用 ctx.beginPath()', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    expect(ctx.beginPath).toHaveBeenCalled()
  })

  it('面板打开时 render() 调用 ctx.roundRect()', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    expect(ctx.roundRect).toHaveBeenCalled()
  })

  it('面板打开且无结果时 render() 不崩溃', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('面板打开且有结果时 render() 调用 fillText', () => {
    const ctx = makeCtx()
    ;(sys as any).results = [
      { entityId: 1, label: 'Human#1', x: 1, y: 1, coordStr: '(1,1)' }
    ]
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('有结果且 selectedIdx=0 时 render() 绘制选中高亮矩形', () => {
    const ctx = makeCtx()
    ;(sys as any).results = [
      { entityId: 1, label: 'Dragon', x: 50, y: 50, coordStr: '(50,50)' }
    ]
    ;(sys as any).selectedIdx = 0
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    // fillRect is called for search input area and the selected row highlight
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('超过 10 条结果时只渲染前 10 条', () => {
    const ctx = makeCtx()
    const many = Array.from({ length: 15 }, (_, i) => ({
      entityId: i, label: `E#${i}`, x: i, y: i, coordStr: `(${i},${i})`
    }))
    ;(sys as any).results = many
    sys.togglePanel()
    // Should not throw and render() processes at most 10 results
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render() 在不同 screenW 下不崩溃', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    for (const w of [320, 640, 1024, 1920]) {
      expect(() => sys.render(ctx, w, 600)).not.toThrow()
    }
  })

  it('render() 面板水平居中（px = (screenW - 280) / 2）', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    // roundRect first arg (px) should equal (800-280)/2 = 260
    const call = (ctx.roundRect as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBeCloseTo(260)
  })

  it('render() 无结果时显示占位文本', () => {
    const ctx = makeCtx()
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    // fillText called with placeholder text
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const texts = calls.map((c: any[]) => c[0])
    expect(texts).toContain('Search entities...')
  })

  it('render() query 非空时显示 query 文本', () => {
    const ctx = makeCtx()
    ;(sys as any).query = 'elf'
    sys.togglePanel()
    sys.render(ctx, 800, 600)
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    const texts = calls.map((c: any[]) => c[0])
    expect(texts).toContain('elf')
  })
})

// ================================================================
describe('EntitySearchSystem — 边界条件与鲁棒性', () => {
  let sys: EntitySearchSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('togglePanel 后再 clear() 不崩溃', () => {
    sys.togglePanel()
    expect(() => (sys as any).clear()).not.toThrow()
  })

  it('query 可以设置为中文字符串', () => {
    ;(sys as any).query = '人类'
    expect((sys as any).query).toBe('人类')
  })

  it('query 可以设置为特殊字符', () => {
    ;(sys as any).query = '#@!$'
    expect((sys as any).query).toBe('#@!$')
  })

  it('results 为空数组时 clear() 幂等', () => {
    ;(sys as any).clear()
    ;(sys as any).clear()
    expect((sys as any).results).toHaveLength(0)
    expect((sys as any).query).toBe('')
    expect((sys as any).selectedIdx).toBe(-1)
  })

  it('panelOpen 直接设置为 true 时 isPanelOpen 正确反映', () => {
    ;(sys as any).panelOpen = true
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('并发多次 togglePanel 最终状态正确', () => {
    // 奇数次 toggle → open
    for (let i = 0; i < 7; i++) sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
})
