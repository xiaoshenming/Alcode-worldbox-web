import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EditorEnhancedSystem } from '../systems/EditorEnhancedSystem'

function makeSys() { return new EditorEnhancedSystem() }

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '' as string,
    lineWidth: 0 as number,
  } as unknown as CanvasRenderingContext2D
}

describe('EditorEnhancedSystem', () => {
  let sys: EditorEnhancedSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ─────────────────────────────────────────
  describe('初始状态', () => {
    it('可以实例化', () => { expect(sys).toBeDefined() })
    it('getBrushSize返回正数', () => { expect(sys.getBrushSize()).toBeGreaterThan(0) })
    it('初始brushSize为3', () => { expect(sys.getBrushSize()).toBe(3) })
    it('初始gridVisible为false', () => { expect((sys as any).gridVisible).toBe(false) })
  })

  // ── setBrushSize ─────────────────────────────────────
  describe('setBrushSize - 画笔大小设置', () => {
    it('setBrushSize 可以设置画笔大小', () => {
      sys.setBrushSize(5)
      expect(sys.getBrushSize()).toBe(5)
    })
    it('setBrushSize 超出最大值时被 clamp 到 20', () => {
      sys.setBrushSize(100)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('setBrushSize 低于最小值���被 clamp 到 1', () => {
      sys.setBrushSize(0)
      expect(sys.getBrushSize()).toBe(1)
    })
    it('setBrushSize(-5) 被 clamp 到 1', () => {
      sys.setBrushSize(-5)
      expect(sys.getBrushSize()).toBe(1)
    })
    it('setBrushSize(1) 正好等于最小值', () => {
      sys.setBrushSize(1)
      expect(sys.getBrushSize()).toBe(1)
    })
    it('setBrushSize(20) 正好等于最大值', () => {
      sys.setBrushSize(20)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('setBrushSize(21) 被 clamp 到 20', () => {
      sys.setBrushSize(21)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('setBrushSize(10) 正常设置', () => {
      sys.setBrushSize(10)
      expect(sys.getBrushSize()).toBe(10)
    })
    it('setBrushSize(1.5) 被 round 为 2', () => {
      sys.setBrushSize(1.5)
      expect(sys.getBrushSize()).toBe(2)
    })
    it('setBrushSize(1.4) 被 round 为 1', () => {
      sys.setBrushSize(1.4)
      expect(sys.getBrushSize()).toBe(1)
    })
    it('setBrushSize(19.9) 被 round 为 20', () => {
      sys.setBrushSize(19.9)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('setBrushSize(7) 连续调用最终为7', () => {
      sys.setBrushSize(3)
      sys.setBrushSize(7)
      expect(sys.getBrushSize()).toBe(7)
    })
    it('setBrushSize大值后可以重新设置小值', () => {
      sys.setBrushSize(20)
      sys.setBrushSize(5)
      expect(sys.getBrushSize()).toBe(5)
    })
    it('setBrushSize(Infinity)被clamp到20', () => {
      sys.setBrushSize(Infinity)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('setBrushSize(-Infinity)被clamp到1', () => {
      sys.setBrushSize(-Infinity)
      expect(sys.getBrushSize()).toBe(1)
    })
  })

  // ── adjustBrushSize ─────────────────────────────────
  describe('adjustBrushSize - 相对调节画笔大小', () => {
    it('adjustBrushSize 增加画笔大小', () => {
      const before = sys.getBrushSize()
      sys.adjustBrushSize(2)
      expect(sys.getBrushSize()).toBe(before + 2)
    })
    it('adjustBrushSize 减小画笔大小', () => {
      sys.setBrushSize(10)
      sys.adjustBrushSize(-3)
      expect(sys.getBrushSize()).toBe(7)
    })
    it('adjustBrushSize delta=0不变', () => {
      sys.setBrushSize(5)
      sys.adjustBrushSize(0)
      expect(sys.getBrushSize()).toBe(5)
    })
    it('adjustBrushSize 超出上限被 clamp 到 20', () => {
      sys.setBrushSize(18)
      sys.adjustBrushSize(10)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('adjustBrushSize 低于下限被 clamp 到 1', () => {
      sys.setBrushSize(3)
      sys.adjustBrushSize(-10)
      expect(sys.getBrushSize()).toBe(1)
    })
    it('adjustBrushSize(1)从3变为4', () => {
      sys.setBrushSize(3)
      sys.adjustBrushSize(1)
      expect(sys.getBrushSize()).toBe(4)
    })
    it('adjustBrushSize(-1)从3变为2', () => {
      sys.setBrushSize(3)
      sys.adjustBrushSize(-1)
      expect(sys.getBrushSize()).toBe(2)
    })
    it('连续adjustBrushSize累积正确', () => {
      sys.setBrushSize(3)
      sys.adjustBrushSize(2)
      sys.adjustBrushSize(3)
      expect(sys.getBrushSize()).toBe(8)
    })
    it('adjustBrushSize小数delta被round', () => {
      sys.setBrushSize(3)
      sys.adjustBrushSize(1.5)
      expect(sys.getBrushSize()).toBe(5)
    })
  })

  // ── renderGrid ───────────────────────────────────────
  describe('renderGrid - 网格渲染', () => {
    it('gridVisible=false时不调用save', () => {
      const ctx = makeCtx()
      sys.renderGrid(ctx, 0, 0, 16, 0, 0, 10, 10)
      expect(ctx.save).not.toHaveBeenCalled()
    })
    it('zoom小于GRID_MIN_ZOOM(8)时不调用save', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 4, 0, 0, 10, 10)
      expect(ctx.save).not.toHaveBeenCalled()
    })
    it('gridVisible=true且zoom>=8时调用save', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 8, 0, 0, 5, 5)
      expect(ctx.save).toHaveBeenCalled()
    })
    it('gridVisible=true且zoom>=8时调用restore', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 0, 0, 5, 5)
      expect(ctx.restore).toHaveBeenCalled()
    })
    it('gridVisible=true且zoom>=8时调用stroke', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 0, 0, 3, 3)
      expect(ctx.stroke).toHaveBeenCalled()
    })
    it('zoom=7时不渲染（低于阈值）', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 7, 0, 0, 10, 10)
      expect(ctx.save).not.toHaveBeenCalled()
    })
    it('zoom=9时渲染', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 9, 0, 0, 3, 3)
      expect(ctx.save).toHaveBeenCalled()
    })
    it('gridVisible=false且zoom=20时不渲染', () => {
      const ctx = makeCtx()
      sys.renderGrid(ctx, 0, 0, 20, 0, 0, 10, 10)
      expect(ctx.save).not.toHaveBeenCalled()
    })
    it('渲染时调用beginPath', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 0, 0, 3, 3)
      expect(ctx.beginPath).toHaveBeenCalled()
    })
    it('渲染时调用moveTo（垂直线）', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 0, 0, 2, 2)
      expect(ctx.moveTo).toHaveBeenCalled()
    })
    it('渲染时调用lineTo', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 0, 0, 2, 2)
      expect(ctx.lineTo).toHaveBeenCalled()
    })
    it('startX=endX时只绘制一条垂直线', () => {
      const ctx = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx, 0, 0, 10, 5, 5, 5, 8)
      // 1垂直线 + (endY-startY+1)水平线
      const moveCount = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls.length
      expect(moveCount).toBe(1 + (8 - 5 + 1))
    })
    it('camX/camY偏移不影响调用次数', () => {
      const ctx1 = makeCtx()
      const ctx2 = makeCtx()
      ;(sys as any).gridVisible = true
      sys.renderGrid(ctx1, 0, 0, 10, 0, 0, 3, 3)
      sys.renderGrid(ctx2, 100, 100, 10, 0, 0, 3, 3)
      const moves1 = (ctx1.moveTo as ReturnType<typeof vi.fn>).mock.calls.length
      const moves2 = (ctx2.moveTo as ReturnType<typeof vi.fn>).mock.calls.length
      expect(moves1).toBe(moves2)
    })
  })

  // ── brushSize 边界综合测试 ───────────────────────────
  describe('brushSize 边界综合测试', () => {
    it('设置极大值后adjustBrushSize负数恢复正常', () => {
      sys.setBrushSize(999)
      sys.adjustBrushSize(-15)
      expect(sys.getBrushSize()).toBe(5)
    })
    it('设置极小值后adjustBrushSize正数恢复正常', () => {
      sys.setBrushSize(-999)
      sys.adjustBrushSize(8)
      expect(sys.getBrushSize()).toBe(9)
    })
    it('连续clamp不改变已clamp的值', () => {
      sys.setBrushSize(20)
      sys.setBrushSize(25)
      expect(sys.getBrushSize()).toBe(20)
    })
    it('getBrushSize始终在[1,20]范围内', () => {
      for (const v of [-100, 0, 1, 10, 20, 21, 100]) {
        sys.setBrushSize(v)
        const b = sys.getBrushSize()
        expect(b).toBeGreaterThanOrEqual(1)
        expect(b).toBeLessThanOrEqual(20)
      }
    })
  })
})
