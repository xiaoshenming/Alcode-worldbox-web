import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DayNightRenderer } from '../systems/DayNightRenderer'

// jsdom 环境不提供 OffscreenCanvas，需要 mock
class MockOffscreenCanvas {
  width: number; height: number
  constructor(w: number, h: number) { this.width = w; this.height = h }
  getContext() {
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    }
  }
}

// 注入全局 mock（仅测试文件有效）
;(globalThis as any).OffscreenCanvas = MockOffscreenCanvas

function makeSys() { return new DayNightRenderer() }

function makeCtx() {
  return {
    globalCompositeOperation: 'source-over' as string,
    fillStyle: '' as string,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('DayNightRenderer', () => {
  let sys: DayNightRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 实例化与初始状态 ─────────────────────────────────
  describe('实例化与初始状态', () => {
    it('可以实例化', () => { expect(sys).toBeDefined() })
    it('初始cachedIsDay为true', () => { expect((sys as any).cachedIsDay).toBe(true) })
    it('初始cachedCycle为-1（强制重绘）', () => { expect((sys as any).cachedCycle).toBe(-1) })
    it('初始offscreen为null（懒加载）', () => { expect((sys as any).offscreen).toBeNull() })
    it('初��offCtx为null', () => { expect((sys as any).offCtx).toBeNull() })
    it('初始cachedWidth为0', () => { expect((sys as any).cachedWidth).toBe(0) })
    it('初始cachedHeight为0', () => { expect((sys as any).cachedHeight).toBe(0) })
    it('_overlay 对象存在且有r/g/b/a字段', () => {
      const overlay = (sys as any)._overlay
      expect(overlay).toHaveProperty('r')
      expect(overlay).toHaveProperty('g')
      expect(overlay).toHaveProperty('b')
      expect(overlay).toHaveProperty('a')
    })
    it('_overlay 初始r为0', () => { expect((sys as any)._overlay.r).toBe(0) })
    it('_overlay 初始g为0', () => { expect((sys as any)._overlay.g).toBe(0) })
    it('_overlay 初始b为0', () => { expect((sys as any)._overlay.b).toBe(0) })
    it('_overlay 初始a为0', () => { expect((sys as any)._overlay.a).toBe(0) })
  })

  // ── computeOverlay 白天区间 ──────────────────────────
  describe('computeOverlay - 白天区间', () => {
    it('白天正午(cycle=0.5)叠加alpha为0', () => {
      const o = (sys as any).computeOverlay(0.5, true)
      expect(o.a).toBe(0)
    })
    it('白天正午颜色r=g=b=0', () => {
      const o = (sys as any).computeOverlay(0.5, true)
      expect(o.r).toBe(0)
      expect(o.g).toBe(0)
      expect(o.b).toBe(0)
    })
    it('白天(cycle=0.4)无叠加', () => {
      const o = (sys as any).computeOverlay(0.4, true)
      expect(o.a).toBe(0)
    })
    it('黎明起始(cycle=0.2)有橙色叠加', () => {
      const o = (sys as any).computeOverlay(0.2, true)
      expect(o.r).toBe(255)
      expect(o.g).toBe(180)
      expect(o.b).toBe(80)
      expect(o.a).toBeGreaterThan(0)
    })
    it('黎明结束(cycle=0.299)alpha接近0', () => {
      const o = (sys as any).computeOverlay(0.299, true)
      expect(o.a).toBeLessThan(0.02)
    })
    it('黎明中点(cycle=0.25)alpha约为0.1', () => {
      const o = (sys as any).computeOverlay(0.25, true)
      expect(o.a).toBeCloseTo(0.1, 1)
    })
    it('黄昏起始(cycle=0.7)有橙色叠加', () => {
      const o = (sys as any).computeOverlay(0.7, true)
      expect(o.r).toBe(255)
      expect(o.g).toBe(160)
      expect(o.b).toBe(60)
      expect(o.a).toBeCloseTo(0.1, 5)
    })
    it('黄昏结束(cycle=0.799)alpha接近0.2', () => {
      const o = (sys as any).computeOverlay(0.799, true)
      expect(o.a).toBeCloseTo(0.2, 1)
    })
    it('黄昏中点(cycle=0.75)alpha约为0.15', () => {
      const o = (sys as any).computeOverlay(0.75, true)
      expect(o.a).toBeCloseTo(0.15, 2)
    })
    it('白天cycle=0.0无叠加（午夜前）', () => {
      const o = (sys as any).computeOverlay(0.0, true)
      expect(o.a).toBe(0)
    })
    it('白天cycle=0.1无叠加', () => {
      const o = (sys as any).computeOverlay(0.1, true)
      expect(o.a).toBe(0)
    })
    it('白天cycle=0.9无叠加', () => {
      const o = (sys as any).computeOverlay(0.9, true)
      expect(o.a).toBe(0)
    })
  })

  // ── computeOverlay 夜晚区间 ──────────────────────────
  describe('computeOverlay - 夜晚区间', () => {
    it('夜晚颜色为深蓝(r=10,g=15,b=50)', () => {
      const o = (sys as any).computeOverlay(0.0, false)
      expect(o.r).toBe(10)
      expect(o.g).toBe(15)
      expect(o.b).toBe(50)
    })
    it('午夜(cycle=0)alpha最大', () => {
      const o0 = (sys as any).computeOverlay(0.0, false)
      const o5 = (sys as any).computeOverlay(0.5, false)
      expect(o0.a).toBeGreaterThanOrEqual(o5.a)
    })
    it('午夜alpha约为0.5', () => {
      const o = (sys as any).computeOverlay(0.0, false)
      expect(o.a).toBeCloseTo(0.5, 1)
    })
    it('夜晚cycle=0.5 alpha为0.3（最小值）', () => {
      const o = (sys as any).computeOverlay(0.5, false)
      expect(o.a).toBeCloseTo(0.3, 5)
    })
    it('夜晚alpha始终不超过0.5', () => {
      for (const c of [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
        const o = (sys as any).computeOverlay(c, false)
        expect(o.a).toBeLessThanOrEqual(0.5)
      }
    })
    it('夜晚alpha始终不小于0.3', () => {
      for (const c of [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
        const o = (sys as any).computeOverlay(c, false)
        expect(o.a).toBeGreaterThanOrEqual(0.3)
      }
    })
    it('夜晚cycle=1.0与cycle=0.0一致（周期对称）', () => {
      const o0 = (sys as any).computeOverlay(0.0, false)
      const o1 = (sys as any).computeOverlay(1.0, false)
      expect(o0.a).toBeCloseTo(o1.a, 5)
    })
    it('computeOverlay 返回同一个_overlay引用', () => {
      const overlay = (sys as any)._overlay
      const result = (sys as any).computeOverlay(0.5, false)
      expect(result).toBe(overlay)
    })
    it('夜晚cycle=0.25 alpha介于0.3和0.5之间', () => {
      const o = (sys as any).computeOverlay(0.25, false)
      expect(o.a).toBeGreaterThanOrEqual(0.3)
      expect(o.a).toBeLessThanOrEqual(0.5)
    })
  })

  // ── ensureOffscreen ──────────────────────────────────
  describe('ensureOffscreen - 离屏画布管理', () => {
    it('调用后offscreen不为null', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      expect((sys as any).offscreen).not.toBeNull()
    })
    it('调用后cachedWidth被记录', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      expect((sys as any).cachedWidth).toBe(800)
    })
    it('调用后cachedHeight被记录', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      expect((sys as any).cachedHeight).toBe(600)
    })
    it('尺寸不变时不重建offscreen', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      const first = (sys as any).offscreen
      ;(sys as any).ensureOffscreen(800, 600)
      expect((sys as any).offscreen).toBe(first)
    })
    it('宽度变化时重建offscreen', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      const first = (sys as any).offscreen
      ;(sys as any).ensureOffscreen(1024, 600)
      expect((sys as any).offscreen).not.toBe(first)
    })
    it('高度变化时重建offscreen', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      const first = (sys as any).offscreen
      ;(sys as any).ensureOffscreen(800, 768)
      expect((sys as any).offscreen).not.toBe(first)
    })
    it('尺寸变化时cachedCycle重置为-1', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      ;(sys as any).cachedCycle = 0.5
      ;(sys as any).ensureOffscreen(1024, 600)
      expect((sys as any).cachedCycle).toBe(-1)
    })
    it('尺寸不变时cachedCycle保持不变', () => {
      ;(sys as any).ensureOffscreen(800, 600)
      ;(sys as any).cachedCycle = 0.5
      ;(sys as any).ensureOffscreen(800, 600)
      expect((sys as any).cachedCycle).toBe(0.5)
    })
    it('创建后offscreen为MockOffscreenCanvas实例', () => {
      ;(sys as any).ensureOffscreen(400, 300)
      expect((sys as any).offscreen).toBeInstanceOf(MockOffscreenCanvas)
    })
    it('不同尺寸建立后宽高正确', () => {
      ;(sys as any).ensureOffscreen(1920, 1080)
      expect((sys as any).cachedWidth).toBe(1920)
      expect((sys as any).cachedHeight).toBe(1080)
    })
  })

  // ── render 行为 ──────────────────────────────────────
  describe('render - 主渲染逻辑', () => {
    it('白天正午overlay.a=0时不调用drawImage', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.5, true)
      expect(ctx.drawImage).not.toHaveBeenCalled()
    })
    it('白天正午不调用fillRect', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.5, true)
      expect(ctx.fillRect).not.toHaveBeenCalled()
    })
    it('黎明区间render时调用drawImage', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.2, true)
      expect(ctx.drawImage).toHaveBeenCalled()
    })
    it('夜晚render时调用drawImage', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.0, false)
      expect(ctx.drawImage).toHaveBeenCalled()
    })
    it('夜晚render后cachedIsDay被更新为false', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.0, false)
      expect((sys as any).cachedIsDay).toBe(false)
    })
    it('夜晚render后cachedCycle被更新', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.3, false)
      expect((sys as any).cachedCycle).toBe(0.3)
    })
    it('render恢复globalCompositeOperation为source-over', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.0, false)
      expect(ctx.globalCompositeOperation).toBe('source-over')
    })
    it('cycle变化超过阈值时强制重绘', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.0, false)
      const drawCount1 = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
      sys.render(ctx, 800, 600, 0.5, false)
      const drawCount2 = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
      expect(drawCount2).toBeGreaterThan(drawCount1)
    })
    it('isDay从false变true时触发重绘', () => {
      const ctx = makeCtx()
      // 先渲染夜晚黎明区间（有叠加）
      sys.render(ctx, 800, 600, 0.2, true)
      const before = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
      // 再用不同isDay，同样cycle
      sys.render(ctx, 800, 600, 0.2, false)
      expect((ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before)
    })
    it('cycle微小变化(<=阈值)时不重绘offscreen但仍drawImage', () => {
      const ctx = makeCtx()
      sys.render(ctx, 800, 600, 0.0, false)
      const count1 = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
      // 变化0.001 <= CYCLE_REDRAW_THRESHOLD(0.005)，不触发offscreen重绘，但仍调用drawImage
      sys.render(ctx, 800, 600, 0.001, false)
      // drawImage 依然被调用（每次render有alpha>0都调用）
      expect((ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.length).toBe(count1 + 1)
    })
  })
})
