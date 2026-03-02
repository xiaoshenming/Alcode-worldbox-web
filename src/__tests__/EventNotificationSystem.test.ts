import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventNotificationSystem, EventPriority, EventCategory, GameEvent } from '../systems/EventNotificationSystem'

function makeSys() { return new EventNotificationSystem() }

function makeCtx() {
  return {
    save: vi.fn(), restore: vi.fn(),
    fillRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(),
    roundRect: vi.fn(), measureText: vi.fn().mockReturnValue({ width: 80 }),
    globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
    font: '', textBaseline: '',
  } as unknown as CanvasRenderingContext2D
}

describe('EventNotificationSystem - 初始状态', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('histCount 初始为 0', () => { expect((sys as any).histCount).toBe(0) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('histVisible 初始为 false', () => { expect((sys as any).histVisible).toBe(false) })
  it('histBuf 初始全为 null', () => { expect((sys as any).histBuf[0]).toBeNull() })
  it('histBuf 长度为 50', () => { expect((sys as any).histBuf.length).toBe(50) })
  it('flashAlpha 初始为 0', () => { expect((sys as any).flashAlpha).toBe(0) })
  it('activeMarquee 初始为 null', () => { expect((sys as any).activeMarquee).toBeNull() })
  it('marqueeQueue 初始为空数组', () => { expect((sys as any).marqueeQueue.length).toBe(0) })
  it('mqHead 初始为 0', () => { expect((sys as any).mqHead).toBe(0) })
  it('histHead 初始为 0', () => { expect((sys as any).histHead).toBe(0) })
  it('_indicatorCount 初始为 0', () => { expect((sys as any)._indicatorCount).toBe(0) })
  it('_indicatorPool 长度为 6', () => { expect((sys as any)._indicatorPool.length).toBe(6) })
  it('_candidatesBuf 初始为空数组', () => { expect((sys as any)._candidatesBuf.length).toBe(0) })
})

describe('EventNotificationSystem - pushEvent', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('pushEvent 增加 histCount', () => {
    sys.pushEvent('war', 'high', 'Battle!', 10, 20, 1)
    expect((sys as any).histCount).toBe(1)
  })

  it('pushEvent 递增 nextId', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    expect((sys as any).nextId).toBe(2)
  })

  it('pushEvent critical 设置 flashAlpha = 0.6', () => {
    sys.pushEvent('disaster', 'critical', 'Quake!', 0, 0, 1)
    expect((sys as any).flashAlpha).toBe(0.6)
  })

  it('pushEvent low 不设置 flashAlpha', () => {
    sys.pushEvent('build', 'low', 'Hut built', 0, 0, 1)
    expect((sys as any).flashAlpha).toBe(0)
  })

  it('pushEvent high 加入 marqueeQueue', () => {
    sys.pushEvent('war', 'high', 'Attack!', 0, 0, 1)
    expect((sys as any).marqueeQueue.length).toBe(1)
  })

  it('pushEvent low 不加入 marqueeQueue', () => {
    sys.pushEvent('build', 'low', 'Minor', 0, 0, 1)
    expect((sys as any).marqueeQueue.length).toBe(0)
  })

  it('pushEvent medium 加入 marqueeQueue', () => {
    sys.pushEvent('discovery', 'medium', 'Found something', 0, 0, 1)
    expect((sys as any).marqueeQueue.length).toBe(1)
  })

  it('pushEvent 生成正确 tickStr', () => {
    sys.pushEvent('war', 'high', 'test', 0, 0, 42)
    const evt: GameEvent = (sys as any).histBuf[0]
    expect(evt.tickStr).toBe('T42')
  })

  it('pushEvent 生成正确 iconMsg（war 图标）', () => {
    sys.pushEvent('war', 'high', 'Attack', 0, 0, 1)
    const evt: GameEvent = (sys as any).histBuf[0]
    expect(evt.iconMsg).toContain('Attack')
  })

  it('多次 pushEvent 增加 histCount', () => {
    for (let i = 0; i < 5; i++) sys.pushEvent('war', 'high', `e${i}`, 0, 0, i)
    expect((sys as any).histCount).toBe(5)
  })

  it('pushEvent 超过 HIST_CAP(50) 后 histCount 保持 50', () => {
    for (let i = 0; i < 60; i++) sys.pushEvent('war', 'high', `e${i}`, 0, 0, i)
    expect((sys as any).histCount).toBe(50)
  })

  it('pushEvent 事件有正确 category', () => {
    sys.pushEvent('diplomacy', 'medium', 'Peace treaty', 5, 5, 10)
    const evt: GameEvent = (sys as any).histBuf[0]
    expect(evt.category).toBe('diplomacy')
  })

  it('pushEvent 事件有正确 worldX/worldY', () => {
    sys.pushEvent('death', 'low', 'Died', 100, 200, 5)
    const evt: GameEvent = (sys as any).histBuf[0]
    expect(evt.worldX).toBe(100)
    expect(evt.worldY).toBe(200)
  })
})

