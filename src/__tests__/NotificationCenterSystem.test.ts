import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NotificationCenterSystem, NotificationCategory } from '../systems/NotificationCenterSystem'

// POOL_SIZE = MAX_VISIBLE(5) + MAX_HISTORY(50) = 55
const POOL_SIZE = 55
const MAX_VISIBLE = 5
const MAX_HISTORY = 50

function makeSys() { return new NotificationCenterSystem() }

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
  } as unknown as CanvasRenderingContext2D
}

describe('NotificationCenterSystem — 初始状态', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 histOpen 为 false', () => {
    expect((sys as any).histOpen).toBe(false)
  })

  it('初始 cursor 为 0', () => {
    expect((sys as any).cursor).toBe(0)
  })

  it('初始 pool 大小为 POOL_SIZE', () => {
    expect((sys as any).pool).toHaveLength(POOL_SIZE)
  })

  it('初始 pool 所有槽 active 为 false', () => {
    const pool = (sys as any).pool
    expect(pool.every((e: any) => !e.active)).toBe(true)
  })

  it('初始 vis 为空数组', () => {
    expect((sys as any).vis).toHaveLength(0)
  })

  it('初始 hist 为空数组', () => {
    expect((sys as any).hist).toHaveLength(0)
  })

  it('初始 histScroll 为 0', () => {
    expect((sys as any).histScroll).toBe(0)
  })

  it('isHistoryOpen() 初始返回 false', () => {
    expect(sys.isHistoryOpen()).toBe(false)
  })

  it('pool 每个槽 category 初始为 info', () => {
    const pool = (sys as any).pool
    expect(pool.every((e: any) => e.category === 'info')).toBe(true)
  })

  it('pool 每个槽 alpha 初始为 0', () => {
    const pool = (sys as any).pool
    expect(pool.every((e: any) => e.alpha === 0)).toBe(true)
  })
})

describe('NotificationCenterSystem — push()', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('push 基本调用不抛出', () => {
    expect(() => sys.push('Hello', 'info')).not.toThrow()
  })

  it('push 后 vis 数组长度增加', () => {
    sys.push('msg', 'info')
    expect((sys as any).vis).toHaveLength(1)
  })

  it('push 后 hist 数组长度增加', () => {
    sys.push('msg', 'info')
    expect((sys as any).hist).toHaveLength(1)
  })

  it('push 后 cursor 增加 1', () => {
    sys.push('msg', 'info')
    expect((sys as any).cursor).toBe(1)
  })

  it('push 将消息存储到 pool entry', () => {
    sys.push('test message', 'warning')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].message).toBe('test message')
  })

  it('push 存储 category', () => {
    sys.push('msg', 'danger')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].category).toBe('danger')
  })

  it('push 带坐标时 hasPosition 为 true', () => {
    sys.push('msg', 'info', 10, 20)
    const idx = (sys as any).hist[0]
    const entry = (sys as any).pool[idx]
    expect(entry.hasPosition).toBe(true)
    expect(entry.x).toBe(10)
    expect(entry.y).toBe(20)
  })

  it('push 不带坐标时 hasPosition 为 false', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].hasPosition).toBe(false)
  })

  it('push 后 pool entry active 为 true', () => {
    sys.push('msg', 'success')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].active).toBe(true)
  })

  it('push 后 pool entry alpha 为 1', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].alpha).toBe(1)
  })

  it('push 后 pool entry spawnTick 为 -1', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].spawnTick).toBe(-1)
  })

  it('push 后 notifText 被清空', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].notifText).toBe('')
  })

  it('push 后 histText 被清空', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].histText).toBe('')
  })

  it('push 超过 MAX_VISIBLE(5) 时 vis 长度不超过 5', () => {
    for (let i = 0; i < 8; i++) sys.push(`msg${i}`, 'info')
    expect((sys as any).vis.length).toBeLessThanOrEqual(MAX_VISIBLE)
  })

  it('push 超过 MAX_HISTORY(50) 时 hist 长度不超过 50', () => {
    for (let i = 0; i < 55; i++) sys.push(`msg${i}`, 'info')
    expect((sys as any).hist.length).toBeLessThanOrEqual(MAX_HISTORY)
  })

  it('cursor 循环绕回', () => {
    for (let i = 0; i < POOL_SIZE; i++) sys.push(`m${i}`, 'info')
    expect((sys as any).cursor).toBe(0)
  })

  it('push 所有 category 类型均不抛出', () => {
    const cats: NotificationCategory[] = ['info', 'warning', 'danger', 'success']
    cats.forEach(cat => {
      expect(() => sys.push('test', cat)).not.toThrow()
    })
  })

  it('vis 最新的 push 在数组开头', () => {
    sys.push('first', 'info')
    sys.push('second', 'info')
    const vis = (sys as any).vis as number[]
    const idx0 = vis[0]
    expect((sys as any).pool[idx0].message).toBe('second')
  })

  it('hist 最新的 push 在数组开头', () => {
    sys.push('first', 'info')
    sys.push('second', 'info')
    const hist = (sys as any).hist as number[]
    const idx0 = hist[0]
    expect((sys as any).pool[idx0].message).toBe('second')
  })
})

