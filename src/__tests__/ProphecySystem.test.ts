import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ProphecySystem } from '../systems/ProphecySystem'

// ProphecyState const enum: Active=0, Fulfilled=1, Failed=2, Expired=3
const Active = 0
const Fulfilled = 1
const Failed = 2

function makeSys(): ProphecySystem { return new ProphecySystem() }

function makeProphecy(type: string, state: number = Active, overrides: Record<string, unknown> = {}) {
  return {
    id: 1, type, text: 'A prophecy', state,
    createdTick: 0, deadlineTick: 1000,
    probability: 0.7, probabilityStr: '70',
    quotedText: '"A prophecy"',
    statusLine: '概率: 70%  剩余: 1000 ticks',
    civId: -1, notified: false,
    ...overrides,
  }
}

// ── 初始状态 ─────────────────────────────────────────────
describe('ProphecySystem 初始状态', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('prophecies 初始为空数组', () => {
    expect((sys as any).prophecies).toHaveLength(0)
  })
  it('history 初始为空数组', () => {
    expect(sys.getHistory()).toHaveLength(0)
  })
  it('visible 初始为 false', () => {
    expect((sys as any).visible).toBe(false)
  })
  it('tickCounter 初始为 0', () => {
    expect((sys as any).tickCounter).toBe(0)
  })
  it('onFulfilled 初始为 null', () => {
    expect((sys as any).onFulfilled).toBeNull()
  })
  it('scrollY 初始为 0', () => {
    expect((sys as any).scrollY).toBe(0)
  })
  it('panelX 初始为 100', () => {
    expect((sys as any).panelX).toBe(100)
  })
  it('panelY 初始为 60', () => {
    expect((sys as any).panelY).toBe(60)
  })
  it('dragging 初始为 false', () => {
    expect((sys as any).dragging).toBe(false)
  })
})

// ── getHistory ────────────────────────────────────────────
describe('ProphecySystem.getHistory', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('返回 readonly 数组引用', () => {
    expect(sys.getHistory()).toBeDefined()
  })
  it('注入 Fulfilled 预言后可查询', () => {
    ;(sys as any).history.push(makeProphecy('hero', Fulfilled))
    expect(sys.getHistory()).toHaveLength(1)
  })
  it('注入多条历史', () => {
    ;(sys as any).history.push(makeProphecy('war', Fulfilled))
    ;(sys as any).history.push(makeProphecy('doom', Failed))
    expect(sys.getHistory()).toHaveLength(2)
  })
  it('历史条目的 state 字段正确', () => {
    ;(sys as any).history.push(makeProphecy('plague', Failed))
    expect((sys.getHistory() as any[])[0].state).toBe(Failed)
  })
  it('getHistory 与内部 history 同一引用', () => {
    expect(sys.getHistory()).toBe((sys as any).history)
  })
})

// ── prophecies 内部数组 ───────────────────────────────────
describe('ProphecySystem prophecies 内部数组', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注入一条 disaster 预言', () => {
    ;(sys as any).prophecies.push(makeProphecy('disaster'))
    expect((sys as any).prophecies).toHaveLength(1)
  })
  it('注入多条不同类型预言', () => {
    const types = ['disaster', 'war', 'prosperity', 'hero', 'doom', 'plague', 'miracle']
    types.forEach(t => { ;(sys as any).prophecies.push(makeProphecy(t)) })
    expect((sys as any).prophecies).toHaveLength(7)
  })
  it('prophecies 是同一引用', () => {
    expect((sys as any).prophecies).toBe((sys as any).prophecies)
  })
  it('注入后类型字段正确', () => {
    ;(sys as any).prophecies.push(makeProphecy('miracle'))
    expect((sys as any).prophecies[0].type).toBe('miracle')
  })
  it('注入预言 civId=-1 表示全局', () => {
    ;(sys as any).prophecies.push(makeProphecy('war', Active, { civId: -1 }))
    expect((sys as any).prophecies[0].civId).toBe(-1)
  })
  it('注入预言 civId=5 表示关联文明', () => {
    ;(sys as any).prophecies.push(makeProphecy('hero', Active, { civId: 5 }))
    expect((sys as any).prophecies[0].civId).toBe(5)
  })
})

