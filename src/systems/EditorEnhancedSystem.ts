/**
 * EditorEnhancedSystem - 世界编辑器增强系统
 * 提供画笔大小调节、网格显示
 */

export type EditAction = {
  type: 'terrain' | 'spawn' | 'disaster'
  tiles: Array<{ x: number; y: number; oldValue: number; newValue: number }>
  tick: number
}

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 20;
const GRID_MIN_ZOOM = 8;

export class EditorEnhancedSystem {
  // 画笔状态
  private brushSize: number = 3;

  // 网格
  private gridVisible: boolean = false;

  // ─── 画笔 ───────────────────────────────────────────

  /** 设置画笔大小，钳制到 [1, 20] */
  setBrushSize(size: number): void {
    this.brushSize = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, Math.round(size)));
  }

  /** 获取当前画笔大小 */
  getBrushSize(): number {
    return this.brushSize;
  }

  /** 增减画笔大小 */
  adjustBrushSize(delta: number): void {
    this.setBrushSize(this.brushSize + delta);
  }

  // ─── 渲染：网格 ─────────────────────────────────────

  /**
   * 绘制 tile 网格线（仅 zoom > 8 时显示）
   */
  renderGrid(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    zoom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    if (!this.gridVisible || zoom < GRID_MIN_ZOOM) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // 垂直线
    for (let x = startX; x <= endX; x++) {
      const sx = (x - camX) * zoom;
      const syStart = (startY - camY) * zoom;
      const syEnd = (endY - camY) * zoom;
      ctx.moveTo(sx, syStart);
      ctx.lineTo(sx, syEnd);
    }

    // 水平线
    for (let y = startY; y <= endY; y++) {
      const sy = (y - camY) * zoom;
      const sxStart = (startX - camX) * zoom;
      const sxEnd = (endX - camX) * zoom;
      ctx.moveTo(sxStart, sy);
      ctx.lineTo(sxEnd, sy);
    }

    ctx.stroke();
    ctx.restore();
  }

}