describe('EventNotificationSystem - clear', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('clear 不崩溃', () => { expect(() => sys.clear()).not.toThrow() })

  it('clear 重置 histCount', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.clear()
    expect((sys as any).histCount).toBe(0)
  })

  it('clear 重置 histHead', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.clear()
    expect((sys as any).histHead).toBe(0)
  })

  it('clear 重置 flashAlpha', () => {
    sys.pushEvent('disaster', 'critical', 'Boom', 0, 0, 1)
    sys.clear()
    expect((sys as any).flashAlpha).toBe(0)
  })

  it('clear 重置 activeMarquee', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.update(1, 0, 0, 800, 600, 1)
    sys.clear()
    expect((sys as any).activeMarquee).toBeNull()
  })

  it('clear 重置 mqHead', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.clear()
    expect((sys as any).mqHead).toBe(0)
  })

  it('clear 后 histBuf 全为 null', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.clear()
    expect((sys as any).histBuf.every((v: unknown) => v === null)).toBe(true)
  })

  it('clear 后 _indicatorCount 为 0', () => {
    sys.clear()
    expect((sys as any)._indicatorCount).toBe(0)
  })
})

describe('EventNotificationSystem - toggleHistory', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('toggleHistory 切换 histVisible 为 true', () => {
    sys.toggleHistory()
    expect((sys as any).histVisible).toBe(true)
  })

  it('toggleHistory 再次切换回 false', () => {
    sys.toggleHistory()
    sys.toggleHistory()
    expect((sys as any).histVisible).toBe(false)
  })

  it('toggleHistory 3次后为 true', () => {
    sys.toggleHistory(); sys.toggleHistory(); sys.toggleHistory()
    expect((sys as any).histVisible).toBe(true)
  })
})

describe('EventNotificationSystem - update & marquee', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 不崩溃', () => {
    expect(() => sys.update(1, 0, 0, 800, 600, 1)).not.toThrow()
  })

  it('update 激活 marquee（有排队事件时）', () => {
    sys.pushEvent('war', 'high', 'Attack', 1000, 1000, 1)
    sys.update(1, 0, 0, 800, 600, 1)
    expect((sys as any).activeMarquee).not.toBeNull()
  })

  it('update 多次后 flashAlpha 递减', () => {
    sys.pushEvent('disaster', 'critical', 'Boom', 0, 0, 1)
    const initial = (sys as any).flashAlpha
    sys.update(1, 0, 0, 800, 600, 1)
    expect((sys as any).flashAlpha).toBeLessThan(initial)
  })

  it('flashAlpha 不低于 0', () => {
    sys.pushEvent('disaster', 'critical', 'Boom', 0, 0, 1)
    for (let i = 0; i < 100; i++) sys.update(i, 0, 0, 800, 600, 1)
    expect((sys as any).flashAlpha).toBeGreaterThanOrEqual(0)
  })

  it('marquee x 随 update 减少', () => {
    sys.pushEvent('war', 'high', 'A', 5000, 5000, 1)
    sys.update(1, 0, 0, 800, 600, 1)
    const x1 = (sys as any).activeMarquee?.x
    sys.update(2, 0, 0, 800, 600, 1)
    const x2 = (sys as any).activeMarquee?.x
    if (x1 !== undefined && x2 !== undefined) {
      expect(x2).toBeLessThan(x1)
    }
  })
})

describe('EventNotificationSystem - render', () => {
  let sys: EventNotificationSystem
  let ctx: CanvasRenderingContext2D

  beforeEach(() => { sys = makeSys(); ctx = makeCtx() })
  afterEach(() => { vi.restoreAllMocks() })

  it('render 不崩溃（空状态）', () => {
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render 有 flashAlpha 时调用 fillRect', () => {
    sys.pushEvent('disaster', 'critical', 'Boom', 0, 0, 1)
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('render histVisible=true 时调用 roundRect', () => {
    sys.pushEvent('war', 'high', 'A', 0, 0, 1)
    sys.toggleHistory()
    sys.render(ctx, 800, 600)
    expect((ctx as any).roundRect).toHaveBeenCalled()
  })

  it('render 有 marquee 时调用 fillText', () => {
    sys.pushEvent('war', 'high', 'Attack!', 5000, 5000, 1)
    sys.update(1, 0, 0, 800, 600, 1)
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('render 不崩溃（多事件后）', () => {
    for (let i = 0; i < 10; i++) sys.pushEvent('war', 'high', `e${i}`, 1000 * i, 1000 * i, i)
    sys.update(1, 0, 0, 800, 600, 1)
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})

describe('EventNotificationSystem - 各 category & priority 组合', () => {
  let sys: EventNotificationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  const categories: EventCategory[] = ['war', 'disaster', 'build', 'discovery', 'diplomacy', 'death']
  const priorities: EventPriority[] = ['critical', 'high', 'medium', 'low']

  categories.forEach(cat => {
    it(`pushEvent category=${cat} 不崩溃`, () => {
      expect(() => sys.pushEvent(cat, 'medium', 'test', 0, 0, 1)).not.toThrow()
    })
  })

  priorities.forEach(pri => {
    it(`pushEvent priority=${pri} 不崩溃`, () => {
      expect(() => sys.pushEvent('war', pri, 'test', 0, 0, 1)).not.toThrow()
    })
  })
})