describe('NotificationCenterSystem — update()', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 不崩溃', () => {
    expect(() => sys.update(0)).not.toThrow()
  })

  it('update 初次设置 spawnTick', () => {
    sys.push('msg', 'info')
    sys.update(10)
    const idx = (sys as any).vis[0]
    expect((sys as any).pool[idx].spawnTick).toBe(10)
  })

  it('update 在 DISPLAY_TICKS(180) 内 entry 保持 active', () => {
    sys.push('msg', 'info')
    sys.update(0)
    sys.update(100)
    expect((sys as any).vis.length).toBeGreaterThan(0)
  })

  it('update 超过 DISPLAY_TICKS(180) 后 entry 变 inactive', () => {
    sys.push('msg', 'info')
    sys.update(0)
    sys.update(200)
    expect((sys as any).vis).toHaveLength(0)
  })

  it('update 在淡出阶段 alpha 小于 1', () => {
    sys.push('msg', 'info')
    sys.update(0)
    // FADE_DURATION=120, 淡出从 180-120=60 tick 开始
    sys.update(100)
    const idx = (sys as any).vis[0]
    if (idx !== undefined) {
      expect((sys as any).pool[idx].alpha).toBeLessThan(1)
    }
  })

  it('update 早期阶段 alpha 为 1', () => {
    sys.push('msg', 'info')
    sys.update(0)
    sys.update(30)
    const idx = (sys as any).vis[0]
    expect((sys as any).pool[idx].alpha).toBe(1)
  })

  it('vis 中 inactive entry 被移除', () => {
    sys.push('msg', 'info')
    const idx = (sys as any).vis[0]
    ;(sys as any).pool[idx].active = false
    sys.update(0)
    expect((sys as any).vis).not.toContain(idx)
  })
})

describe('NotificationCenterSystem — toggleHistory() / isHistoryOpen()', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggleHistory 后 histOpen 为 true', () => {
    sys.toggleHistory()
    expect(sys.isHistoryOpen()).toBe(true)
  })

  it('两次 toggleHistory 后 histOpen 回到 false', () => {
    sys.toggleHistory()
    sys.toggleHistory()
    expect(sys.isHistoryOpen()).toBe(false)
  })

  it('toggleHistory 重置 histScroll 为 0', () => {
    ;(sys as any).histScroll = 100
    sys.toggleHistory()
    expect((sys as any).histScroll).toBe(0)
  })
})

describe('NotificationCenterSystem — clear()', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('clear 将所有 pool entry active 置为 false', () => {
    sys.push('msg', 'info')
    sys.clear()
    const pool = (sys as any).pool
    expect(pool.every((e: any) => !e.active)).toBe(true)
  })

  it('clear 后 vis 为空', () => {
    sys.push('msg', 'info')
    sys.clear()
    expect((sys as any).vis).toHaveLength(0)
  })

  it('clear 后 hist 为空', () => {
    sys.push('msg', 'info')
    sys.clear()
    expect((sys as any).hist).toHaveLength(0)
  })

  it('clear 重置 histScroll 为 0', () => {
    ;(sys as any).histScroll = 50
    sys.clear()
    expect((sys as any).histScroll).toBe(0)
  })

  it('未 push 时 clear 不抛出', () => {
    expect(() => sys.clear()).not.toThrow()
  })

  it('clear 后 push 仍可正常工作', () => {
    sys.push('before', 'info')
    sys.clear()
    expect(() => sys.push('after', 'success')).not.toThrow()
    expect((sys as any).vis).toHaveLength(1)
  })
})