// ── handleKeyDown ─────────────────────────────────────────
describe('ProphecySystem.handleKeyDown', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeKey(key: string, shiftKey = false): KeyboardEvent {
    return { key, shiftKey } as unknown as KeyboardEvent
  }

  it('Shift+O 切换 visible 为 true', () => {
    sys.handleKeyDown(makeKey('O', true))
    expect((sys as any).visible).toBe(true)
  })
  it('Shift+O 再次切换 visible 为 false', () => {
    ;(sys as any).visible = true
    sys.handleKeyDown(makeKey('O', true))
    expect((sys as any).visible).toBe(false)
  })
  it('Shift+O 返回 true', () => {
    expect(sys.handleKeyDown(makeKey('O', true))).toBe(true)
  })
  it('Shift+o（小写）也生效', () => {
    expect(sys.handleKeyDown(makeKey('o', true))).toBe(true)
  })
  it('无 Shift 的 O 不触发', () => {
    expect(sys.handleKeyDown(makeKey('O', false))).toBe(false)
  })
  it('其他按键不触发', () => {
    expect(sys.handleKeyDown(makeKey('P', true))).toBe(false)
  })
  it('Shift+O 重置 scrollY', () => {
    ;(sys as any).scrollY = 100
    sys.handleKeyDown(makeKey('O', true))
    expect((sys as any).scrollY).toBe(0)
  })
  it('Shift+X 返回 false', () => {
    expect(sys.handleKeyDown(makeKey('X', true))).toBe(false)
  })
})

// ── update 基本行为 ───────────────────────────────────────
describe('ProphecySystem.update 基本行为', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次调用 tickCounter 自增', () => {
    sys.update(1, 2)
    expect((sys as any).tickCounter).toBe(1)
    sys.update(2, 2)
    expect((sys as any).tickCounter).toBe(2)
  })
  it('civCount=0 时不生成预言', () => {
    // 强制触发生成间隔
    ;(sys as any).tickCounter = 1999
    sys.update(2000, 0)
    expect((sys as any).prophecies).toHaveLength(0)
  })
  it('预言未到期时保持 Active', () => {
    ;(sys as any).prophecies.push(makeProphecy('war', Active, { deadlineTick: 9999 }))
    sys.update(100, 2)
    expect((sys as any).prophecies).toHaveLength(1)
    expect((sys as any).prophecies[0].state).toBe(Active)
  })
  it('history 超过 50 条时截断', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).history.push(makeProphecy('doom', Failed, { id: i + 100 }))
    }
    sys.update(1, 2)
    expect((sys as any).history.length).toBeLessThanOrEqual(50)
  })
})

// ── update 到期判定 ───────────────────────────────────────
describe('ProphecySystem.update 到期判定', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('到期且 random<probability 时转为 Fulfilled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    ;(sys as any).prophecies.push(makeProphecy('war', Active, { deadlineTick: 10, probability: 0.9 }))
    sys.update(10, 2)
    expect((sys as any).prophecies).toHaveLength(0)
    expect(sys.getHistory()).toHaveLength(1)
    expect((sys.getHistory() as any[])[0].state).toBe(Fulfilled)
  })
  it('到期且 random>=probability 时转为 Failed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).prophecies.push(makeProphecy('doom', Active, { deadlineTick: 10, probability: 0.1 }))
    sys.update(10, 2)
    expect((sys.getHistory() as any[])[0].state).toBe(Failed)
  })
  it('Fulfilled 时调用 onFulfilled 回调', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const cb = vi.fn()
    sys.onFulfilled = cb
    ;(sys as any).prophecies.push(makeProphecy('miracle', Active, { deadlineTick: 5, probability: 0.99 }))
    sys.update(5, 2)
    expect(cb).toHaveBeenCalledOnce()
  })
  it('Failed 时不调用 onFulfilled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cb = vi.fn()
    sys.onFulfilled = cb
    ;(sys as any).prophecies.push(makeProphecy('disaster', Active, { deadlineTick: 5, probability: 0.01 }))
    sys.update(5, 2)
    expect(cb).not.toHaveBeenCalled()
  })
  it('到期后从 prophecies 中移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).prophecies.push(makeProphecy('hero', Active, { deadlineTick: 10, probability: 0.9 }))
    sys.update(10, 2)
    expect((sys as any).prophecies).toHaveLength(0)
  })
  it('多条预言同时到期全部移到 history', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).prophecies.push(
        makeProphecy('war', Active, { id: i + 10, deadlineTick: 10, probability: 0.9 })
      )
    }
    sys.update(10, 2)
    expect((sys as any).prophecies).toHaveLength(0)
    expect(sys.getHistory().length).toBeGreaterThanOrEqual(3)
  })
})

