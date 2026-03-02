import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomacyVisualSystem, DiplomacyEvent, CivRelationData } from '../systems/DiplomacyVisualSystem'

function makeSys() { return new DiplomacyVisualSystem() }

function makeCiv(id: number, name: string, color: string, cx = 10, cy = 10): CivRelationData {
  return { id, name, color, capitalX: cx, capitalY: cy, relations: new Map() }
}

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    setLineDash: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D
}

describe('DiplomacyVisualSystem', () => {
  let sys: DiplomacyVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ────────────────────────────────────────
  describe('初始状态', () => {
    it('初始civs为空', () => { expect((sys as any).civs).toHaveLength(0) })
    it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
    it('isVisible 初始返回false（面板初始关闭）', () => { expect(sys.isVisible()).toBe(false) })
    it('初始panelVisible为false', () => { expect((sys as any).panelVisible).toBe(false) })
    it('初始bubbles为空数组', () => { expect((sys as any).bubbles).toHaveLength(0) })
    it('初始hoveredCivId为null', () => { expect((sys as any).hoveredCivId).toBeNull() })
    it('初始_civById为空Map', () => { expect((sys as any)._civById.size).toBe(0) })
    it('初始_civColorAlpha为空Map', () => { expect((sys as any)._civColorAlpha.size).toBe(0) })
    it('初始_lastZoom为-1', () => { expect((sys as any)._lastZoom).toBe(-1) })
  })

  // ── updateCivData ────────────────────────────────────
  describe('updateCivData - 文明数据更新', () => {
    it('updateCivData后civs被设置', () => {
      const civs = [makeCiv(1, 'A', '#ff0000')]
      sys.updateCivData(civs)
      expect((sys as any).civs).toBe(civs)
    })
    it('updateCivData填充_civById Map', () => {
      sys.updateCivData([makeCiv(1, 'A', '#ff0000'), makeCiv(2, 'B', '#00ff00')])
      expect((sys as any)._civById.size).toBe(2)
    })
    it('_civById可以通过id查找', () => {
      const civ = makeCiv(42, 'Test', '#aabbcc')
      sys.updateCivData([civ])
      expect((sys as any)._civById.get(42)).toBe(civ)
    })
    it('updateCivData填充_civColorAlpha Map', () => {
      sys.updateCivData([makeCiv(1, 'A', '#ff0000')])
      expect((sys as any)._civColorAlpha.size).toBe(1)
    })
    it('_civColorAlpha值为color+"33"', () => {
      sys.updateCivData([makeCiv(1, 'A', '#ff0000')])
      expect((sys as any)._civColorAlpha.get(1)).toBe('#ff000033')
    })
    it('updateCivData重新调用时清空旧数据', () => {
      sys.updateCivData([makeCiv(1, 'A', '#ff0000')])
      sys.updateCivData([makeCiv(2, 'B', '#00ff00')])
      expect((sys as any)._civById.has(1)).toBe(false)
      expect((sys as any)._civById.has(2)).toBe(true)
    })
    it('updateCivData空数组时Maps为空', () => {
      sys.updateCivData([makeCiv(1, 'A', '#f00')])
      sys.updateCivData([])
      expect((sys as any)._civById.size).toBe(0)
      expect((sys as any)._civColorAlpha.size).toBe(0)
    })
  })

  // ── addEvent ────────────────────────────────────────
  describe('addEvent - 外交事件气泡', () => {
    it('addEvent后bubbles数组增加', () => {
      sys.addEvent({ type: 'war', civA: 'civ1', civB: 'civ2', x: 10, y: 20 })
      expect((sys as any).bubbles.length).toBeGreaterThan(0)
    })
    it('war事件气泡text包含宣战字样', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      const bubble = (sys as any).bubbles[0]
      expect(bubble.text).toContain('战')
    })
    it('war事件气泡颜色为红色系', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      expect((sys as any).bubbles[0].color).toMatch(/^#e7/)
    })
    it('peace事件气泡存在', () => {
      sys.addEvent({ type: 'peace', civA: 'a', civB: 'b', x: 5, y: 5 })
      expect((sys as any).bubbles.length).toBe(1)
    })
    it('alliance事件气泡存在', () => {
      sys.addEvent({ type: 'alliance', civA: 'a', civB: 'b', x: 0, y: 0 })
      expect((sys as any).bubbles.length).toBe(1)
    })
    it('trade事件气泡存在', () => {
      sys.addEvent({ type: 'trade', civA: 'a', civB: 'b', x: 0, y: 0 })
      expect((sys as any).bubbles.length).toBe(1)
    })
    it('气泡startTick初始为-1', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      expect((sys as any).bubbles[0].startTick).toBe(-1)
    })
    it('气泡坐标被正确记录', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 42, y: 99 })
      expect((sys as any).bubbles[0].x).toBe(42)
      expect((sys as any).bubbles[0].y).toBe(99)
    })
    it('超过MAX_BUBBLES(10)时最旧气泡被移除', () => {
      for (let i = 0; i < 11; i++) {
        sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: i, y: 0 })
      }
      expect((sys as any).bubbles.length).toBe(10)
    })
    it('添加10个气泡时数量恰好为10', () => {
      for (let i = 0; i < 10; i++) {
        sys.addEvent({ type: 'peace', civA: 'a', civB: 'b', x: 0, y: 0 })
      }
      expect((sys as any).bubbles.length).toBe(10)
    })
  })

  // ── toggle / isVisible ──────────────────────────────
  describe('toggle / isVisible - 面板开关', () => {
    it('toggle后isVisible变为true', () => {
      sys.toggle()
      expect(sys.isVisible()).toBe(true)
    })
    it('连续两次toggle恢复false', () => {
      sys.toggle()
      sys.toggle()
      expect(sys.isVisible()).toBe(false)
    })
    it('三次toggle后为true', () => {
      sys.toggle()
      sys.toggle()
      sys.toggle()
      expect(sys.isVisible()).toBe(true)
    })
    it('toggle修改panelVisible而非visible', () => {
      sys.toggle()
      expect((sys as any).visible).toBe(true)
      expect((sys as any).panelVisible).toBe(true)
    })
  })

  // ── update - 气泡生命周期 ────────────────────────────
  describe('update - 气泡生命周期', () => {
    it('update时startTick<0的气泡被初始化', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      sys.update(100)
      expect((sys as any).bubbles[0].startTick).toBe(100)
    })
    it('存活未到期的气泡保留', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      sys.update(0)
      sys.update(50)
      expect((sys as any).bubbles.length).toBe(1)
    })
    it('到期气泡(BUBBLE_DURATION=120 tick)被移除', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      sys.update(0)
      sys.update(120)
      expect((sys as any).bubbles.length).toBe(0)
    })
    it('多个气泡混合到期', () => {
      sys.addEvent({ type: 'war', civA: 'a', civB: 'b', x: 0, y: 0 })
      sys.update(0)
      sys.addEvent({ type: 'peace', civA: 'a', civB: 'b', x: 0, y: 0 })
      sys.update(50)
      sys.update(120)
      expect((sys as any).bubbles.length).toBe(1)
    })
    it('update不影响civs数据', () => {
      const civs = [makeCiv(1, 'A', '#f00')]
      sys.updateCivData(civs)
      sys.update(100)
      expect((sys as any).civs).toHaveLength(1)
    })
  })

  // ── getLineStyle ────────────────────────────────────
  describe('getLineStyle - 关系线样式', () => {
    it('val>=80 返回同盟样式(绿色实线)', () => {
      const style = (sys as any).getLineStyle(80)
      expect(style.color).toBe('#2ecc71')
      expect(style.dash).toHaveLength(0)
    })
    it('val=100 返回同盟样式', () => {
      const style = (sys as any).getLineStyle(100)
      expect(style.color).toBe('#2ecc71')
    })
    it('val=50 返回友好样式(淡绿虚线)', () => {
      const style = (sys as any).getLineStyle(50)
      expect(style.color).toBe('#a8e6a3')
    })
    it('val=0 返回中立样式(灰色)', () => {
      const style = (sys as any).getLineStyle(0)
      expect(style.color).toBe('#888')
    })
    it('val=-50 返回敌视样式(橙色)', () => {
      const style = (sys as any).getLineStyle(-50)
      expect(style.color).toBe('#e67e22')
    })
    it('val=-80 返回敌视样式(>=−80 是 hostile)', () => {
      const style = (sys as any).getLineStyle(-80)
      expect(style.color).toBe('#e67e22')
    })
    it('val=-81 返回战争样式(红色实线)', () => {
      const style = (sys as any).getLineStyle(-81)
      expect(style.color).toBe('#e74c3c')
      expect(style.dash).toHaveLength(0)
    })
    it('val=-100 返回战争样式', () => {
      const style = (sys as any).getLineStyle(-100)
      expect(style.color).toBe('#e74c3c')
    })
    it('同盟样式lineWidth为2.5', () => {
      expect((sys as any).getLineStyle(80).width).toBe(2.5)
    })
    it('战争样式lineWidth为3', () => {
      expect((sys as any).getLineStyle(-100).width).toBe(3)
    })
  })

  // ── render / renderPanel ────────────────────────────
  describe('render / renderPanel - 渲染入口', () => {
    it('visible=true但civs少于2时render不调用save', () => {
      const ctx = makeCtx()
      sys.updateCivData([makeCiv(1, 'A', '#f00')])
      sys.render(ctx, 0, 0, 1)
      expect(ctx.save).not.toHaveBeenCalled()
    })
    it('2个civs时render调用save', () => {
      const ctx = makeCtx()
      const civ1 = makeCiv(1, 'A', '#f00', 0, 0)
      const civ2 = makeCiv(2, 'B', '#0f0', 10, 10)
      sys.updateCivData([civ1, civ2])
      sys.render(ctx, 0, 0, 1)
      expect(ctx.save).toHaveBeenCalled()
    })
    it('panelVisible=false时renderPanel不调用fillRect', () => {
      const ctx = makeCtx()
      sys.updateCivData([makeCiv(1, 'A', '#f00')])
      sys.renderPanel(ctx, 800, 600)
      expect(ctx.fillRect).not.toHaveBeenCalled()
    })
    it('toggle后renderPanel调用fillRect', () => {
      const ctx = makeCtx()
      sys.updateCivData([makeCiv(1, 'A', '#f00', 5, 5)])
      sys.toggle()
      sys.renderPanel(ctx, 800, 600)
      expect(ctx.fillRect).toHaveBeenCalled()
    })
    it('civs为空时renderPanel不渲染', () => {
      const ctx = makeCtx()
      sys.toggle()
      sys.renderPanel(ctx, 800, 600)
      expect(ctx.fillRect).not.toHaveBeenCalled()
    })
  })
})