describe('NotificationCenterSystem — render() 调用安全性', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无通知时 render 不抛出', () => {
    const ctx = makeCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('有通知时 render 不抛出', () => {
    const ctx = makeCtx()
    sys.push('hello', 'info')
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('histOpen 时 render 不抛出', () => {
    const ctx = makeCtx()
    sys.push('msg', 'warning')
    sys.toggleHistory()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('有通知时 render 调用 fillRect', () => {
    const ctx = makeCtx()
    sys.push('hello', 'info')
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('histOpen 时 render 调用 fillText（标题）', () => {
    const ctx = makeCtx()
    sys.toggleHistory()
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('多次 render 不抛出', () => {
    const ctx = makeCtx()
    sys.push('a', 'info')
    expect(() => {
      sys.render(ctx, 800, 600)
      sys.render(ctx, 800, 600)
      sys.render(ctx, 800, 600)
    }).not.toThrow()
  })
})

describe('NotificationCenterSystem — rmIdx 私有辅助', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('rmIdx 移除存在的值', () => {
    const arr = [1, 2, 3]
    ;(sys as any).rmIdx(arr, 2)
    expect(arr).not.toContain(2)
  })

  it('rmIdx 移除不存在的值时不抛出', () => {
    const arr = [1, 2, 3]
    expect(() => (sys as any).rmIdx(arr, 99)).not.toThrow()
  })

  it('rmIdx 移除后数组长度减 1', () => {
    const arr = [0, 1, 2]
    ;(sys as any).rmIdx(arr, 1)
    expect(arr).toHaveLength(2)
  })

  it('rmIdx 移除第一个元素', () => {
    const arr = [0, 1, 2]
    ;(sys as any).rmIdx(arr, 0)
    expect(arr[0]).toBe(1)
  })
})

describe('NotificationCenterSystem — 综合场景', () => {
  let sys: NotificationCenterSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('push → update → clear 循环不崩溃', () => {
    sys.push('a', 'info')
    sys.update(0)
    sys.clear()
    sys.push('b', 'danger')
    expect((sys as any).vis).toHaveLength(1)
  })

  it('push 5 条 vis 满后第 6 条最旧的被踢出 vis', () => {
    for (let i = 0; i < 6; i++) sys.push(`msg${i}`, 'info')
    expect((sys as any).vis.length).toBe(MAX_VISIBLE)
  })

  it('push 后 hist 按最新在前排列', () => {
    sys.push('first', 'info')
    sys.push('second', 'warning')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].message).toBe('second')
  })

  it('toggleHistory 两次后 histScroll 为 0', () => {
    sys.toggleHistory()
    ;(sys as any).histScroll = 80
    sys.toggleHistory()
    expect((sys as any).histScroll).toBe(0)
  })

  it('大量 push 后系统状态稳定', () => {
    for (let i = 0; i < 100; i++) sys.push(`msg${i}`, 'info')
    expect((sys as any).vis.length).toBeLessThanOrEqual(MAX_VISIBLE)
    expect((sys as any).hist.length).toBeLessThanOrEqual(MAX_HISTORY)
  })

  it('push warning 类型正确存储', () => {
    sys.push('beware', 'warning')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].category).toBe('warning')
  })

  it('push success 类型正确存储', () => {
    sys.push('done', 'success')
    const idx = (sys as any).hist[0]
    expect((sys as any).pool[idx].category).toBe('success')
  })

  it('update 后再 render 不崩溃', () => {
    const ctx = makeCtx()
    sys.push('hello', 'info')
    sys.update(0)
    sys.update(50)
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})