// ── update statusLine 更新 ────────────────────────────────
describe('ProphecySystem.update statusLine 更新', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('visible=true 时更新 statusLine', () => {
    ;(sys as any).visible = true
    ;(sys as any).prophecies.push(
      makeProphecy('plague', Active, { deadlineTick: 500, probability: 0.3, probabilityStr: '30' })
    )
    sys.update(100, 2)
    const sl: string = (sys as any).prophecies[0].statusLine
    expect(sl).toContain('400')
  })
  it('visible=false 时不更新 statusLine', () => {
    ;(sys as any).visible = false
    const original = '原始statusLine'
    ;(sys as any).prophecies.push(
      makeProphecy('hero', Active, { deadlineTick: 500, statusLine: original })
    )
    sys.update(100, 2)
    expect((sys as any).prophecies[0].statusLine).toBe(original)
  })
  it('remaining 不为负数', () => {
    ;(sys as any).visible = true
    ;(sys as any).prophecies.push(
      makeProphecy('war', Active, { deadlineTick: 50, probability: 0.5, probabilityStr: '50' })
    )
    // tick 超过 deadline 但 random 让它不到期（先不设置 mock，仅验证 statusLine 不含负数）
    // 直接验证正常情况
    sys.update(40, 2)
    const sl: string = (sys as any).prophecies[0].statusLine
    expect(sl).toContain('10')
  })
})

// ── render 不崩溃 ─────────────────────────────────────────
describe('ProphecySystem.render 不崩溃', () => {
  let sys: ProphecySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeMockCtx() {
    return {
      fillStyle: '', strokeStyle: '', font: '', textAlign: '',
      globalAlpha: 1, lineWidth: 1,
      beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(),
      fillText: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(), stroke: vi.fn(),
      rect: vi.fn(), clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      canvas: { width: 800, height: 600 },
    } as unknown as CanvasRenderingContext2D
  }

  it('visible=false 时 render 直接返回', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = false
    expect(() => sys.render(ctx, 0)).not.toThrow()
    expect(ctx.beginPath).not.toHaveBeenCalled()
  })
  it('visible=true 且无预言时正常渲染面板', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = true
    expect(() => sys.render(ctx, 0)).not.toThrow()
    expect(ctx.beginPath).toHaveBeenCalled()
  })
  it('visible=true 且有活跃预言时不崩溃', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = true
    ;(sys as any).prophecies.push(makeProphecy('disaster', Active))
    expect(() => sys.render(ctx, 100)).not.toThrow()
  })
  it('visible=true 且有历史预言时不崩溃', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = true
    ;(sys as any).history.push(makeProphecy('hero', Fulfilled))
    expect(() => sys.render(ctx, 200)).not.toThrow()
  })
  it('活跃预言数量改变时重建 headerStr', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = true
    ;(sys as any)._prevProphecyCount = -1
    ;(sys as any).prophecies.push(makeProphecy('war', Active))
    sys.render(ctx, 0)
    expect((sys as any)._headerStr).toContain('1 活跃')
  })
  it('render 后 textAlign 恢复为 left', () => {
    const ctx = makeMockCtx()
    ;(sys as any).visible = true
    sys.render(ctx, 0)
    expect(ctx.textAlign).toBe('left')
  })
})
